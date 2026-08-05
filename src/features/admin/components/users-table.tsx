"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SearchIcon, ShieldCheckIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/features/admin/components/data-table";
import {
  formatCost,
  formatNumber,
  formatRelative,
  initialsOf,
} from "@/features/admin/lib/format";
import type { UserStats } from "@/features/admin/lib/user-stats";
import type { AdminUser } from "@/features/admin/types/admin-types";

type UserRow = AdminUser & UserStats;

export function UsersTable({
  users,
  statsByUser,
}: {
  users: AdminUser[];
  statsByUser: Record<string, UserStats>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const rows = useMemo<UserRow[]>(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) =>
        `${user.name} ${user.email}`.toLowerCase().includes(query),
      )
      .map((user) => ({
        ...user,
        ...(statsByUser[user.id] ?? {
          sessionCount: 0,
          durationSeconds: 0,
          realtimeCostUsd: 0,
          generationCount: 0,
          visualsCostUsd: 0,
          totalCostUsd: 0,
        }),
      }));
  }, [users, statsByUser, search]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tutor",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarImage
                alt="Luke Tracy"
                src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
              />
              <AvatarFallback> {initialsOf(row.original.name)}</AvatarFallback>
            </Avatar>
            {/* <Avatar className="size-8 shrink-0 text-xs">
              <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                {initialsOf(row.original.name)}
              </AvatarFallback>
            </Avatar> */}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {row.original.name}
                {row.original.isAdmin ? (
                  <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" />
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "sessionCount",
        header: "Sessions",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.sessionCount)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "generationCount",
        header: "Visuals",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.generationCount)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "totalCostUsd",
        header: "Spend",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCost(row.original.totalCostUsd)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "lastActiveAt",
        header: "Last active",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatRelative(row.original.lastActiveAt)}
          </span>
        ),
        size: 110,
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tutors"
          className="pl-9"
        />
      </div>
      {rows.length === 0 && users.length > 0 ? (
        <Badge variant="secondary">
          No tutors match &ldquo;{search}&rdquo;
        </Badge>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        pageSize={12}
        emptyLabel="No tutors yet."
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
      />
    </div>
  );
}
