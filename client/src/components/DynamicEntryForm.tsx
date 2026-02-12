import { useMemo } from "react";
import type { RatingGrade, ScoringFieldResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GRADES: RatingGrade[] = ["S", "A", "B", "C", "D", "E", "F"];

export type ValuesMap = Record<string, unknown>;

export default function DynamicEntryForm({
  fields,
  values,
  onChange,
  disabled,
  testIdPrefix,
}: {
  fields: ScoringFieldResponse[];
  values: ValuesMap;
  onChange: (next: ValuesMap) => void;
  disabled?: boolean;
  testIdPrefix: string;
}) {
  const enabledFields = useMemo(
    () =>
      (fields ?? [])
        .filter((f) => (f.enabled ?? 1) === 1)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id),
    [fields],
  );

  return (
    <div className="grid gap-4">
      {enabledFields.map((f) => {
        const v = values?.[f.key];
        const common = "rounded-xl bg-background/60 border-border/80 focus:border-primary focus:ring-4 focus:ring-primary/10";
        return (
          <div key={f.id} className="rounded-2xl border border-border/70 bg-card/30 p-4 hover-lift">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-sm">{f.label}</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  key：<span className="font-mono">{f.key}</span> ・type：{f.inputType}
                </p>
              </div>

              <div className="w-full md:w-[340px]">
                {f.inputType === "grade" ? (
                  <Select
                    value={(typeof v === "string" ? v : "") as any}
                    onValueChange={(val) => onChange({ ...values, [f.key]: val })}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      data-testid={`${testIdPrefix}-${f.key}`}
                      className={cn("rounded-xl", common)}
                    >
                      <SelectValue placeholder="選擇等級（S~F）" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.inputType === "number" ? (
                  <Input
                    data-testid={`${testIdPrefix}-${f.key}`}
                    className={cn("rounded-xl", common)}
                    type="number"
                    inputMode="numeric"
                    value={typeof v === "number" || typeof v === "string" ? (v as any) : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onChange({ ...values, [f.key]: raw === "" ? null : Number(raw) });
                    }}
                    disabled={disabled}
                    placeholder="輸入數字"
                  />
                ) : (
                  <Textarea
                    data-testid={`${testIdPrefix}-${f.key}`}
                    className={cn("rounded-xl min-h-[110px]", common)}
                    value={typeof v === "string" ? v : ""}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                    disabled={disabled}
                    placeholder="輸入筆記 / 文字"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {enabledFields.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/30 p-6 text-sm text-muted-foreground">
          目前沒有啟用的評分項目。請到「設定」頁新增或啟用欄位。
        </div>
      ) : null}
    </div>
  );
}
