import Link from "next/link";
import { redirect } from "next/navigation";

import { ChatThreadClient } from "@/app/chat/[id]/chat-thread-client";
import { buttonVariants } from "@/components/ui/button";
import { loadChatThreadDetail } from "@/lib/chat.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Sohbet",
};

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/${id}`)}`);
  }

  const detail = await loadChatThreadDetail(id, user.id);
  if (!detail) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-neutral-600">Sohbet bulunamadı.</p>
        <Link href="/chat" className={cn(buttonVariants({ className: "mt-6" }))}>
          Sohbetlere dön
        </Link>
      </div>
    );
  }

  return <ChatThreadClient initial={detail} />;
}
