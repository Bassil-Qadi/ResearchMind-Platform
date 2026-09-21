'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { EMAIL_PLACEHOLDER } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        // 422 comes back as a field map; anything else is already a sentence.
        const message = typeof payload.error === 'string'
          ? payload.error
          : payload.error?.fieldErrors?.email?.[0] ?? 'Something went wrong'
        throw new Error(message)
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  // The server will not say whether the address exists, and neither does this.
  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        description="If that address has an account, a reset link is on its way."
        heroHeading="Getting you back in"
        heroBody="Reset links last an hour and can be used once."
      >
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" aria-hidden />
            <p className="text-sm text-muted-foreground">
              We sent a link to <span className="font-medium text-foreground">{email}</span>.
              It expires in an hour. If nothing arrives, check your spam folder or
              try again.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => { setSent(false); setError(null) }}
          >
            Use a different address
          </Button>
        </CardContent>

        <CardFooter>
          <Link
            href="/login"
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to sign in
          </Link>
        </CardFooter>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description={"Enter your account's email and we will send you a link to choose a new one."}
      heroHeading="Getting you back in"
      heroBody="Reset links last an hour and can be used once."
    >
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={EMAIL_PLACEHOLDER}
              className="rounded-xl"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={sending || !email.trim()}>
            {sending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
              : 'Send reset link'}
          </Button>
        </CardContent>

        <CardFooter>
          <Link
            href="/login"
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to sign in
          </Link>
        </CardFooter>
      </form>
    </AuthShell>
  )
}
