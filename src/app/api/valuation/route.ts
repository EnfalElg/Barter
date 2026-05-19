import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValuationRequest {
  title: string;
  description: string;
  quantity: number;
  unit: string;
  image_url?: string;
  location?: string;
  /** @deprecated use image_url */
  image?: string;
}

export interface ResearchResult {
  market_type: "C2C" | "B2B" | "UNKNOWN";
  category: string;
  detected_unit: string;
  reference_price_min: number;
  reference_price_max: number;
  reference_currency: "TRY";
  price_basis: "per_item" | "per_kg" | "per_ton" | "per_lot" | "unknown";
  research_summary: string;
  search_queries: string[];
  sources: { title: string; url: string }[];
  confidence: number;
}

export interface AppraisalResult {
  estimated_price_try: number;
  unit_price_try: number | null;
  quantity: number;
  unit: string;
  condition_score: number;
  condition_notes: string;
  pricing_logic: string;
  risk_flags: string[];
  confidence: number;
}

export interface AuditResult {
  approved: boolean;
  final_price_try: number | null;
  reason: string;
  criticisms: string[];
  suggested_fix: string | null;
  confidence: number;
}

export interface ValuationResponse {
  status: "approved" | "needs_manual_review";
  final_price_try: number | null;
  attempts: number;
  research: ResearchResult | null;
  appraisal: AppraisalResult | null;
  audit: AuditResult | null;
  debug: {
    models: {
      researcher: string;
      appraiser: string;
      auditor: string;
    };
  };
}

type AuditorFeedback = {
  criticisms: string[];
  suggested_fix: string | null;
} | null;

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

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

function expectNum(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Invalid or missing number: ${field}`);
  }
  return v;
}

function expectStr(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`Invalid or missing string: ${field}`);
  return v;
}

function expectStrArr(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    throw new Error(`Invalid string array: ${field}`);
  }
  return v as string[];
}

function parseResearchResult(raw: string): ResearchResult {
  const o = asRecord(parseJsonFromModel(raw));
  const mt = expectStr(o.market_type, "market_type");
  if (mt !== "C2C" && mt !== "B2B" && mt !== "UNKNOWN") {
    throw new Error("market_type must be C2C | B2B | UNKNOWN");
  }
  const pb = expectStr(o.price_basis, "price_basis");
  if (!["per_item", "per_kg", "per_ton", "per_lot", "unknown"].includes(pb)) {
    throw new Error("invalid price_basis");
  }
  const rc = expectStr(o.reference_currency, "reference_currency");
  if (rc !== "TRY") throw new Error("reference_currency must be TRY");

  let sources: { title: string; url: string }[] = [];
  if (Array.isArray(o.sources)) {
    sources = o.sources.map((s, i) => {
      const r = asRecord(s);
      return {
        title: expectStr(r.title, `sources[${i}].title`),
        url: expectStr(r.url, `sources[${i}].url`),
      };
    });
  }

  return {
    market_type: mt as ResearchResult["market_type"],
    category: expectStr(o.category, "category"),
    detected_unit: expectStr(o.detected_unit, "detected_unit"),
    reference_price_min: expectNum(o.reference_price_min, "reference_price_min"),
    reference_price_max: expectNum(o.reference_price_max, "reference_price_max"),
    reference_currency: "TRY",
    price_basis: pb as ResearchResult["price_basis"],
    research_summary: expectStr(o.research_summary, "research_summary"),
    search_queries: expectStrArr(o.search_queries, "search_queries"),
    sources,
    confidence: expectNum(o.confidence, "confidence"),
  };
}

function parseAppraisalResult(raw: string): AppraisalResult {
  const o = asRecord(parseJsonFromModel(raw));
  const unitPrice = o.unit_price_try;
  return {
    estimated_price_try: expectNum(o.estimated_price_try, "estimated_price_try"),
    unit_price_try:
      unitPrice === null || unitPrice === undefined
        ? null
        : typeof unitPrice === "number" && Number.isFinite(unitPrice)
          ? unitPrice
          : null,
    quantity: expectNum(o.quantity, "quantity"),
    unit: expectStr(o.unit, "unit"),
    condition_score: expectNum(o.condition_score, "condition_score"),
    condition_notes: expectStr(o.condition_notes, "condition_notes"),
    pricing_logic: expectStr(o.pricing_logic, "pricing_logic"),
    risk_flags: expectStrArr(o.risk_flags, "risk_flags"),
    confidence: expectNum(o.confidence, "confidence"),
  };
}

function parseAuditResult(raw: string): AuditResult {
  const o = asRecord(parseJsonFromModel(raw));
  const fp = o.final_price_try;
  return {
    approved: Boolean(o.approved),
    final_price_try:
      fp === null || fp === undefined
        ? null
        : typeof fp === "number" && Number.isFinite(fp)
          ? fp
          : null,
    reason: expectStr(o.reason, "reason"),
    criticisms: expectStrArr(o.criticisms, "criticisms"),
    suggested_fix:
      o.suggested_fix === null || o.suggested_fix === undefined
        ? null
        : String(o.suggested_fix),
    confidence: expectNum(o.confidence, "confidence"),
  };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildResearchPrompt(
  input: ValuationRequest,
  feedback: AuditorFeedback,
  attempt: number
): string {
  const fbBlock =
    feedback && attempt > 1
      ? `
=== AUDITOR FEEDBACK (refine your research) ===
Criticisms:
${feedback.criticisms.map((c) => `- ${c}`).join("\n")}
Suggested fix: ${feedback.suggested_fix ?? "(none)"}
`
      : "";

  return `You are the Researcher agent for a Turkish barter marketplace (consumer C2C and industrial B2B bulk: steel, paper, plastic by ton/pallet, etc.).

Use Google Search grounding when helpful. Infer market type from title/description/units.

Product:
- title: ${input.title}
- description: ${input.description}
- quantity: ${input.quantity}
- unit: ${input.unit}
- location (if any): ${input.location ?? "not provided"}
${fbBlock}
Respond with ONLY valid JSON (no markdown fences). Shape:
{
  "market_type": "C2C" | "B2B" | "UNKNOWN",
  "category": string,
  "detected_unit": string,
  "reference_price_min": number,
  "reference_price_max": number,
  "reference_currency": "TRY",
  "price_basis": "per_item" | "per_kg" | "per_ton" | "per_lot" | "unknown",
  "research_summary": string,
  "search_queries": string[],
  "sources": { "title": string, "url": string }[],
  "confidence": number
}
reference_price_min/max: realistic TRY band for this market (Turkey) for the stated quantity basis.
confidence: 0-1.`;
}

function buildAppraisalPrompt(
  input: ValuationRequest,
  research: ResearchResult,
  feedback: AuditorFeedback,
  attempt: number,
  hasImage: boolean
): string {
  const fbBlock =
    feedback && attempt > 1
      ? `
=== AUDITOR FEEDBACK (adjust appraisal) ===
${feedback.criticisms.map((c) => `- ${c}`).join("\n")}
Suggested fix: ${feedback.suggested_fix ?? "(none)"}
`
      : "";

  const imgNote = hasImage
    ? "An image is attached as the first part(s) of this message. Assess visible condition and incorporate into condition_score and notes."
    : input.image_url && !input.image_url.startsWith("data:")
      ? `Listing image URL (no binary attached): ${input.image_url}`
      : "No product image provided.";

  return `You are the Appraiser agent. Combine the listing, research JSON, and optional image.

Original listing:
- title: ${input.title}
- description: ${input.description}
- quantity: ${input.quantity}
- unit: ${input.unit}
- location: ${input.location ?? "n/a"}

Research JSON:
${JSON.stringify(research, null, 2)}

${imgNote}
${fbBlock}

Rules:
- Never price 10 tons of industrial material like a single consumer item.
- Scale total estimated_price_try to full line quantity (all units).
- condition_score: integer 0-100.

Respond with ONLY valid JSON (no markdown fences):
{
  "estimated_price_try": number,
  "unit_price_try": number | null,
  "quantity": number,
  "unit": string,
  "condition_score": number,
  "condition_notes": string,
  "pricing_logic": string,
  "risk_flags": string[],
  "confidence": number
}`;
}

function buildAuditPrompt(
  input: ValuationRequest,
  research: ResearchResult,
  appraisal: AppraisalResult
): string {
  return `You are the Auditor agent. Validate pricing common sense for a Turkish barter marketplace.

Listing:
${JSON.stringify(
  {
    title: input.title,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    location: input.location,
  },
  null,
  2
)}

Researcher output:
${JSON.stringify(research, null, 2)}

Appraiser output:
${JSON.stringify(appraisal, null, 2)}

Reject absurd results (e.g. 10 tons steel ≈ 100 TRY, or a used book ≈ 500000 TRY). Reject clear quantity/unit mismatches.

Respond with ONLY valid JSON (no markdown fences):
{
  "approved": boolean,
  "final_price_try": number | null,
  "reason": string,
  "criticisms": string[],
  "suggested_fix": string | null,
  "confidence": number
}
If approved is true, final_price_try must be the sane final total in TRY you endorse (usually close to appraiser unless corrected).`;
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------

function getGoogleApiKey(): string {
  const k =
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "";
  if (!k) {
    throw new Error(
      "Missing GOOGLE_API_KEY (or GEMINI_API_KEY) for Google GenAI"
    );
  }
  return k;
}

function imagePartsFromUrl(
  imageUrl?: string,
  legacyImage?: string
): { inlineData: { mimeType: string; data: string } }[] {
  const raw = imageUrl ?? legacyImage;
  if (!raw || typeof raw !== "string") return [];
  if (!raw.startsWith("data:")) return [];
  const comma = raw.indexOf("base64,");
  if (comma === -1) return [];
  const header = raw.slice(5, comma);
  const mimeMatch = /^([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1]?.trim() || "image/jpeg";
  const data = raw.slice(comma + 7);
  if (!data) return [];
  return [{ inlineData: { mimeType, data } }];
}

async function runResearcher(
  ai: GoogleGenAI,
  model: string,
  prompt: string
): Promise<ResearchResult> {
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }],
    },
  });
  const text = res.text;
  if (!text) throw new Error("Researcher returned empty text");
  return parseResearchResult(text);
}

async function runAppraiser(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  imageInlineParts: { inlineData: { mimeType: string; data: string } }[]
): Promise<AppraisalResult> {
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] =
    [...imageInlineParts, { text: prompt }];

  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.25,
      maxOutputTokens: 8192,
    },
  });
  const text = res.text;
  if (!text) throw new Error("Appraiser returned empty text");
  return parseAppraisalResult(text);
}

async function runAuditor(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<AuditResult> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content:
          prompt +
          "\n\nYour entire reply must be a single JSON object matching the schema described above.",
      },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Auditor returned empty content");
  return parseAuditResult(text);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const geminiModel =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const auditorModel =
    process.env.OPENAI_AUDITOR_MODEL?.trim() || "gpt-4o-mini";

  try {
    const body = (await req.json()) as Partial<ValuationRequest> & {
      image?: string;
    };

    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const quantity = body.quantity;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (description === undefined || description === null) {
      return NextResponse.json(
        { error: "description is required (use empty string if none)" },
        { status: 400 }
      );
    }
    if (quantity === undefined || quantity === null) {
      return NextResponse.json({ error: "quantity is required" }, { status: 400 });
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
      return NextResponse.json(
        { error: "quantity must be a finite number" },
        { status: 400 }
      );
    }
    if (quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be greater than zero" },
        { status: 400 }
      );
    }
    if (!unit) {
      return NextResponse.json({ error: "unit is required" }, { status: 400 });
    }

    const image_url =
      typeof body.image_url === "string" && body.image_url.trim()
        ? body.image_url.trim()
        : typeof body.image === "string" && body.image.trim()
          ? body.image.trim()
          : undefined;

    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : undefined;

    const input: ValuationRequest = {
      title,
      description,
      quantity,
      unit,
      image_url,
      location,
    };

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 503 }
      );
    }

    let googleKey: string;
    try {
      googleKey = getGoogleApiKey();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Missing Google API key" },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const openai = new OpenAI({ apiKey: openaiKey });
    const imageParts = imagePartsFromUrl(input.image_url, body.image);

    let research: ResearchResult | null = null;
    let appraisal: AppraisalResult | null = null;
    let audit: AuditResult | null = null;
    let feedback: AuditorFeedback = null;
    const maxAttempts = 2;
    let attempts = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts = attempt;
      const rPrompt = buildResearchPrompt(input, feedback, attempt);
      research = await runResearcher(ai, geminiModel, rPrompt);

      const aPrompt = buildAppraisalPrompt(
        input,
        research,
        feedback,
        attempt,
        imageParts.length > 0
      );
      appraisal = await runAppraiser(ai, geminiModel, aPrompt, imageParts);

      const auPrompt = buildAuditPrompt(input, research, appraisal);
      audit = await runAuditor(openai, auditorModel, auPrompt);

      if (audit.approved) {
        return NextResponse.json({
          status: "approved" as const,
          final_price_try: audit.final_price_try,
          attempts,
          research,
          appraisal,
          audit,
          debug: {
            models: {
              researcher: geminiModel,
              appraiser: geminiModel,
              auditor: auditorModel,
            },
          },
        } satisfies ValuationResponse);
      }

      feedback = {
        criticisms: audit.criticisms,
        suggested_fix: audit.suggested_fix,
      };
    }

    return NextResponse.json({
      status: "needs_manual_review" as const,
      final_price_try: audit?.final_price_try ?? null,
      attempts,
      research,
      appraisal,
      audit,
      debug: {
        models: {
          researcher: geminiModel,
          appraiser: geminiModel,
          auditor: auditorModel,
        },
      },
    } satisfies ValuationResponse);
  } catch (e: unknown) {
    console.error("[valuation]", e);
    const message = e instanceof Error ? e.message : "Valuation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
