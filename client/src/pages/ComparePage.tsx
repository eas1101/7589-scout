import { useMemo, useState } from "react";
import { GitCompare, Table2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import TeamComparePicker from "@/components/TeamComparePicker";
import { useAggregate } from "@/hooks/use-analytics";
import { useFields } from "@/hooks/use-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

export default function ComparePage() {
  const [teamNumbers, setTeamNumbers] = useState<number[]>([]);
  const teamFieldsQ = useFields("team");
  const matchFieldsQ = useFields("match");

  const aggQ = useAggregate(teamNumbers.length ? teamNumbers : undefined);

  const allFields = useMemo(() => {
    const merged = [
      ...(teamFieldsQ.data ?? []).map((f: any) => ({ ...f, _scope: "team" as const })),
      ...(matchFieldsQ.data ?? []).map((f: any) => ({ ...f, _scope: "match" as const })),
    ];
    return merged.filter((f) => (f.enabled ?? 1) === 1 && (f.inputType === "grade" || f.inputType === "number"));
  }, [teamFieldsQ.data, matchFieldsQ.data]);

  const [fieldKey, setFieldKey] = useState("");
  const selectedField = useMemo(() => allFields.find((f) => f.key === fieldKey) ?? allFields[0], [allFields, fieldKey]);

  const tableData = useMemo(() => {
    const list = aggQ.data ?? [];
    return list
      .slice()
      .filter((r) => (teamNumbers.length ? teamNumbers.includes(r.teamNumber) : true))
      .sort((a, b) => a.teamNumber - b.teamNumber);
  }, [aggQ.data, teamNumbers]);

  const chartData = useMemo(() => {
    if (!selectedField) return [];
    const k = selectedField.key;
    const col = selectedField._scope === "team" ? "teamAverages" : "matchAverages";
    return tableData.map((r) => ({
      teamNumber: r.teamNumber,
      value: (r as any)[col]?.[k] ?? null,
    }));
  }, [selectedField, tableData]);

  return (
    <AppShell>
      <div className="grid gap-4 sm:gap-6">
        <SectionHeader
          title="隊伍比較"
          description="最多 8 隊比較。可選擇欄位後，查看平均值比較表與柱狀圖。"
        />

        <TeamComparePicker value={teamNumbers} onChange={setTeamNumbers} />

        <Card className="glass-panel neon-ring rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <CardTitle className="font-display">比較欄位</CardTitle>
                <CardDescription>選擇要比較的欄位（number / grade 平均）。</CardDescription>
              </div>
              <Select value={selectedField?.key ?? ""} onValueChange={(v) => setFieldKey(v)}>
                <SelectTrigger data-testid="compare-field-select" className="rounded-xl w-[320px]">
                  <SelectValue placeholder="選擇欄位" />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map((f) => (
                    <SelectItem key={`${f._scope}-${f.key}`} value={f.key}>
                      {f.label}（{f._scope === "team" ? "隊伍" : "比賽"}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="my-4" />

            {teamFieldsQ.isLoading || matchFieldsQ.isLoading || aggQ.isLoading ? (
              <LoadingState title="載入比較資料…" subtitle="正在取得欄位與統計結果。" />
            ) : aggQ.error ? (
              <ErrorState message={String((aggQ.error as any)?.message ?? aggQ.error)} onRetry={() => aggQ.refetch()} />
            ) : allFields.length === 0 ? (
              <EmptyState
                icon={<GitCompare className="h-6 w-6 text-muted-foreground" />}
                title="沒有可比較的欄位"
                description="請到設定頁建立 number 或 grade 的欄位，並確保 enabled=1。"
                testId="compare-empty-no-fields"
              />
            ) : teamNumbers.length === 0 ? (
              <EmptyState
                icon={<GitCompare className="h-6 w-6 text-muted-foreground" />}
                title="請先加入隊伍"
                description="上方輸入隊伍編號加入比較清單（最多 8 隊）。"
                testId="compare-empty-no-teams"
              />
            ) : chartData.every((d) => d.value == null) ? (
              <EmptyState
                icon={<Table2 className="h-6 w-6 text-muted-foreground" />}
                title="目前沒有可比較的數值"
                description="該欄位在所選隊伍中尚未有平均值。請先新增隊伍/比賽資料。"
                testId="compare-empty-no-values"
              />
            ) : (
              <div className="grid gap-5">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
                      <Bar dataKey="value" name={selectedField?.label ?? "平均"} fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-border/70 overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 bg-card/40 px-4 py-3 text-sm font-semibold">
                    <div>隊伍</div>
                    <div className="col-span-2">平均值（選擇欄位）</div>
                    <div className="text-right">比賽數</div>
                  </div>
                  <div className="divide-y divide-border/70">
                    {tableData
                      .filter((r) => teamNumbers.includes(r.teamNumber))
                      .map((r) => {
                        const k = selectedField!.key;
                        const col = selectedField!._scope === "team" ? "teamAverages" : "matchAverages";
                        const v = (r as any)[col]?.[k] ?? null;
                        return (
                          <div key={r.teamNumber} className="grid grid-cols-4 gap-0 px-4 py-3 text-sm">
                            <div className="font-display">#{r.teamNumber}</div>
                            <div className="col-span-2 text-foreground/90">
                              {v == null ? <span className="text-muted-foreground">—</span> : (v as number).toFixed(2)}
                            </div>
                            <div className="text-right text-muted-foreground">{r.matchCount}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
