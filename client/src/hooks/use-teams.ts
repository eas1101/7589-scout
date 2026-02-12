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

export function useTeams() {
  return useQuery({
    queryKey: [api.teams.list.path],
    queryFn: async () => {
      const data = getLocalData();
      return Object.values(data.teams || {});
    },
  });
}

export function useTeamFull(teamNumber?: number) {
  return useQuery({
    enabled: !!teamNumber,
    queryKey: [api.teams.get.path, teamNumber],
    queryFn: async () => {
      const data = getLocalData();
      const team = data.teams?.[teamNumber!] || null;
      const matches = Object.values(data.matches || {})
        .filter((m: any) => m.teamNumber === teamNumber)
        .sort((a: any, b: any) => a.matchNumber - b.matchNumber);
      return { team, matches };
    },
  });
}

export function useUpsertTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamNumber, values }: any) => {
      const data = getLocalData();
      if (!data.teams) data.teams = {};
      data.teams[teamNumber] = { teamNumber, values, id: teamNumber };
      saveLocalData(data);
      return data.teams[teamNumber];
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [api.teams.list.path] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, vars.teamNumber] });
    },
  });
}
