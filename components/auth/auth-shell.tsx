import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { PLATFORM } from '@/lib/brand'
import {
  Card, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'

/**
 * The split-screen every signed-out page shares: the brand panel on the left,
 * a card on the right. Login, register, forgot-password and reset-password all
 * render through this, so a brand change is made here once.
 */
export function AuthShell({
  title, description, heroHeading, heroBody, heroExtra, children,
}: {
  title:        string
  description:  string
  heroHeading:  string
  heroBody:     string
  /** Anything the brand panel shows under the body, such as register's list of benefits. */
  heroExtra?:   React.ReactNode
  children:     React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — desktop only */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-violet-900 animate-gradient" />
        <div className="mesh-bg-animated absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl animate-float-slow"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-1/4 h-64 w-64 rounded-full bg-violet-400/25 blur-3xl animate-float"
          aria-hidden
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <span className="font-display text-lg font-bold">{PLATFORM.name}</span>
        </Link>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Built for university research teams
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
            {heroHeading}
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-white/80">{heroBody}</p>
          {heroExtra}
        </div>

        <p className="relative text-sm text-white/50">
          © {PLATFORM.name}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-muted/30 p-4">
        <div className="mesh-bg absolute inset-0 opacity-60" aria-hidden />

        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>

        <Card className="relative z-10 w-full max-w-md animate-fade-up border-border/60 shadow-elevated backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <div className="mb-2 flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                <BookOpen className="h-4 w-4" aria-hidden />
              </div>
              <span className="font-display font-semibold">{PLATFORM.name}</span>
            </div>

            <CardTitle className="font-display text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          {children}
        </Card>
      </div>
    </div>
  )
}
