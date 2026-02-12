import { useMemo, useState } from "react";
import { Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export type DraftKind = "team" | "match";

export type LocalDraft = {
  id: string;
  kind: DraftKind;
  teamNumber: number;
  matchNumber?: number;
  values: Record<string, unknown>;
  updatedAt: number;
};

const LS_KEY = "frc.drafts.v1";

export function loadDrafts(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalDraft[];
  } catch {
    return [];
  }
}

export function saveDraft(draft: LocalDraft) {
  const list = loadDrafts();
  const next = [draft, ...list.filter((d) => d.id !== draft.id)].slice(0, 200);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function removeDraft(id: string) {
  const list = loadDrafts();
  localStorage.setItem(LS_KEY, JSON.stringify(list.filter((d) => d.id !== id)));
}

export function clearDrafts() {
  localStorage.removeItem(LS_KEY);
}

export default function LocalDrafts({
  onApplyDraft,
  onSyncAll,
}: {
  onApplyDraft: (d: LocalDraft) => void;
  onSyncAll: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  const drafts = useMemo(() => {
    nonce;
    return loadDrafts().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [nonce]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="localdrafts-open"
          variant="secondary"
          className="rounded-xl hover-lift"
          onClick={() => setOpen(true)}
        >
          暫存匣 ({drafts.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">離線暫存匣</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
          <ScrollArea className="h-[420px] rounded-xl border border-border/70">
            <div className="p-3">
              {drafts.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  目前沒有暫存。你可以在「隊伍資料 / 每場比賽」頁面選擇「先暫存」。
                </div>
              ) : (
                <div className="grid gap-2">
                  {drafts.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-border/70 bg-card/40 p-3 hover-lift"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-base leading-none">
                              隊伍 {d.teamNumber}
                              {d.kind === "match" ? `・第 ${d.matchNumber} 場` : ""}
                            </p>
                            <Badge variant="secondary" className="rounded-lg">
                              {d.kind === "team" ? "隊伍" : "比賽"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            更新於 {new Date(d.updatedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`draft-apply-${d.id}`}
                            className="rounded-xl"
                            onClick={() => {
                              onApplyDraft(d);
                              setOpen(false);
                            }}
                          >
                            套用
                          </Button>
                          <Button
                            data-testid={`draft-delete-${d.id}`}
                            variant="secondary"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => {
                              removeDraft(d.id);
                              setNonce((n) => n + 1);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
            <p className="font-display text-lg">同步建議</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              暫存是離線緩衝，不是唯一資料來源。建議在網路穩定時，回到設定頁按「匯出到試算表」。
            </p>

            <div className="mt-4 grid gap-2">
              <Button
                data-testid="drafts-sync-all"
                className="rounded-xl hover-lift"
                onClick={async () => {
                  await onSyncAll();
                }}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                立即同步（匯出）
              </Button>
              <Button
                data-testid="drafts-clear"
                variant="secondary"
                className="rounded-xl"
                onClick={() => {
                  clearDrafts();
                  setNonce((n) => n + 1);
                }}
              >
                清空所有暫存
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button data-testid="localdrafts-close" variant="secondary" className="rounded-xl" onClick={() => setOpen(false)}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
