import type { RatingGrade } from "@shared/schema";
import { cn } from "@/lib/utils";

const styleMap: Record<RatingGrade, string> = {
  S: "bg-gradient-to-r from-primary/22 to-accent/14 border-primary/30 text-primary",
  A: "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
  B: "bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400",
  C: "bg-yellow-500/10 border-yellow-500/25 text-yellow-700 dark:text-yellow-400",
  D: "bg-orange-500/10 border-orange-500/25 text-orange-700 dark:text-orange-300",
  E: "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400",
  F: "bg-destructive/12 border-destructive/30 text-destructive",
};

export default function GradeBadge({ grade, className }: { grade: RatingGrade; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-2 py-0.5 text-xs font-semibold",
        styleMap[grade],
        className,
      )}
    >
      {grade}
    </span>
  );
}
