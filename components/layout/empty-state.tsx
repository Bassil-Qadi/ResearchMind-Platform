import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  accent?: "blue" | "violet" | "teal" | "amber" | "rose";
}

const accentStyles = {
  blue: {
    ring: "from-blue-500/20 to-indigo-500/20",
    icon: "from-blue-500 to-indigo-600 text-white",
  },
  violet: {
    ring: "from-violet-500/20 to-purple-500/20",
    icon: "from-violet-500 to-purple-600 text-white",
  },
  teal: {
    ring: "from-teal-500/20 to-emerald-500/20",
    icon: "from-teal-500 to-emerald-600 text-white",
  },
  amber: {
    ring: "from-amber-500/20 to-orange-500/20",
    icon: "from-amber-500 to-orange-600 text-white",
  },
  rose: {
    ring: "from-rose-500/20 to-pink-500/20",
    icon: "from-rose-500 to-pink-600 text-white",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  accent = "blue",
}: EmptyStateProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-16 text-center backdrop-blur-sm",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          styles.ring
        )}
        aria-hidden
      />
      <div className="relative mb-6">
        <div
          className="absolute inset-0 scale-150 rounded-full bg-gradient-to-br opacity-30 blur-2xl"
          style={{
            backgroundImage: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
          }}
          aria-hidden
        />
        <div
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
            styles.icon
          )}
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      </div>
      <h3 className="relative font-display text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
