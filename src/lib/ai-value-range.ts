import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type ValueRangeAiParse = {
  ai_min_value: number | null;
  ai_max_value: number | null;
  ai_confidence: number;
  reasoning_summary: string;
};

export type ValueRangeInput = {
  title: string;
  description: string;
  category: string;
  condition: string;
  user_value: number;
  image_url?: string;
  location?: string;
};

function parseJsonFromModel(raw: string): unknown {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  t = t.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(t);
}

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") throw new Error("Expected JSON object");
  return v as Record<string, unknown>;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function expectNum(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Invalid number: ${field}`);
  }
  return v;
}

function expectStr(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`Invalid string: ${field}`);
  return v;
}

function parseValueRangePayload(raw: string): ValueRangeAiParse {
  const o = asRecord(parseJsonFromModel(raw));
  const minV = numOrNull(o.ai_min_value);
  const maxV = numOrNull(o.ai_max_value);
  const conf = expectNum(o.ai_confidence, "ai_confidence");
  const reasoning = expectStr(o.reasoning_summary, "reasoning_summary");
  return {
    ai_min_value: minV,
    ai_max_value: maxV,
    ai_confidence: Math.min(1, Math.max(0, conf)),
    reasoning_summary: reasoning,
  };
}

const JSON_INSTRUCTION = `Yalnızca geçerli JSON döndür (markdown yok). Şema:
{
  "ai_min_value": number | null,
  "ai_max_value": number | null,
  "ai_confidence": number,
  "reasoning_summary": string
}
Kurallar:
- Türkiye piyasası (TRY) için makul bir değer bandı tahmin et.
- Kullanıcının girdiği user_value alanını ASLA değiştirme veya JSON'a koyma.
- Belirsizsen ai_min_value ve ai_max_value null yap ve ai_confidence 0.35 gibi düşük ver.
- ai_confidence 0 ile 1 arası.
- reasoning_summary kısa Türkçe (1-3 cümle).`;

function buildPrompt(input: ValueRangeInput): string {
  return `Sen deneyimli bir ikinci el / takas piyasası değer tahmincisin. Sadece makul bir fiyat ARALIĞI öner; kullanıcının kendi biçtiği değeri yargılama (o ayrı hesaplanacak).

Ürün:
- başlık: ${input.title}
- açıklama: ${input.description}
- kategori: ${input.category}
- durum: ${input.condition}
- konum: ${input.location ?? "belirtilmedi"}
- kullanıcının girdiği değer (referans, gizli tutulacak): ${input.user_value} TRY

${JSON_INSTRUCTION}`;
}

function imagePartsFromDataUrl(
  imageUrl?: string
): { inlineData: { mimeType: string; data: string } }[] {
  const raw = imageUrl;
  if (!raw || typeof raw !== "string" || !raw.startsWith("data:")) return [];
  const comma = raw.indexOf("base64,");
  if (comma === -1) return [];
  const header = raw.slice(5, comma);
  const mimeMatch = /^([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1]?.trim() || "image/jpeg";
  const data = raw.slice(comma + 7);
  if (!data) return [];
  return [{ inlineData: { mimeType, data } }];
}

function getGoogleApiKey(): string {
  const k =
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "";
  if (!k) throw new Error("Missing GOOGLE_API_KEY or GEMINI_API_KEY");
  return k;
}

async function runGeminiRange(
  input: ValueRangeInput,
  model: string
): Promise<ValueRangeAiParse> {
  const ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });
  const prompt = buildPrompt(input);
  const imageParts = imagePartsFromDataUrl(input.image_url);
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] =
    [...imageParts, { text: prompt }];

  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });
  const text = res.text;
  if (!text) throw new Error("Empty model response");
  return parseValueRangePayload(text);
}

async function runOpenAiRange(
  input: ValueRangeInput,
  model: string
): Promise<ValueRangeAiParse> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: key });
  const imgNote =
    input.image_url?.startsWith("data:image/")
      ? "\n\nNot: Kullanıcı bir görsel yüklemiş; metinden ve kategoriden yola çıkarak muhafazakâr tahmin yap."
      : "";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: buildPrompt(input) + imgNote,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty OpenAI response");
  return parseValueRangePayload(text);
}

/** Single provider call: prefer Gemini when configured, else OpenAI. */
export async function estimateValueRange(input: ValueRangeInput): Promise<ValueRangeAiParse> {
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const openaiModel =
    process.env.OPENAI_AUDITOR_MODEL?.trim() || "gpt-4o-mini";

  const hasGoogle =
    Boolean(process.env.GOOGLE_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasOpenai = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (hasGoogle) {
    return runGeminiRange(input, geminiModel);
  }
  if (hasOpenai) {
    return runOpenAiRange(input, openaiModel);
  }
  throw new Error("No AI provider configured (GOOGLE_API_KEY or OPENAI_API_KEY)");
}
