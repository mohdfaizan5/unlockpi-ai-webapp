"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioWaveformIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import Logo from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/sessions", label: "AI sessions", icon: AudioWaveformIcon },
  { href: "/admin/spend", label: "Spend", icon: CoinsIcon },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky w-full top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo isLink={false} full width={26} height={26} />
            <div className="h-5 w-px bg-border" />
            <p className="text-sm font-semibold tracking-tight">
              Admin
              {/* <span className="ml-2 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
                Operations
              </span> */}
            </p>
          </div>
          {/* Underline tab-nav (p-tabs-7 style) driven by the route. */}
          <nav className=" border-b! border-border">
            <div className="flex items-center gap-1 overflow-x-auto">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary border-b! border-red-500!  text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
          {/* <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Live data
            </Badge>
            <Button
              render={<Link href="/dashboard" />}
              variant="outline"
              size="sm"
            >
              <LogOutIcon /> Exit
            </Button>
          </div> */}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 mt-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
