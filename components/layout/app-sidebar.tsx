"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  return (
    <aside
      className={cn(
        // The page itself scrolls, so the sidebar has to be pinned: without
        // sticky it is just a one-viewport-tall block that scrolls away.
        "hidden sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        "bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95"
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border/80">
        <SidebarBrand />
      </div>
      <SidebarNav />
      <div className="border-t border-sidebar-border/80 p-4">
        <p className="text-xs text-sidebar-foreground/50">
          University research workspace
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
