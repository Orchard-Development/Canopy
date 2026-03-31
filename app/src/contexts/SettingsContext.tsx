import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { fetchSettings, invalidateSettingsCache } from "../lib/settingsCache";

interface SecretStatus {
  name: string;
  source: string | null;
  configured: boolean;
}

interface SettingsContextValue {
  settings: Record<string, string>;
  setSetting: (key: string, value: string) => void;
  setAllSettings: (s: Record<string, string>) => void;
  version: number;
  managedProviders: Set<string>;
  refreshSecrets: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  setSetting: () => {},
  setAllSettings: () => {},
  version: 0,
  managedProviders: new Set(),
  refreshSecrets: () => {},
});

const PROVIDER_SECRET_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

function deriveManagedProviders(statuses: SecretStatus[]): Set<string> {
  const managed = new Set<string>();
  for (const [provider, secretName] of Object.entries(PROVIDER_SECRET_MAP)) {
    const entry = statuses.find((s) => s.name === secretName);
    if (entry?.source?.startsWith("orchard_managed:")) {
      managed.add(provider);
    }
  }
  return managed;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [secretsVersion, setSecretsVersion] = useState(0);
  const [managedProviders, setManagedProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/secrets/status")
      .then((r) => r.json())
      .then((statuses: SecretStatus[]) => {
        setManagedProviders(deriveManagedProviders(statuses));
      })
      .catch(() => {});
  }, [secretsVersion]);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setVersion((v) => v + 1);
    invalidateSettingsCache();
  }, []);

  const refreshSecrets = useCallback(() => {
    setSecretsVersion((v) => v + 1);
  }, []);

  const setAllSettings = useCallback((s: Record<string, string>) => {
    setSettings(s);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSetting, setAllSettings, version, managedProviders, refreshSecrets }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  return useContext(SettingsContext);
}
