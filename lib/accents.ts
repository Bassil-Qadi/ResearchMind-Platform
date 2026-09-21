/** Category accent colors used consistently across nav, stat cards, and badges. */
export const categoryAccents = {
  dashboard: {
    label: "Dashboard",
    icon: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/15",
    border: "border-sky-500/30",
    glow: "shadow-sky-500/20",
    gradient: "from-sky-500 to-blue-600",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  projects: {
    label: "Projects",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/15",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500 to-indigo-600",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  messages: {
    label: "Messages",
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/15",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/20",
    gradient: "from-violet-500 to-purple-600",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  directory: {
    label: "Directory",
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-500/15",
    border: "border-teal-500/30",
    glow: "shadow-teal-500/20",
    gradient: "from-teal-500 to-emerald-600",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  profile: {
    label: "Profile",
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/15",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/20",
    gradient: "from-rose-500 to-pink-600",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  admin: {
    label: "Admin",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/15",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
} as const;

export type CategoryAccent = keyof typeof categoryAccents;

export const navAccentMap: Record<string, CategoryAccent> = {
  "/dashboard": "dashboard",
  "/projects": "projects",
  "/messages": "messages",
  "/directory": "directory",
  "/profile": "profile",
  "/admin": "admin",
};

export function getNavAccent(href: string): CategoryAccent {
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/profile")) return "profile";
  for (const [prefix, accent] of Object.entries(navAccentMap)) {
    if (href === prefix || href.startsWith(`${prefix}/`)) return accent;
  }
  return "dashboard";
}
