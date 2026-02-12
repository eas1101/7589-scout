import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TeamComparePicker({
  value,
  onChange,
  max = 8,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const list = useMemo(() => {
    const uniq = Array.from(new Set((value ?? []).filter((n) => Number.isFinite(n))));
    uniq.sort((a, b) => a - b);
    return uniq;
  }, [value]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="font-display text-lg">選擇隊伍（最多 {max} 隊）</p>
          <p className="mt-1 text-sm text-muted-foreground">
            你可以輸入隊伍編號加入清單，或刪除徽章移除。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            data-testid="compare-add-input"
            className="rounded-xl w-[160px]"
            inputMode="numeric"
            placeholder="例如 254"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          />
          <Button
            data-testid="compare-add-btn"
            className="rounded-xl hover-lift"
            onClick={() => {
              const n = Number(draft);
              if (!Number.isFinite(n) || n <= 0) return;
              if (list.includes(n)) {
                setDraft("");
                return;
              }
              if (list.length >= max) return;
              onChange([...list, n]);
              setDraft("");
            }}
            disabled={list.length >= max}
          >
            <Plus className="h-4 w-4 mr-2" />
            加入
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未選擇任何隊伍。</p>
        ) : (
          list.map((n) => (
            <Badge key={n} variant="secondary" className="rounded-xl px-3 py-1.5 text-sm">
              <span className="font-display">#{n}</span>
              <button
                data-testid={`compare-remove-${n}`}
                className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-lg hover:bg-foreground/10 transition-colors"
                onClick={() => onChange(list.filter((x) => x !== n))}
                type="button"
                aria-label={`移除 ${n}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
