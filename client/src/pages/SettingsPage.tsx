import { useEffect, useMemo, useState } from "react";
import { Save, UploadCloud, DownloadCloud, Shield, Link2, Settings2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import ScoringFieldEditor from "@/components/ScoringFieldEditor";
import { useSettings, useUpsertSettings } from "@/hooks/use-settings";
import { useExportAllToSheets, useImportAllFromSheets } from "@/hooks/use-sheets";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { toast } = useToast();
  const settingsQ = useSettings();
  const upsert = useUpsertSettings();
  const exportAll = useExportAllToSheets();
  const importAll = useImportAllFromSheets();

  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const s = settingsQ.data;
    setEndpoint(s?.sheetsEndpointUrl ?? "");
    setToken(s?.apiToken ?? "");
  }, [settingsQ.data]);

  const dirty = useMemo(() => {
    const s = settingsQ.data;
    return endpoint !== (s?.sheetsEndpointUrl ?? "") || token !== (s?.apiToken ?? "");
  }, [endpoint, token, settingsQ.data]);

  const save = async () => {
    try {
      await upsert.mutateAsync({
        sheetsEndpointUrl: endpoint,
        apiToken: token || null,
      } as any);
      toast({ title: "已儲存設定", description: "Google 試算表連結已更新。" });
    } catch (e: any) {
      toast({ title: "儲存失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const runExport = async () => {
    try {
      await exportAll.mutateAsync();
      toast({ title: "匯出完成", description: "已觸發匯出流程（後端將同步至試算表）。" });
    } catch (e: any) {
      toast({ title: "匯出失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const runImport = async () => {
    try {
      await importAll.mutateAsync();
      toast({ title: "匯入完成", description: "已觸發匯入流程（後端將拉回試算表資料）。" });
    } catch (e: any) {
      toast({ title: "匯入失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <div className="grid gap-4 sm:gap-6">
        <SectionHeader
          title="設定"
          description="連結 Google 試算表（Apps Script Web App URL），管理評分項目與計分規則。也可手動匯入/匯出同步。"
          right={
            <div className="flex items-center gap-2">
              <Button
                data-testid="settings-export"
                className="rounded-xl hover-lift"
                onClick={runExport}
                disabled={exportAll.isPending}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                {exportAll.isPending ? "匯出中…" : "匯出到試算表"}
              </Button>
              <Button
                data-testid="settings-import"
                variant="secondary"
                className="rounded-xl"
                onClick={runImport}
                disabled={importAll.isPending}
              >
                <DownloadCloud className="h-4 w-4 mr-2" />
                {importAll.isPending ? "匯入中…" : "從試算表匯入"}
              </Button>
            </div>
          }
        />

        <Card className="glass-panel neon-ring rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="font-display">Google 試算表連結</CardTitle>
            <CardDescription>
              Apps Script Web App URL 用於 GitHub Pages 呼叫；Token 為可選，若 Apps Script 有驗證可用。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {settingsQ.isLoading ? (
              <LoadingState title="載入設定…" subtitle="正在取得設定資料。" />
            ) : settingsQ.error ? (
              <ErrorState message={String((settingsQ.error as any)?.message ?? settingsQ.error)} onRetry={() => settingsQ.refetch()} />
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="inline-flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Apps Script Web App URL
                  </Label>
                  <Input
                    data-testid="settings-endpoint"
                    className="rounded-xl"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://script.google.com/macros/s/XXXXX/exec"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    建議使用「部署為 Web App」並允許你的用戶存取。後端會使用此 URL 作為 proxy 同步。
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    API Token（可選）
                  </Label>
                  <Input
                    data-testid="settings-token"
                    className="rounded-xl font-mono"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="(可留空)"
                  />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="rounded-2xl border border-border/70 bg-card/30 p-4 flex-1">
                    <p className="font-display text-lg inline-flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-primary" />
                      同步說明
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      若你在離線狀態用「先暫存」記錄資料，回到這裡按「匯出到試算表」即可同步（後端將整批寫入）。
                    </p>
                  </div>

                  <Button
                    data-testid="settings-save"
                    className="rounded-xl hover-lift"
                    onClick={save}
                    disabled={!dirty || upsert.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {upsert.isPending ? "儲存中…" : "儲存設定"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="fields" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger data-testid="settings-tab-fields" value="fields" className="rounded-lg">
              評分項目管理
            </TabsTrigger>
            <TabsTrigger data-testid="settings-tab-rules" value="rules" className="rounded-lg">
              計分方式（scoringRule）
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-4 grid gap-4 sm:gap-6">
            <ScoringFieldEditor scope="team" />
            <ScoringFieldEditor scope="match" />
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card className="glass-panel neon-ring rounded-2xl border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="font-display">計分方式管理（高階）</CardTitle>
                <CardDescription>
                  scoringRule 會直接存到每個 scoringField。此區提供「規則範本」備忘，方便複製貼上。
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
                    <p className="font-display text-lg">Grade 轉數值（範例）</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      用於平均值計算：請在 scoringRule.weights 填入 S~F 對應分數。
                    </p>
                    <Textarea
                      data-testid="settings-rule-template-grade"
                      className="mt-3 rounded-xl font-mono min-h-[170px]"
                      value={JSON.stringify(
                        {
                          mode: "grade",
                          weights: { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
                        },
                        null,
                        2,
                      )}
                      readOnly
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
                      <p className="font-display text-lg">Number（範例）</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        純數字欄位：後端聚合會直接取平均。
                      </p>
                      <Textarea
                        data-testid="settings-rule-template-number"
                        className="mt-3 rounded-xl font-mono min-h-[150px]"
                        value={JSON.stringify({ mode: "number" }, null, 2)}
                        readOnly
                      />
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
                      <p className="font-display text-lg">Text（範例）</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        文字欄位通常不做平均；可保留 mode=text 方便辨識。
                      </p>
                      <Textarea
                        data-testid="settings-rule-template-text"
                        className="mt-3 rounded-xl font-mono min-h-[150px]"
                        value={JSON.stringify({ mode: "text" }, null, 2)}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
                    <p className="font-display text-lg">自定義擴充</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      你可以把 scoringRule 設計得更複雜，例如加上權重、封頂、或分段計分。
                      前端會保留 JSON；統計平均則依後端 /api/analytics/aggregate 的實作為準。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
