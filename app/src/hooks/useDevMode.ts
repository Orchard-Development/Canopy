import { useState, useEffect, useContext, createContext } from "react";
import { usePersistedState } from "./usePersistedState";

interface DevModeState {
  /** Server is running in packaged (end-user) mode */
  packaged: boolean;
  /** User has explicitly enabled developer mode */
  devOverride: boolean;
  /** Effective dev mode -- true if NOT packaged, or user toggled override on */
  devMode: boolean;
  /** Toggle the developer mode override (only relevant in packaged builds) */
  setDevOverride: (on: boolean) => void;
}

export const DevModeContext = createContext<DevModeState>({
  packaged: false,
  devOverride: false,
  devMode: true,
  setDevOverride: () => {},
});

export function useDevMode(): DevModeState {
  return useContext(DevModeContext);
}

export function useDevModeProvider(): DevModeState {
  const [packaged, setPackaged] = useState(false);
  const [devOverride, setDevOverrideRaw] = usePersistedState<boolean>("dev_mode_override", false);
  const setDevOverride = (on: boolean) => setDevOverrideRaw(on);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.packaged) setPackaged(true);
      })
      .catch(() => {});
  }, []);

  const devMode = !packaged || devOverride;

  return { packaged, devOverride, devMode, setDevOverride };
}
