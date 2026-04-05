import { useEffect, useState, useCallback, useRef } from "react";
import { api, type DiscoverPack, type EntitlementRecord } from "../lib/api";

interface UseEntitlementsReturn {
  entitlements: EntitlementRecord[];
  loading: boolean;
  entitled: (packId: string) => boolean;
  install: (packId: string) => Promise<void>;
  remove: (packId: string) => Promise<void>;
  refresh: () => void;
}

export function useEntitlements(): UseEntitlementsReturn {
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.myEntitlements()
      .then((data) => { if (mountedRef.current) setEntitlements(data); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  const entitled = useCallback(
    (packId: string) => entitlements.some((e) => e.pack_id === packId),
    [entitlements],
  );

  const install = useCallback(async (packId: string) => {
    await api.installPack(packId);
    refresh();
  }, [refresh]);

  const remove = useCallback(async (packId: string) => {
    await api.removePack(packId);
    refresh();
  }, [refresh]);

  return { entitlements, loading, entitled, install, remove, refresh };
}
