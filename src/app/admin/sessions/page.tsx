import { AudioWaveformIcon } from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { SessionsTable } from "@/features/admin/components/sessions-table";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import { resolveRangeStart } from "@/features/admin/lib/range";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; user?: string }>;
}) {
  const { range = "30", user } = await searchParams;
  const data = await getAdminDashboardData();
  const start = resolveRangeStart(range);

  let sessions = data.realtimeSessions.filter(
    (s) => !start || new Date(s.startedAt) >= start,
  );
  if (user) {
    sessions = sessions.filter((s) => s.ownerId === user);
  }
  const focusedUser = user
    ? data.users.find((u) => u.id === user)
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="AI sessions"
        icon={AudioWaveformIcon}
        description={
          focusedUser
            ? `Sessions for ${focusedUser.name}. Click a row for details.`
            : "Every realtime classroom session. Click a row for details."
        }
        action={<RangeFilter value={range} />}
      />
      <SessionsTable sessions={sessions} users={data.users} />
    </>
  );
}
