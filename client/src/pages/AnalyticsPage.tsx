import { useMemo, useState } from "react";
import { BarChart3, LineChart, Filter, FileX, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { useAggregate } from "@/hooks/use-analytics";
import { useFields } from "@/hooks/use-fields";
import { useTeamFull } from "@/hooks/use-teams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart as RLineChart,
  Line,
} from "recharts";

function gradeToNumber(grade: string, weights?: Record<string, number>) {
  if (!weights) return null;
  const n = weights[grade];
  return Number.isFinite(n) ? n : null;
}

export default function AnalyticsPage() {
  const [teamInput, setTeamInput] = useState("");
  const teamNumber = useMemo(() => {
    const n = Number(teamInput);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [teamInput]);

  const teamFieldsQ = useFields("team");
  const matchFieldsQ = useFields("match");

  const aggregateQ = useAggregate(undefined); // all teams
  const teamFullQ = useTeamFull(teamNumber);

  const allFields = useMemo(() => {
    const merged = [
      ...(teamFieldsQ.data ?? []).map((f: any) => ({ ...f, _scope: "team" as const })),
      ...(matchFieldsQ.data ?? []).map((f: any) => ({ ...f, _scope: "match" as const })),
    ];
    return merged.filter((f) => (f.enabled ?? 1) === 1);
  }, [teamFieldsQ.data, matchFieldsQ.data]);

  const numericEligible = useMemo(() => {
    return allFields.filter((f: any) => f.inputType === "number" || f.inputType === "grade");
  }, [allFields]);

  const [barFieldKey, setBarFieldKey] = useState<string>("");
  const [lineFieldKey, setLineFieldKey] = useState<string>("");

  const barField = useMemo(() => numericEligible.find((f) => f.key === barFieldKey) ?? numericEligible[0], [numericEligible, barFieldKey]);
  const lineField = useMemo(() => numericEligible.find((f) => f.key === lineFieldKey) ?? numericEligible[0], [numericEligible, lineFieldKey]);

  const barData = useMemo(() => {
    const list = aggregateQ.data ?? [];
    if (!barField) return [];
    const k = barField.key;
    const col = barField._scope === "team" ? "teamAverages" : "matchAverages";
    return list
      .map((r: any) => ({ teamNumber: r.teamNumber, value: (r as any)[col]?.[k] ?? null }))
      .filter((x: any) => x.value != null)
      .sort((a: any, b: any) => (b.value as number) - (a.value as number))
      .slice(0, 24);
  }, [aggregateQ.data, barField]);

  const lineData = useMemo(() => {
    if (!teamNumber || !lineField) return [];
    const matches = teamFullQ.data?.matches ?? [];
    const k = lineField.key;
    const rule = (lineField.scoringRule ?? {}) as any;

    return matches
      .slice()
      .sort((a: any, b: any) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
      .map((m: any) => {
        const raw = (m.values as any)?.[k];
        let v: number | null = null;
        if (lineField.inputType === "number") v = typeof raw === "number" ? raw : raw == null ? null : Number(raw);
        if (lineField.inputType === "grade") v = typeof raw === "string" ? gradeToNumber(raw, rule.weights) : null;
        return { matchNumber: m.matchNumber, value: v };
      })
      .filter((x: any) => Number.isFinite(x.matchNumber));
  }, [teamFullQ.data?.matches, teamNumber, lineField]);

  return (
    <AppShell>
      <div className="grid gap-4 sm:gap-6">
        <SectionHeader
          title="數據分析"
          description="查看平均值與圖表：各隊欄位平均（柱狀圖）與單隊隨場次變化（折線圖）。"
          right={
            <div className="flex items-center gap-2">
              <Link href="/#/compare" className="hidden sm:inline-flex">
                <Button data-testid="analytics-go-compare" variant="secondary" className="rounded-xl">
                  前往隊伍比較
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          }
        />

        <Card className="glass-panel neon-ring rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="font-display">全隊平均（柱狀圖）</CardTitle>
                <CardDescription>選擇欄位後，顯示各隊平均值（只取有資料的隊伍）。</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/30 px-3 py-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">欄位</span>
                </div>
                <Select
                  value={barField?.key ?? ""}
                  onValueChange={(v) => setBarFieldKey(v)}
                >
                  <SelectTrigger data-testid="analytics-barfield" className="rounded-xl w-[280px]">
                    <SelectValue placeholder="選擇欄位" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericEligible.map((f) => (
                      <SelectItem key={`${f._scope}-${f.key}`} value={f.key}>
                        {f.label}（{f._scope === "team" ? "隊伍" : "比賽"}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Separator className="my-4" />
            {aggregateQ.isLoading || teamFieldsQ.isLoading || matchFieldsQ.isLoading ? (
              <LoadingState title="載入統計中…" subtitle="正在計算平均與繪圖資料。" />
            ) : aggregateQ.error ? (
              <ErrorState message={String((aggregateQ.error as any)?.message ?? aggregateQ.error)} onRetry={() => aggregateQ.refetch()} />
            ) : !barField ? (
              <EmptyState
                icon={<BarChart3 className="h-6 w-6 text-muted-foreground" />}
                title="尚無可用欄位"
                description="請先到設定頁建立 number 或 grade 的欄位，才能計算平均與繪圖。"
                testId="analytics-empty-no-fields"
              />
            ) : barData.length === 0 ? (
              <EmptyState
                icon={<FileX className="h-6 w-6 text-muted-foreground" />}
                title="目前沒有可繪製的資料"
                description="請先建立一些隊伍/比賽資料後再回來查看。"
                testId="analytics-empty-no-data"
              />
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="teamNumber" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsla(0,0%,50%,0.15)",
                        background: "hsla(0,0%,10%,0.75)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" name={barField.label} fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel neon-ring rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div>
                <CardTitle className="font-display">單隊走勢（折線圖）</CardTitle>
                <CardDescription>輸入隊伍編號，選擇欄位後顯示該隊每場比賽的變化。</CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input
                  data-testid="analytics-team-input"
                  className="rounded-xl w-[200px]"
                  inputMode="numeric"
                  placeholder="隊伍編號（例如 1678）"
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value.replace(/[^\d]/g, ""))}
                />
                <Select
                  value={lineField?.key ?? ""}
                  onValueChange={(v) => setLineFieldKey(v)}
                  disabled={!teamNumber}
                >
                  <SelectTrigger data-testid="analytics-linefield" className="rounded-xl w-[280px]">
                    <SelectValue placeholder="選擇欄位" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericEligible
                      .filter((f) => f._scope === "match")
                      .map((f) => (
                        <SelectItem key={`${f._scope}-${f.key}`} value={f.key}>
                          {f.label}（比賽）
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="my-4" />

            {!teamNumber ? (
              <EmptyState
                icon={<LineChart className="h-6 w-6 text-muted-foreground" />}
                title="請輸入隊伍編號"
                description="輸入後即可查看該隊的比賽走勢與下方比賽列表。"
                testId="analytics-empty-team"
              />
            ) : teamFullQ.isLoading ? (
              <LoadingState title="載入隊伍比賽資料…" subtitle={`正在讀取隊伍 ${teamNumber} 的每場資料。`} />
            ) : teamFullQ.error ? (
              <ErrorState message={String((teamFullQ.error as any)?.message ?? teamFullQ.error)} onRetry={() => teamFullQ.refetch()} />
            ) : lineData.length === 0 ? (
              <EmptyState
                icon={<FileX className="h-6 w-6 text-muted-foreground" />}
                title="沒有足夠的比賽資料"
                description="該隊尚未建立任何比賽紀錄，或欄位沒有數值可用。"
                testId="analytics-empty-line"
                action={
                  <Link href={`/#/matches?team=${teamNumber}`} className="inline-flex">
                    <Button data-testid="analytics-go-matches" className="rounded-xl hover-lift">
                      前往建立比賽資料
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={lineData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="matchNumber" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsla(0,0%,50%,0.15)",
                        background: "hsla(0,0%,10%,0.75)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={lineField?.label ?? "欄位"}
                      stroke="hsl(var(--accent))"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 7 }}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            )}

            {teamNumber ? (
              <div className="mt-5 rounded-2xl border border-border/70 bg-card/30 p-4">
                <p className="font-display text-lg">比賽列表（可點開查看 / 編輯）</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  下面顯示該隊每場比賽的 values 概覽。點「前往」可在每場比賽頁編輯。
                </p>

                <div className="mt-4 grid gap-2">
                  {(teamFullQ.data?.matches ?? [])
                    .slice()
                    .sort((a: any, b: any) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
                    .map((m: any) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="font-display">第 {m.matchNumber} 場</p>
                          <p className="text-xs text-muted-foreground font-mono line-clamp-1">
                            {JSON.stringify(m.values ?? {})}
                          </p>
                        </div>
                        <Link
                          href={`/#/matches?team=${teamNumber}&match=${m.matchNumber}`}
                          data-testid={`analytics-open-match-${m.matchNumber}`}
                          className="inline-flex"
                        >
                          <Button variant="secondary" className="rounded-xl">
                            前往
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  {(teamFullQ.data?.matches ?? []).length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">尚無比賽資料。</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
