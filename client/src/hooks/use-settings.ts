import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

// Helper for local storage
const LS_KEY = "frc_scout_data";

function getLocalData() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : { settings: null, fields: [], teams: {}, matches: {} };
}

function saveLocalData(data: any) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const data = getLocalData();
      return data.settings;
    },
  });
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: any) => {
      const data = getLocalData();
      data.settings = { ...data.settings, ...req, id: 1 };
      saveLocalData(data);
      return data.settings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
  });
}
