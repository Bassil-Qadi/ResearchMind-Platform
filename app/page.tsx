import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FolderKanban,
  GraduationCap,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { getPlatformStats } from "@/lib/platform-stats";
import { PLATFORM } from "@/lib/brand";

const features = [
  {
    icon: FolderKanban,
    title: "Research Projects",
    description:
      "Discover active studies, join teams, and manage collaborations across departments.",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Researcher Directory",
    description:
      "Find faculty, students, and staff by expertise, department, and research interests.",
    gradient: "from-teal-500 to-emerald-600",
    bg: "bg-teal-500/10",
  },
  {
    icon: MessageSquare,
    title: "Team Messaging",
    description:
      "Coordinate with collaborators through project channels and direct messages.",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-500/10",
  },
  {
    icon: Shield,
    title: "Secure & Role-Based",
    description:
      "University authentication with role-aware access for students, faculty, and admins.",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
  },
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const counts = await getPlatformStats();
  const stats = counts && [
    { value: counts.researchers.toLocaleString(),    label: counts.researchers === 1 ? "Researcher" : "Researchers" },
    { value: counts.activeProjects.toLocaleString(), label: counts.activeProjects === 1 ? "Active project" : "Active projects" },
    { value: counts.departments.toLocaleString(),    label: counts.departments === 1 ? "Department" : "Departments" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
              <BookOpen className="h-4 w-4" aria-hidden />
            </div>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap font-display text-sm font-bold tracking-tight sm:text-base">
                {PLATFORM.name}
              </span>
              <span className="self-start text-[11px] text-muted-foreground">
                {PLATFORM.short}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {/* Hidden on phones for room; the hero's first button signs in. */}
            <Button asChild variant="ghost" size="sm" className="hidden rounded-lg sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="btn-glow rounded-lg shadow-md">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mesh-bg-animated absolute inset-0" aria-hidden />
        {/* Floating orbs */}
        <div
          className="pointer-events-none absolute left-[10%] top-[20%] h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-float-slow"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[15%] top-[30%] h-48 w-48 rounded-full bg-violet-500/20 blur-3xl animate-float"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[10%] left-[40%] h-56 w-56 rounded-full bg-teal-500/15 blur-3xl animate-float-slow"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
              <span className="text-muted-foreground">
                University Research Collaboration
              </span>
            </div>
            <h1 className="animate-fade-up text-balance font-display text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl [animation-delay:80ms]">
              Connect, collaborate, and{" "}
              <span className="gradient-text">advance research</span> together
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl [animation-delay:160ms]">
              A unified workspace for discovering projects, forming teams, and
              communicating across your institution — built for academic
              workflows.
            </p>
            <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:240ms]">
              <Button
                asChild
                size="lg"
                className="btn-glow gap-2 rounded-xl px-8 shadow-lg hover:shadow-glow"
              >
                <Link href="/login">
                  Sign in to your workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl border-border/80 bg-card/50 backdrop-blur-sm"
              >
                <Link href="/login">Request access</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform at a glance — live counts, omitted if they cannot be read */}
      {stats && (
      <section className="border-y border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6 px-4 py-10 md:px-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-up text-center"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="font-display text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-14 text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden />
              Built for academia
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
              Everything your research community needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Purpose-built tools for academic collaboration, not generic
              productivity software.
            </p>
          </div>
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description, gradient, bg }) => (
              <div
                key={title}
                className="card-interactive group rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm hover:border-border hover:shadow-elevated"
              >
                <div
                  className={cn(
                    "mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                    bg
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                      gradient
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <h3 className="font-display font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/5 to-teal-600/10" />
        <div className="relative mx-auto max-w-2xl px-4 text-center md:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Ready to join your research community?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create a free account and start collaborating today.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-xl px-8 shadow-lg">
            <Link href="/register">Get started today</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/30 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
            </div>
            <p>{PLATFORM.name}</p>
          </div>
          <p>Built for university research communities</p>
        </div>
      </footer>
    </div>
  );
}
