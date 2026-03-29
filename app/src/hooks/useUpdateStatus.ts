import { useEffect, useState } from "react";
import { api, type UpdateStatus } from "../lib/api";
import { useChannelEvent } from "./useChannelEvent";
import { useDashboardChannel } from "./useDashboardChannel";

const EMPTY: UpdateStatus = {
  branch: "unknown",
  sha: "",
  ahead: 0,
  behind: 0,
  dirty: false,
  state: "unknown",
  lastCheckedAt: "",
  autoUpdated: false,
};

export function useUpdateStatus(): UpdateStatus {
  const [statusLocal, setStatusLocal] = useState<UpdateStatus>(EMPTY);
  const { channel } = useDashboardChannel();
  const channelStatus = useChannelEvent<UpdateStatus>(channel, "status:updated");

  useEffect(() => {
    let cancelled = false;
    api.updates().then((s) => {
      if (!cancelled) setStatusLocal(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return channelStatus ?? statusLocal;
}
