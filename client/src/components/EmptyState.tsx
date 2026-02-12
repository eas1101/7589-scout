import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  testId = "empty-state",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("glass-panel neon-ring rounded-2xl p-6 sm:p-8", "text-center")}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 border border-border">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
