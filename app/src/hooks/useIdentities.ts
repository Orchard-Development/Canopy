import { useEffect, useState } from "react";
import { api, type IdentitySnapshot } from "../lib/api";

const EMPTY: IdentitySnapshot = {
  github: { provider: "github", status: "unknown" },
  cursor: { provider: "cursor", status: "unknown" },
  aws: { provider: "aws", status: "unknown" },
  updatedAt: new Date(0).toISOString(),
};

export function useIdentities(refreshMs = 60000) {
  const [data, setData] = useState<IdentitySnapshot>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const snapshot = await api.identities();
        if (!cancelled) setData(snapshot);
      } catch {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            github: { ...prev.github, status: "unknown" },
            cursor: { ...prev.cursor, status: "unknown" },
            aws: { ...prev.aws, status: "unknown" },
            updatedAt: new Date().toISOString(),
          }));
        }
      }
    };

    load().catch(() => {});
    const timer = window.setInterval(() => {
      load().catch(() => {});
    }, refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshMs]);

  return data;
}
