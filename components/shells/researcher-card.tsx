"use client";

import Link from "next/link";
import { Building2, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ResearcherCardProps {
  id: string;
  name: string;
  title: string;
  department: string;
  interests?: string[];
  avatarUrl?: string;
  avatarGradient?: string;
  className?: string;
}

const avatarGradients = [
  "from-teal-500 to-emerald-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

export function ResearcherCard({
  id,
  name,
  title,
  department,
  interests = [],
  avatarUrl,
  avatarGradient,
  className,
}: ResearcherCardProps) {
  const gradient =
    avatarGradient ??
    avatarGradients[
      name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
        avatarGradients.length
    ];

  return (
    <Card
      className={cn(
        "card-interactive group overflow-hidden border-border/60 shadow-sm hover:border-teal-500/30 hover:shadow-glow-sm",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={name}
            src={avatarUrl}
            className="h-12 w-12 ring-2 ring-background transition-transform duration-300 group-hover:scale-105"
            fallbackClassName={cn("text-sm", gradient)}
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">
              <Link
                href={`/profile/${id}`}
                className="transition-colors hover:text-teal-600 dark:hover:text-teal-400"
              >
                {name}
              </Link>
            </CardTitle>
            <CardDescription className="mt-0.5 line-clamp-1">
              {title}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {department}
        </p>
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interests.slice(0, 3).map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="rounded-full border-0 bg-teal-500/10 text-[10px] text-teal-700 dark:text-teal-300"
              >
                {interest}
              </Badge>
            ))}
            {interests.length > 3 && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                +{interests.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg transition-all hover:border-teal-500/40 hover:bg-teal-500/5"
            asChild
          >
            <Link href={`/profile/${id}`}>View profile</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            disabled
            aria-label="Message (coming soon)"
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
