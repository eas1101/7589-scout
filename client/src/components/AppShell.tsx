import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  GitCompare,
  Settings as SettingsIcon,
  Swords,
  Users,
  SunMedium,
  MoonStar,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
};

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("frc.theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("frc.theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

export default function AppShell({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems: NavItem[] = useMemo(
    () => [
      { href: "/teams", label: "隊伍資料", icon: Users, testId: "nav-teams" },
      { href: "/matches", label: "每場比賽", icon: Swords, testId: "nav-matches" },
      { href: "/analytics", label: "數據分析", icon: BarChart3, testId: "nav-analytics" },
      { href: "/compare", label: "隊伍比較", icon: GitCompare, testId: "nav-compare" },
      { href: "/settings", label: "設定", icon: SettingsIcon, testId: "nav-settings" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-tech">
      <div className="relative z-10">
        <div className="app-container py-5 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 sm:gap-6 lg:gap-8">
            <aside className="glass-panel neon-ring rounded-2xl p-4 sm:p-5 lg:p-6 rise-in">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border">
                      <Database className="h-5 w-5 text-foreground/90" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-lg sm:text-xl leading-none">
                        FRC Scout Lab
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        黑橘科技感・離線緩衝・試算表同步
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  data-testid="theme-toggle"
                  variant="secondary"
                  size="icon"
                  className="rounded-xl hover-lift"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <SunMedium className="h-5 w-5" />
                  ) : (
                    <MoonStar className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <Separator className="my-4 sm:my-5" />

              <nav className="grid gap-1.5">
                {navItems.map((it) => {
                  const active =
                    location === it.href ||
                    (it.href !== "/" && location.startsWith(it.href));
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={`/#${it.href}`}
                      data-testid={it.testId}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium interactive",
                        "border border-transparent",
                        "hover:bg-foreground/5 hover:border-border/70",
                        active
                          ? "bg-gradient-to-r from-primary/18 to-accent/10 border-border/80 shadow-[0_12px_40px_hsl(var(--primary)/0.14)]"
                          : "text-foreground/88",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border interactive",
                          active
                            ? "bg-primary/15 border-primary/25"
                            : "bg-card/40 border-border/70 group-hover:border-border",
                        )}
                      >
                        <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-foreground/80")} />
                      </span>
                      <span className="truncate">{it.label}</span>

                      <span
                        className={cn(
                          "ml-auto h-2 w-2 rounded-full",
                          active ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" : "bg-transparent",
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 rounded-2xl border border-border/70 bg-card/40 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  提示：GitHub Pages 建議使用 <span className="font-mono">/#/路徑</span>，
                  可避免重新整理時 404。所有表單都支援「先暫存」與「直接儲存」。
                </p>
              </div>
            </aside>

            <main className="min-w-0">
              <div className="fade-in">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
