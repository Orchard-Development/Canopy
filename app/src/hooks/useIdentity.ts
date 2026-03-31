import { useEffect, useState } from "react";
import { fetchSettings } from "../lib/settingsCache";

interface UserIdentity {
  displayName: string;
  avatarBase64: string;
  avatarUrl: string;
}

/**
 * Fetches the current user's display_name, avatar_base64, and avatar_url from settings.
 * Returns null until loaded, or if no display_name is configured.
 */
export function useIdentity(): UserIdentity | null {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSettings()
      .then((data) => {
        if (cancelled) return;
        const name = data.display_name;
        if (name) {
          setIdentity({
            displayName: name,
            avatarBase64: data.avatar_base64 ?? "",
            avatarUrl: data.avatar_url ?? "",
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
}
