import { PropsWithChildren, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

/**
 * GitHub Pages 友善：使用 hash 作為路徑來源（/#/teams）
 * - 讓 refresh 不會 404
 * - 同時保留 wouter 的 routing
 */
export default function HashRouterBridge({ children }: PropsWithChildren) {
  const [location, setLocation] = useLocation();

  const hashPath = useMemo(() => {
    const h = window.location.hash || "";
    if (h.startsWith("#")) {
      const p = h.slice(1);
      return p.length ? p : "/";
    }
    return "/";
  }, [window.location.hash]);

  useEffect(() => {
    const applyHashToWouter = () => {
      const h = window.location.hash || "";
      const p = h.startsWith("#") ? h.slice(1) : h;
      const target = p.length ? p : "/";
      if (target !== location) setLocation(target);
    };

    const applyWouterToHash = () => {
      const target = location || "/";
      const desired = `#${target}`;
      if (window.location.hash !== desired) window.location.hash = desired;
    };

    applyHashToWouter();

    const onHash = () => applyHashToWouter();
    window.addEventListener("hashchange", onHash);

    // when wouter location changes, reflect to hash
    applyWouterToHash();

    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, setLocation]);

  // Ensure initial sync if user opened /#/something
  useEffect(() => {
    if (hashPath !== location) setLocation(hashPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
