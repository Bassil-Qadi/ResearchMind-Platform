"use client";

import Link from "next/link";
import { PLATFORM } from "@/lib/brand";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  LucideIcon,
  MessageSquare,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryAccents, getNavAccent } from "@/lib/accents";
import { useUser } from "@/hooks/use-user";
import { canAccessAdmin } from "@/lib/auth/rbac";
import type { UserRole } from "@/types";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/profile/me", label: "Profile", icon: UserCircle },
] as const;

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const showAdmin = canAccessAdmin(user?.role as UserRole | undefined);

  function renderNavLink(
    href: string,
    label: string,
    Icon: LucideIcon
  ) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const accent = getNavAccent(href);
    const colors = categoryAccents[accent];

    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? cn("bg-sidebar-accent text-sidebar-accent-foreground shadow-sm", colors.border, "border")
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
        aria-current={active ? "page" : undefined}
      >
        {active && (
          <span
            className={cn(
              "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b transition-all duration-300",
              colors.gradient
            )}
            aria-hidden
          />
        )}
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
            active
              ? cn(colors.iconBg, colors.icon, "scale-105")
              : "text-sidebar-foreground/50 group-hover:scale-105 group-hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {label}
      </Link>
    );
  }

  return (
    <ScrollArea className="flex-1 px-3 py-4">
      <nav className="space-y-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) =>
          renderNavLink(href, label, Icon)
        )}
        {showAdmin && (
          <>
            <Separator className="my-3 bg-sidebar-border" />
            {renderNavLink("/admin", "Admin", Shield)}
          </>
        )}
      </nav>
    </ScrollArea>
  );
}

export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="group flex items-center gap-2.5 px-4 transition-opacity hover:opacity-90"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
        <BookOpen className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex flex-col">
        <span className="font-display text-sm font-bold leading-tight tracking-tight">
          {PLATFORM.name}
        </span>
        <span className="text-[10px] text-sidebar-foreground/60">
          {PLATFORM.short}
        </span>
      </div>
    </Link>
  );
}
