import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function SectionHeader({
  title,
  description,
  right,
  testId,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 data-testid={testId ?? "page-title"} className="font-display text-2xl sm:text-3xl lg:text-4xl leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
