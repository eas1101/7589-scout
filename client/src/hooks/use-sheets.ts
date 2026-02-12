import { useMutation, useQueryClient } from "@tanstack/react-query";

const LS_KEY = "frc_scout_data";

function getLocalData() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : { settings: null, fields: [], teams: {}, matches: {} };
}

function saveLocalData(data: any) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function useExportAllToSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const local = getLocalData();
      const settings = local.settings;
      if (!settings?.sheetsEndpointUrl) {
        throw new Error("請先在設定頁面填寫 Apps Script URL");
      }

      // Convert local state to a format Apps Script expects
      const payload = {
        action: "export",
        token: settings.apiToken,
        data: local
      };

      const res = await fetch(settings.sheetsEndpointUrl, {
        method: "POST",
        mode: "no-cors", // Apps Script often requires no-cors for simple POST
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      // Note: with no-cors we can't read the response body, 
      // but the data is sent. For real feedback, one would use JSONP or a proxy.
      return { ok: true };
    }
  });
}

export function useImportAllFromSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const local = getLocalData();
      const settings = local.settings;
      if (!settings?.sheetsEndpointUrl) {
        throw new Error("請先在設定頁面填寫 Apps Script URL");
      }

      const res = await fetch(`${settings.sheetsEndpointUrl}?action=import&token=${encodeURIComponent(settings.apiToken || "")}`);
      if (!res.ok) throw new Error("從試算表讀取失敗");
      
      const remoteData = await res.json();
      if (remoteData) {
        saveLocalData({ ...local, ...remoteData });
      }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries();
    }
  });
}
