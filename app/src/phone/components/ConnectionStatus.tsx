import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import { supabase, supabaseConfigured } from "../../lib/supabase";

type Status = "connected" | "connecting" | "disconnected";

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(
    supabaseConfigured ? "connecting" : "disconnected",
  );

  useEffect(() => {
    if (!supabaseConfigured) return;

    // Use a lightweight presence channel to detect connectivity
    const channel = supabase.channel("phone-heartbeat").subscribe((s: string) => {
      if (s === "SUBSCRIBED") setStatus("connected");
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("disconnected");
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const colorMap: Record<Status, "success" | "warning" | "error"> = {
    connected: "success",
    connecting: "warning",
    disconnected: "error",
  };

  return (
    <Chip
      size="small"
      label={status}
      color={colorMap[status]}
      sx={{ textTransform: "capitalize" }}
    />
  );
}
