import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Save, Trash2, UploadCloud, Swords, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import DynamicEntryForm, { ValuesMap } from "@/components/DynamicEntryForm";
import LocalDrafts, { saveDraft, type LocalDraft } from "@/components/LocalDrafts";
import { useFields } from "@/hooks/use-fields";
import { useDeleteMatch, useMatchesByTeam, useUpsertMatch } from "@/hooks/use-matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getQueryParams(location: string) {
  const idx = location.indexOf("?");
  if (idx === -1) return new URLSearchParams();
  return new URLSearchParams(location.slice(idx + 1));
}
function draftId(teamNumber: number, matchNumber: number) {
  return `match-${teamNumber}-${matchNumber}`;
}

export default function MatchesPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const qp = useMemo(() => getQueryParams(location), [location]);

  const [teamInput, setTeamInput] = useState(qp.get("team") ?? "");
  const [matchInput, setMatchInput] = useState(qp.get("match") ?? "");

  const teamNumber = useMemo(() => {
    const n = Number(teamInput);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [teamInput]);

  const matchNumber = useMemo(() => {
    const n = Number(matchInput);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [matchInput]);

  const fieldsQ = useFields("match");
  const listQ = useMatchesByTeam(teamNumber);
  const upsert = useUpsertMatch();
  const del = useDeleteMatch();

  const [values, setValues] = useState<ValuesMap>({});
  const [saveMode, setSaveMode] = useState<"direct" | "local">("direct");
  const [confirmDelete, setConfirmDelete] = useState<{ teamNumber: number; matchNumber: number } | null>(null);

  const rows = useMemo(() => {
    const list = listQ.data ?? [];
    return list.slice().sort((a: any, b: any) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
  }, [listQ.data]);

  const selectFromList = (mn: number) => {
    setMatchInput(String(mn));
    const found = rows.find((r: any) => r.matchNumber === mn);
    setValues({ ...(found?.values as any) });
    toast({ title: "已載入", description: `已載入第 ${mn} 場資料到表單` });
  };

  useEffect(() => {
    // when team changes, reset match input for clarity
    setValues({});
  }, [teamNumber]);

  const applyDraft = (d: LocalDraft) => {
    if (d.kind !== "match") return;
    setTeamInput(String(d.teamNumber));
    setMatchInput(String(d.matchNumber ?? ""));
    setValues(d.values ?? {});
    toast({ title: "已套用暫存", description: `隊伍 ${d.teamNumber} 第 ${d.matchNumber} 場暫存內容已載入` });
  };

  const save = async () => {
    if (!teamNumber || !matchNumber) {
      toast({ title: "請輸入隊伍與場次", description: "必填：teamNumber + matchNumber", variant: "destructive" });
      return;
    }

    if (saveMode === "local") {
      const d: LocalDraft = {
        id: draftId(teamNumber, matchNumber),
        kind: "match",
        teamNumber,
        matchNumber,
        values: values ?? {},
        updatedAt: Date.now(),
      };
      saveDraft(d);
      toast({ title: "已暫存", description: "已保存到瀏覽器暫存匣（可於設定頁同步）" });
      return;
    }

    try {
      await upsert.mutateAsync({ teamNumber, matchNumber, values: values ?? {} });
      toast({ title: "已儲存", description: `已更新隊伍 ${teamNumber} 第 ${matchNumber} 場` });
    } catch (e: any) {
      toast({ title: "儲存失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const deleteMatch = async (t: number, m: number) => {
    try {
      await del.mutateAsync({ teamNumber: t, matchNumber: m });
      toast({ title: "已刪除", description: `已刪除隊伍 ${t} 第 ${m} 場` });
      if (teamNumber === t && matchNumber === m) {
        setValues({});
      }
    } catch (e: any) {
      toast({ title: "刪除失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <div className="grid gap-4 sm:gap-6">
        <SectionHeader
          title="每場比賽"
          description="選擇隊伍與場次，動態欄位輸入比賽資料。左側列表可快速切換各場紀錄。"
          right={
            <div className="flex items-center gap-2">
              <LocalDrafts
                onApplyDraft={applyDraft}
                onSyncAll={async () => {
                  toast({ title: "提示", description: "請到「設定」頁使用「匯出到試算表」進行同步。" });
                }}
              />
              <Button
                data-testid="matches-new-match"
                variant="secondary"
                className="rounded-xl"
                onClick={() => {
                  if (!teamNumber) {
                    toast({ title: "請先輸入隊伍編號", variant: "destructive" });
                    return;
                  }
                  setMatchInput(String((rows[rows.length - 1]?.matchNumber ?? 0) + 1));
                  setValues({});
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                新增場次
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 sm:gap-6">
          <Card className="glass-panel neon-ring rounded-2xl border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="font-display">比賽列表</CardTitle>
              <CardDescription>先選隊伍編號，下面會列出該隊所有場次。</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    data-testid="matches-team-input"
                    className="rounded-xl"
                    inputMode="numeric"
                    placeholder="隊伍編號（例如 1678）"
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <Button
                    data-testid="matches-refresh-list"
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => listQ.refetch()}
                    disabled={!teamNumber}
                  >
                    重新整理
                  </Button>
                </div>

                <Separator />

                {!teamNumber ? (
                  <EmptyState
                    icon={<Swords className="h-6 w-6 text-muted-foreground" />}
                    title="請先輸入隊伍編號"
                    description="輸入隊伍後即可看到該隊所有比賽場次。"
                    testId="matches-empty-no-team"
                  />
                ) : listQ.isLoading ? (
                  <LoadingState title="載入比賽列表…" subtitle={`正在讀取隊伍 ${teamNumber} 的場次。`} />
                ) : listQ.error ? (
                  <ErrorState message={String((listQ.error as any)?.message ?? listQ.error)} onRetry={() => listQ.refetch()} />
                ) : rows.length === 0 ? (
                  <EmptyState
                    icon={<Swords className="h-6 w-6 text-muted-foreground" />}
                    title="尚無比賽資料"
                    description="你可以按右上角「新增場次」開始記錄。"
                    testId="matches-empty-no-matches"
                  />
                ) : (
                  <div className="rounded-2xl border border-border/70 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>場次</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r: any) => (
                          <TableRow key={r.id} className={r.matchNumber === matchNumber ? "bg-primary/6" : ""}>
                            <TableCell className="font-display">第 {r.matchNumber} 場</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  data-testid={`matches-view-${r.matchNumber}`}
                                  variant="secondary"
                                  size="icon"
                                  className="rounded-xl"
                                  onClick={() => selectFromList(r.matchNumber)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  data-testid={`matches-delete-${r.matchNumber}`}
                                  variant="secondary"
                                  size="icon"
                                  className="rounded-xl"
                                  onClick={() => setConfirmDelete({ teamNumber: teamNumber!, matchNumber: r.matchNumber })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-ring rounded-2xl border-border/70">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <CardTitle className="font-display">輸入 / 編輯比賽資料</CardTitle>
                  <CardDescription>
                    動態欄位（scope=match）。可選「先暫存」或「直接儲存」。
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    data-testid="matches-match-input"
                    className="rounded-xl w-[160px]"
                    inputMode="numeric"
                    placeholder="場次（例如 3）"
                    value={matchInput}
                    onChange={(e) => setMatchInput(e.target.value.replace(/[^\d]/g, ""))}
                    disabled={!teamNumber}
                  />

                  <div className="inline-flex rounded-xl border border-border/70 bg-card/30 p-1">
                    <button
                      data-testid="matches-save-mode-direct"
                      className={
                        "px-3 py-2 rounded-lg text-sm font-medium interactive " +
                        (saveMode === "direct" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")
                      }
                      onClick={() => setSaveMode("direct")}
                      type="button"
                    >
                      直接儲存
                    </button>
                    <button
                      data-testid="matches-save-mode-local"
                      className={
                        "px-3 py-2 rounded-lg text-sm font-medium interactive " +
                        (saveMode === "local" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")
                      }
                      onClick={() => setSaveMode("local")}
                      type="button"
                    >
                      先暫存
                    </button>
                  </div>

                  <Button
                    data-testid="matches-save-btn"
                    className="rounded-xl hover-lift"
                    onClick={save}
                    disabled={!teamNumber || !matchNumber || fieldsQ.isLoading || upsert.isPending}
                  >
                    {saveMode === "local" ? <UploadCloud className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {upsert.isPending ? "儲存中…" : saveMode === "local" ? "暫存" : "儲存"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <Separator className="my-4" />

              {!teamNumber || !matchNumber ? (
                <EmptyState
                  icon={<Swords className="h-6 w-6 text-muted-foreground" />}
                  title="請輸入隊伍與場次"
                  description="完成後即可開始填寫比賽評分項目。"
                  testId="matches-empty-form"
                />
              ) : fieldsQ.isLoading ? (
                <LoadingState title="載入欄位中…" subtitle="正在取得比賽評分項目設定。" />
              ) : fieldsQ.error ? (
                <ErrorState message={String((fieldsQ.error as any)?.message ?? fieldsQ.error)} onRetry={() => fieldsQ.refetch()} />
              ) : (
                <DynamicEntryForm
                  fields={fieldsQ.data ?? []}
                  values={values}
                  onChange={setValues}
                  testIdPrefix="matches-field"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!confirmDelete} onOpenChange={(o) => (!o ? setConfirmDelete(null) : null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">確認刪除</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              你確定要刪除隊伍 {confirmDelete?.teamNumber} 第 {confirmDelete?.matchNumber} 場資料嗎？此操作無法復原。
            </p>
            <DialogFooter>
              <Button
                data-testid="matches-delete-cancel"
                variant="secondary"
                className="rounded-xl"
                onClick={() => setConfirmDelete(null)}
              >
                取消
              </Button>
              <Button
                data-testid="matches-delete-confirm"
                variant="destructive"
                className="rounded-xl"
                onClick={async () => {
                  if (!confirmDelete) return;
                  await deleteMatch(confirmDelete.teamNumber, confirmDelete.matchNumber);
                  setConfirmDelete(null);
                }}
              >
                刪除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
