"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/features/admin/components/data-table";
import { SessionDetailDialog } from "@/features/admin/components/session-detail-dialog";
import { formatCost, formatDate, initialsOf } from "@/features/admin/lib/format";
import type {
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";

export function SessionsTable({
  sessions,
  users,
}: {
  sessions: AdminRealtimeSession[];
  users: AdminUser[];
}) {
  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const [selected, setSelected] = useState<AdminRealtimeSession | null>(null);
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<AdminRealtimeSession>[]>(
    () => [
      {
        accessorKey: "ownerId",
        header: "Tutor",
        enableSorting: false,
        cell: ({ row }) => {
          const user = userById.get(row.original.ownerId);
          const name = user?.name ?? "Unknown";
          return (
            // Clicking the tutor jumps to their profile; stopPropagation so it
            // doesn't also open the session detail dialog.
            <Link
              href={user ? `/admin/users/${user.id}` : "#"}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-2.5 hover:underline"
            >
              <Avatar className="size-7 shrink-0 text-[10px]">
                <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                  {initialsOf(name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{name}</span>
            </Link>
          );
        },
      },
      {
        accessorKey: "lessonTitle",
        header: "Lesson",
        cell: ({ row }) => (
          <span className="truncate text-muted-foreground">
            {row.original.lessonTitle}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.source}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: "durationSeconds",
        header: "Duration",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {Math.round(row.original.durationSeconds / 60)}m
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "estimatedCostUsd",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCost(row.original.estimatedCostUsd)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "startedAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.startedAt)}
          </span>
        ),
        size: 120,
      },
    ],
    [userById],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={sessions}
        pageSize={12}
        emptyLabel="No AI sessions in this range."
        onRowClick={(session) => {
          setSelected(session);
          setOpen(true);
        }}
      />
      <SessionDetailDialog
        session={selected}
        user={selected ? userById.get(selected.ownerId) : undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
