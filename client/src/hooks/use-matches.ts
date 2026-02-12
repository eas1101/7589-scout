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

export function useMatchesByTeam(teamNumber?: number) {
  return useQuery({
    enabled: !!teamNumber,
    queryKey: [api.matches.listByTeam.path, teamNumber],
    queryFn: async () => {
      const data = getLocalData();
      return Object.values(data.matches || {})
        .filter((m: any) => m.teamNumber === teamNumber)
        .sort((a: any, b: any) => a.matchNumber - b.matchNumber);
    },
  });
}

export function useUpsertMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamNumber, matchNumber, values }: any) => {
      const data = getLocalData();
      if (!data.matches) data.matches = {};
      const key = `${teamNumber}_${matchNumber}`;
      data.matches[key] = { teamNumber, matchNumber, values, id: key };
      saveLocalData(data);
      return data.matches[key];
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [api.matches.listByTeam.path, vars.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, vars.teamNumber] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamNumber, matchNumber }: any) => {
      const data = getLocalData();
      const key = `${teamNumber}_${matchNumber}`;
      if (data.matches) delete data.matches[key];
      saveLocalData(data);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [api.matches.listByTeam.path, vars.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, vars.teamNumber] });
    },
  });
}
