import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, Wand2 } from "lucide-react";
import type { ScoringFieldResponse } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCreateField, useDeleteField, useFields, useUpdateField } from "@/hooks/use-fields";

const keySchema = z.string().regex(/^[a-zA-Z0-9_]+$/, "key 只能使用英數與底線").min(1).max(64);

function prettyJson(v: unknown) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function ScoringFieldEditor({ scope }: { scope: "team" | "match" }) {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useFields(scope);
  const createMutation = useCreateField();
  const updateMutation = useUpdateField();
  const deleteMutation = useDeleteField();

  const fields = useMemo(() => {
    const list = (data ?? []).slice();
    list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);
    return list;
  }, [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newField, setNewField] = useState({
    label: "",
    key: "",
    inputType: "number" as "grade" | "number" | "text",
    enabled: true,
    order: fields.length ? (fields[fields.length - 1].order ?? 0) + 1 : 0,
    scoringRuleJson: prettyJson({ mode: "number" }),
  });

  useEffect(() => {
    setNewField((p) => ({
      ...p,
      order: fields.length ? (fields[fields.length - 1].order ?? 0) + 1 : 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const onCreate = async () => {
    try {
      keySchema.parse(newField.key);
      const scoringRule = JSON.parse(newField.scoringRuleJson || "{}");
      await createMutation.mutateAsync({
        scope,
        key: newField.key,
        label: newField.label.trim() || newField.key,
        inputType: newField.inputType,
        enabled: newField.enabled ? 1 : 0,
        order: newField.order,
        scoringRule,
      });
      toast({ title: "已新增", description: `已新增「${newField.label || newField.key}」` });
      setCreateOpen(false);
      setNewField((p) => ({
        ...p,
        label: "",
        key: "",
        scoringRuleJson: prettyJson({ mode: p.inputType }),
      }));
    } catch (e: any) {
      toast({ title: "新增失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const quickTemplate = (type: "grade" | "number" | "text") => {
    if (type === "grade") {
      return {
        mode: "grade",
        weights: { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
      };
    }
    if (type === "number") return { mode: "number" };
    return { mode: "text" };
  };

  return (
    <Card className="glass-panel neon-ring rounded-2xl border-border/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="font-display text-xl">評分項目（{scope === "team" ? "隊伍" : "比賽"}）</CardTitle>
            <CardDescription className="text-sm">
              動態表單欄位：可新增 / 編輯 / 刪除，並設定計分規則 scoringRule。
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              data-testid={`fields-refetch-${scope}`}
              variant="secondary"
              className="rounded-xl"
              onClick={() => refetch()}
            >
              重新整理
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid={`fields-create-open-${scope}`}
                  className="rounded-xl hover-lift"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增項目
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display">新增評分項目（{scope === "team" ? "隊伍" : "比賽"}）</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>顯示名稱 label</Label>
                      <Input
                        data-testid={`fields-create-label-${scope}`}
                        className="rounded-xl"
                        value={newField.label}
                        onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                        placeholder="例如：Auto 得分"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>欄位 key（英數底線）</Label>
                      <Input
                        data-testid={`fields-create-key-${scope}`}
                        className="rounded-xl font-mono"
                        value={newField.key}
                        onChange={(e) => setNewField((p) => ({ ...p, key: e.target.value }))}
                        placeholder="例如：auto_score"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>輸入類型 inputType</Label>
                      <Select
                        value={newField.inputType}
                        onValueChange={(v) => {
                          const vt = v as "grade" | "number" | "text";
                          setNewField((p) => ({
                            ...p,
                            inputType: vt,
                            scoringRuleJson: prettyJson(quickTemplate(vt)),
                          }));
                        }}
                      >
                        <SelectTrigger data-testid={`fields-create-inputType-${scope}`} className="rounded-xl">
                          <SelectValue placeholder="選擇類型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grade">評分（S~F）</SelectItem>
                          <SelectItem value="number">分數（數字）</SelectItem>
                          <SelectItem value="text">自定義輸入（文字）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>排序 order</Label>
                      <Input
                        data-testid={`fields-create-order-${scope}`}
                        className="rounded-xl"
                        type="number"
                        value={newField.order}
                        onChange={(e) => setNewField((p) => ({ ...p, order: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="flex items-end justify-between rounded-2xl border border-border/70 bg-card/30 px-4 py-3">
                      <div>
                        <Label className="text-sm">啟用 enabled</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">可暫時停用而不刪除</p>
                      </div>
                      <Switch
                        data-testid={`fields-create-enabled-${scope}`}
                        checked={newField.enabled}
                        onCheckedChange={(checked) => setNewField((p) => ({ ...p, enabled: checked }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>計分規則 scoringRule（JSON）</Label>
                      <Button
                        data-testid={`fields-create-template-${scope}`}
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => {
                          setNewField((p) => ({ ...p, scoringRuleJson: prettyJson(quickTemplate(p.inputType)) }));
                        }}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        套用範本
                      </Button>
                    </div>
                    <Textarea
                      data-testid={`fields-create-scoringRule-${scope}`}
                      className="rounded-xl font-mono min-h-[160px]"
                      value={newField.scoringRuleJson}
                      onChange={(e) => setNewField((p) => ({ ...p, scoringRuleJson: e.target.value }))}
                      placeholder='{"mode":"number"}'
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      建議：grade 模式請提供 weights（S~F 對應數值），以便統計平均。
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    data-testid={`fields-create-cancel-${scope}`}
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setCreateOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    data-testid={`fields-create-submit-${scope}`}
                    className="rounded-xl hover-lift"
                    onClick={onCreate}
                    disabled={createMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "新增中…" : "新增"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
            <div className="h-10 shimmer rounded-xl" />
            <div className="mt-2 h-10 shimmer rounded-xl" />
            <div className="mt-2 h-10 shimmer rounded-xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-display">讀取失敗</p>
            <p className="mt-1 text-sm text-muted-foreground">{String((error as any)?.message ?? error)}</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/30 p-6 text-sm text-muted-foreground">
            尚未建立任何評分項目。點右上角「新增項目」開始。
          </div>
        ) : (
          <div className="grid gap-3">
            {fields.map((f: any) => (
              <FieldRow
                key={f.id}
                field={f}
                onSave={async (patch) => {
                  await updateMutation.mutateAsync({ id: f.id, ...patch });
                  toast({ title: "已更新", description: `已更新「${f.label}」` });
                }}
                onDelete={async () => {
                  await deleteMutation.mutateAsync(f.id);
                  toast({ title: "已刪除", description: `已刪除「${f.label}」` });
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  onSave,
  onDelete,
}: {
  field: ScoringFieldResponse;
  onSave: (patch: Partial<ScoringFieldResponse>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [label, setLabel] = useState(field.label ?? "");
  const [key, setKey] = useState(field.key ?? "");
  const [inputType, setInputType] = useState(field.inputType as "grade" | "number" | "text");
  const [order, setOrder] = useState(field.order ?? 0);
  const [enabled, setEnabled] = useState((field.enabled ?? 1) === 1);
  const [ruleJson, setRuleJson] = useState(prettyJson(field.scoringRule ?? {}));

  useEffect(() => {
    setLabel(field.label ?? "");
    setKey(field.key ?? "");
    setInputType(field.inputType as any);
    setOrder(field.order ?? 0);
    setEnabled((field.enabled ?? 1) === 1);
    setRuleJson(prettyJson(field.scoringRule ?? {}));
  }, [field]);

  const dirty =
    label !== (field.label ?? "") ||
    key !== (field.key ?? "") ||
    inputType !== (field.inputType as any) ||
    order !== (field.order ?? 0) ||
    enabled !== ((field.enabled ?? 1) === 1) ||
    ruleJson !== prettyJson(field.scoringRule ?? {});

  const submit = async () => {
    try {
      keySchema.parse(key);
      const scoringRule = JSON.parse(ruleJson || "{}");
      await onSave({
        label: label.trim() || key,
        key,
        inputType,
        order,
        enabled: enabled ? 1 : 0,
        scoringRule,
      });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "更新失敗", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/35 p-4 hover-lift">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg leading-none">{field.label}</p>
            <span className="rounded-lg border border-border/70 bg-card/40 px-2 py-0.5 text-xs font-mono text-muted-foreground">
              {field.key}
            </span>
            <span className="rounded-lg border border-border/70 bg-card/40 px-2 py-0.5 text-xs text-muted-foreground">
              {field.inputType}
            </span>
            <span className="rounded-lg border border-border/70 bg-card/40 px-2 py-0.5 text-xs text-muted-foreground">
              order: {field.order ?? 0}
            </span>
            <span
              className={
                "rounded-lg px-2 py-0.5 text-xs border " +
                ((field.enabled ?? 1) === 1
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-card/40 text-muted-foreground")
              }
            >
              {(field.enabled ?? 1) === 1 ? "啟用" : "停用"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            scoringRule：<span className="font-mono">{JSON.stringify(field.scoringRule ?? {})}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid={`fields-edit-open-${field.id}`}
                variant="secondary"
                className="rounded-xl"
                onClick={() => setOpen(true)}
              >
                編輯
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">編輯評分項目</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>顯示名稱</Label>
                    <Input
                      data-testid={`fields-edit-label-${field.id}`}
                      className="rounded-xl"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>key</Label>
                    <Input
                      data-testid={`fields-edit-key-${field.id}`}
                      className="rounded-xl font-mono"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>輸入類型</Label>
                    <Select value={inputType} onValueChange={(v) => setInputType(v as any)}>
                      <SelectTrigger data-testid={`fields-edit-inputType-${field.id}`} className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grade">評分（S~F）</SelectItem>
                        <SelectItem value="number">分數（數字）</SelectItem>
                        <SelectItem value="text">自定義輸入（文字）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>排序 order</Label>
                    <Input
                      data-testid={`fields-edit-order-${field.id}`}
                      className="rounded-xl"
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end justify-between rounded-2xl border border-border/70 bg-card/30 px-4 py-3">
                    <div>
                      <Label className="text-sm">啟用</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">停用不會刪除資料</p>
                    </div>
                    <Switch
                      data-testid={`fields-edit-enabled-${field.id}`}
                      checked={enabled}
                      onCheckedChange={(c) => setEnabled(c)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label>scoringRule（JSON）</Label>
                  <Textarea
                    data-testid={`fields-edit-scoringRule-${field.id}`}
                    className="rounded-xl font-mono min-h-[180px]"
                    value={ruleJson}
                    onChange={(e) => setRuleJson(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <Button
                  data-testid={`fields-delete-${field.id}`}
                  variant="destructive"
                  className="rounded-xl"
                  onClick={async () => {
                    await onDelete();
                    setOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  刪除
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    data-testid={`fields-edit-cancel-${field.id}`}
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    data-testid={`fields-edit-save-${field.id}`}
                    className="rounded-xl hover-lift"
                    onClick={submit}
                    disabled={!dirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    儲存
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            data-testid={`fields-delete-quick-${field.id}`}
            variant="secondary"
            size="icon"
            className="rounded-xl"
            onClick={async () => {
              await onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
