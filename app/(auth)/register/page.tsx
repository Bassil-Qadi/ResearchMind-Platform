'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardFooter } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DEPARTMENTS } from '@/lib/departments'
import { EMAIL_PLACEHOLDER } from '@/lib/brand'

const registerSchema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  email:      z.string().email('Invalid email address'),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  confirm:    z.string(),
  // The selects start out undefined, not empty, so without required_error an
  // untouched one only said "Required".
  role:       z.enum(['Student', 'Faculty', 'Staff', 'Researcher'], { required_error: 'Select a role' }),
  department: z.string({ required_error: 'Department is required' }).min(1, 'Department is required'),
  position:   z.string().optional(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path:    ['confirm'],
})

type RegisterInput = z.infer<typeof registerSchema>

// The brand panel stays the same before and after submitting.
const HERO = {
  heroHeading: 'Join your research community',
  heroBody:    'Create your account to discover projects, connect with researchers, and collaborate across departments.',
  heroExtra: (
    <div className="space-y-3">
      {[
        'Discover research projects across all departments',
        'Connect with faculty, students, and researchers',
        'Collaborate in real time with your team',
      ].map((item) => (
        <div key={item} className="flex items-center gap-2 text-white/80">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <span className="text-sm">{item}</span>
        </div>
      ))}
    </div>
  ),
}

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setServerError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })

      const body = await res.json()

      if (!res.ok) {
        const firstError = Object.values(body.error ?? {})[0]
        setServerError(
          Array.isArray(firstError) ? firstError[0] : 'Registration failed.'
        )
        return
      }

      setSubmitted(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  // Success state
  if (submitted) {
    return (
      <AuthShell
        title="Registration submitted!"
        description="Your account is pending admin approval."
        {...HERO}
      >
        <CardContent>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <p className="text-sm text-muted-foreground">
              You&apos;ll be able to log in once an administrator reviews your
              request. This usually takes 1–2 business days.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full rounded-xl">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      description="Fill in your details to request access to the platform."
      {...HERO}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-2">
          {serverError && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Dr. Jane Smith"
              className="h-11 rounded-xl"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder={EMAIL_PLACEHOLDER}
              className="h-11 rounded-xl"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Role + Department. The ids tie each label to its select, so a
              screen reader announces "Role" rather than an unnamed list. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(v) => setValue('role', v as RegisterInput['role'], { shouldValidate: true })}>
                <SelectTrigger id="role" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {['Student', 'Faculty', 'Staff', 'Researcher'].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Select onValueChange={(v) => setValue('department', v, { shouldValidate: true })}>
                <SelectTrigger id="department" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select dept." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department.message}</p>
              )}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <Label htmlFor="position">
              Position <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="position"
              {...register('position')}
              placeholder="e.g. PhD Student, Assistant Professor"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Min. 8 characters"
              className="h-11 rounded-xl"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              {...register('confirm')}
              placeholder="Repeat your password"
              className="h-11 rounded-xl"
            />
            {errors.confirm && (
              <p className="text-xs text-destructive">{errors.confirm.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="btn-glow h-11 w-full rounded-xl shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
            ) : (
              'Request access'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthShell>
  )
}
