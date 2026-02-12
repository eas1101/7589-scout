import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Save, UploadCloud, ArrowRight, FileX2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SectionHeader from "@/components/SectionHeader";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import AppShell from "@/components/AppShell";
import DynamicEntryForm, { ValuesMap } from "@/components/DynamicEntryForm";
import LocalDrafts, { saveDraft, type LocalDraft } from "@/components/LocalDrafts";
import { useFields } from "@/hooks/use-fields";
import { useTeamFull, useUpsertTeam } from "@/hooks/use-teams";
import { useMatchesByTeam } from "@/hooks/use-matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GradeBadge from "@/components/GradeBadge";

function getTeamDraftKey(teamNumber: number) {
  return `team-${teamNumber}`;
}

export default function TeamsPage() {
  const { toast } = useToast();
  const [teamInput, setTeamInput] = useState("");
  const teamNumber = useMemo(() => {
    const n = Number(teamInput);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [teamInput]);

  const fieldsQ = useFields("team");
  const teamQ = useTeamFull(teamNumber);
  const matchesQ = useMatchesByTeam(teamNumber);

  const upsertTeam = useUpsertTeam();

  const [values, setValues] = useState<ValuesMap>({});
  const [saveMode, setSaveMode] = useState<"direct" | "local">("direct");

  const currentTeam = teamQ.data?.team ?? null;

  const matchRows = useMemo(() => {
    return (teamQ.data?.matches ?? matchesQ.data ?? []).slice().sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
  }, [teamQ.data?.matches, matchesQ.data]);

  const enabledTeamFields = useMemo(() => {
    return (fieldsQ.data ?? []).filter((f) => (f.enabled ?? 1) === 1);
  }, [fieldsQ.data]);

  const syncFromServerToForm = () => {
    const base = (currentTeam?.values ?? {}) as Record<string, unknown>;
    setValues({ ...base });
  };

  const handleLoadTeam = () => {
    if (!teamNumber) {
      toast({ title: "請輸入隊伍編號", description: "例如：254", variant: "destructive" });
      return;
    }
    // Form values will sync when query returns; we also allow manual sync button.
  };

  const handleSave = async () => {
    if (!teamNumber) return;

    if (saveMode === "local") {
      const draft: LocalDraft = {
        id: getTeamDraftKey(teamNumber),
        kind: "team",
        teamNumber,
        values: values ?? {},
        updatedAt: Date.now(),
      };
      saveDraft(draft);
      toast({ title: "已暫存", description: "已保存到瀏覽器暫存匣（可於設定頁同步）" });
      return;
    }

    try {
      await upsertTeam.mutateAsync({ teamNumber, values: values ?? {} });
      toast({ title: "已儲存", description: `隊伍 ${teamNumber} 資料已更新` });
    } catch (e: any) {
      toast({ title: "儲存失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const applyDraft = (d: LocalDraft) => {
    if (d.kind !== "team") return;
    setTeamInput(String(d.teamNumber));
    setValues(d.values ?? {});
    toast({ title: "已套用暫存", description: `隊伍 ${d.teamNumber} 暫存內容已載入表單` });
  };

  return (
    <AppShell>
      <div className="grid gap-4 sm:gap-6">
        <SectionHeader
          title="隊伍資料"
          description="搜尋隊伍編號，檢視與編輯隊伍資料（動態欄位），並同時查看該隊所有比賽紀錄。"
          right={
            <div className="flex items-center gap-2">
              <LocalDrafts
                onApplyDraft={applyDraft}
                onSyncAll={async () => {
                  toast({ title: "提示", description: "請到「設定」頁使用「匯出到試算表」進行同步。" });
                }}
              />
              <Link href="/#/settings" className="hidden sm:inline-flex">
                <Button data-testid="teams-go-settings" variant="secondary" className="rounded-xl">
                  前往設定
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          }
        />

        <Card className="glass-panel neon-ring rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="font-display">隊伍查詢</CardTitle>
            <CardDescription>輸入隊伍編號後，會載入該隊的隊伍資料與比賽列表。</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="teams-search-input"
                    className="rounded-xl pl-9"
                    inputMode="numeric"
                    placeholder="輸入隊伍編號（例如 254）"
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button
                  data-testid="teams-search-btn"
                  className="rounded-xl hover-lift"
                  onClick={handleLoadTeam}
                >
                  查詢
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  data-testid="teams-sync-form"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={syncFromServerToForm}
                  disabled={!teamNumber || !teamQ.data}
                >
                  從資料庫填入表單
                </Button>

                <div className="inline-flex rounded-xl border border-border/70 bg-card/30 p-1">
                  <button
                    data-testid="teams-save-mode-direct"
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
                    data-testid="teams-save-mode-local"
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
                  data-testid="teams-save-btn"
                  className="rounded-xl hover-lift"
                  onClick={handleSave}
                  disabled={!teamNumber || fieldsQ.isLoading || upsertTeam.isPending}
                >
                  {saveMode === "local" ? <UploadCloud className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {upsertTeam.isPending ? "儲存中…" : saveMode === "local" ? "暫存" : "儲存"}
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {!teamNumber ? (
              <EmptyState
                icon={<FileX2 className="h-6 w-6 text-muted-foreground" />}
                title="尚未選擇隊伍"
                description="輸入隊伍編號後就能開始記錄。你也可以先在設定頁建立評分項目。"
                testId="teams-empty-no-team"
              />
            ) : fieldsQ.isLoading ? (
              <LoadingState title="載入欄位中…" subtitle="正在取得隊伍評分項目設定。" />
            ) : fieldsQ.error ? (
              <ErrorState message={String((fieldsQ.error as any)?.message ?? fieldsQ.error)} onRetry={() => fieldsQ.refetch()} />
            ) : (
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger data-testid="teams-tab-edit" value="edit" className="rounded-lg">
                    編輯隊伍資料
                  </TabsTrigger>
                  <TabsTrigger data-testid="teams-tab-view" value="view" className="rounded-lg">
                    查看資料庫內容
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="mt-4">
                  <DynamicEntryForm
                    fields={fieldsQ.data ?? []}
                    values={values}
                    onChange={setValues}
                    testIdPrefix="teams-field"
                  />
                </TabsContent>

                <TabsContent value="view" className="mt-4">
                  {teamQ.isLoading ? (
                    <LoadingState title="載入隊伍資料…" subtitle={`正在讀取隊伍 ${teamNumber} 的資料。`} />
                  ) : teamQ.error ? (
                    <ErrorState message={String((teamQ.error as any)?.message ?? teamQ.error)} onRetry={() => teamQ.refetch()} />
                  ) : (
                    <div className="grid gap-4">
                      <Card className="rounded-2xl border-border/70 bg-card/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="font-display">隊伍 {teamNumber}（資料庫）</CardTitle>
                          <CardDescription>顯示目前後端資料庫中的 values。</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid gap-2">
                            {enabledTeamFields.length === 0 ? (
                              <p className="text-sm text-muted-foreground">尚無啟用欄位。</p>
                            ) : (
                              enabledTeamFields.map((f) => {
                                const v = (currentTeam?.values as any)?.[f.key];
                                return (
                                  <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">{f.label}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{f.key}</p>
                                    </div>
                                    <div className="text-right">
                                      {f.inputType === "grade" && typeof v === "string" ? (
                                        <GradeBadge grade={v as any} />
                                      ) : (
                                        <p className="text-sm text-foreground/90">{v == null ? "—" : String(v)}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border-border/70 bg-card/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="font-display">該隊比賽列表</CardTitle>
                          <CardDescription>點「每場比賽」可編輯各場資料。</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {matchRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">尚未有比賽資料。</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>場次</TableHead>
                                  <TableHead className="hidden md:table-cell">values</TableHead>
                                  <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {matchRows.map((m) => (
                                  <TableRow key={m.id}>
                                    <TableCell className="font-display">第 {m.matchNumber} 場</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      <span className="text-xs text-muted-foreground font-mono line-clamp-1">
                                        {JSON.stringify(m.values ?? {})}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Link
                                        href={`/#/matches?team=${teamNumber}&match=${m.matchNumber}`}
                                        data-testid={`teams-go-match-${m.matchNumber}`}
                                        className="inline-flex"
                                      >
                                        <Button variant="secondary" className="rounded-xl">
                                          前往
                                          <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                      </Link>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
