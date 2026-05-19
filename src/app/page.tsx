import { HomeLanding } from "@/components/home-landing";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { loadDashboardData } from "@/lib/dashboard.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const data = await loadDashboardData(user.id);
        return <DashboardClient {...data} />;
      }
    } catch {
      // fall through to public landing
    }
  }

  return <HomeLanding />;
}
