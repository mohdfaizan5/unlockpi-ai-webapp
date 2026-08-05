import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/features/admin/components/admin-shell";
import { createClient } from "@/lib/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  await supabase.rpc("touch_user_activity");

  return <AdminShell>{children}</AdminShell>;
}
