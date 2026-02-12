import { Loader2 } from "lucide-react";

export default function LoadingState({
  title = "載入中…",
  subtitle = "正在取得資料，請稍候。",
  testId = "loading-state",
}: {
  title?: string;
  subtitle?: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="glass-panel neon-ring rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/5 border border-border">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-4 grid gap-2">
            <div className="h-10 rounded-xl shimmer" />
            <div className="h-10 rounded-xl shimmer" />
            <div className="h-10 rounded-xl shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
