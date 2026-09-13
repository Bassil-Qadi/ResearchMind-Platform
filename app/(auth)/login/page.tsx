"use client";

import { Suspense, useState } from "react";

import { signIn } from "next-auth/react";

import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";

import { Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Skeleton } from "@/components/ui/skeleton";

import { CardContent, CardFooter } from "@/components/ui/card";

import {
  AUTH_ERROR_MESSAGES,
  DEFAULT_AUTH_ERROR_MESSAGE,
} from "@/lib/auth/errors";
import { EMAIL_PLACEHOLDER, UNIVERSITY } from "@/lib/brand";

function LoginForm() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  // An OAuth denial comes back as a redirect, not as a signIn() result.
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(
    oauthError === "AccessDenied"
      ? "Your account is awaiting administrator approval."
      : oauthError
        ? DEFAULT_AUTH_ERROR_MESSAGE
        : null,
  );

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        AUTH_ERROR_MESSAGES[result.code ?? ""] ?? DEFAULT_AUTH_ERROR_MESSAGE,
      );
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4 pt-2">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in"
          >
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{UNIVERSITY.name} email</Label>

          <Input
            id="email"
            type="email"
            placeholder={EMAIL_PLACEHOLDER}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 rounded-xl transition-shadow focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-teal-500/20"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>

            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 rounded-xl transition-shadow focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-teal-500/20"
          />
        </div>

        {process.env.NODE_ENV !== "production" && (
          <p className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Development login: run <code>npm run seed</code>, then sign in with
            the seeded account (see .env.example).
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          className="btn-glow h-11 w-full rounded-xl shadow-md"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <Link
          href="/"
          className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Request access
          </Link>
        </p>
      </CardFooter>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description={`Sign in with your ${UNIVERSITY.name} credentials to access your research workspace.`}
      heroHeading={`Your ${UNIVERSITY.short} research workspace`}
      heroBody="Sign in to discover projects, connect with researchers, and collaborate across faculties — all in one secure platform."
    >
      <Suspense
        fallback={
          <CardContent className="space-y-4">
            <Skeleton className="h-11 w-full" />

            <Skeleton className="h-11 w-full" />

            <Skeleton className="h-11 w-full" />
          </CardContent>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
