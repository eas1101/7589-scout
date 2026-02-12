import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorState({
  title = "發生錯誤",
  message,
  onRetry,
  testId = "error-state",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="glass-panel neon-ring rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{message}</p>
          <div className="mt-4">
            <Button
              data-testid="error-retry"
              variant="secondary"
              className="rounded-xl hover-lift"
              onClick={() => onRetry?.()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重新嘗試
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
