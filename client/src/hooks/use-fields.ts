import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const LS_KEY = "frc_scout_data";

function getLocalData() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : { settings: null, fields: [], teams: {}, matches: {} };
}

function saveLocalData(data: any) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function useFields(scope?: "team" | "match") {
  return useQuery({
    queryKey: [api.fields.list.path, scope ?? "all"],
    queryFn: async () => {
      const data = getLocalData();
      let fields = data.fields || [];
      if (scope) {
        fields = fields.filter((f: any) => f.scope === scope);
      }
      return fields.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    },
  });
}

export function useCreateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: any) => {
      const data = getLocalData();
      const newField = { ...req, id: Date.now() };
      data.fields.push(newField);
      saveLocalData(data);
      return newField;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
    },
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const data = getLocalData();
      const idx = data.fields.findIndex((f: any) => f.id === id);
      if (idx !== -1) {
        data.fields[idx] = { ...data.fields[idx], ...updates };
        saveLocalData(data);
        return data.fields[idx];
      }
      throw new Error("Field not found");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
    },
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const data = getLocalData();
      data.fields = data.fields.filter((f: any) => f.id !== id);
      saveLocalData(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
    },
  });
}
