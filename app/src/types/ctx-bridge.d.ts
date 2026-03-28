/** Electron preload bridge exposed on window.orchard */
interface CtxBridge {
  getVersion?: () => Promise<string>;
  openExternal?: (url: string) => Promise<void>;
  getPlatform?: () => string;
  getArch?: () => string;
  pickDirectory?: () => Promise<string | null>;
  getPathForFile?: (file: File) => string;
  getUiError?: () => Promise<string | null>;
  repairUi?: () => Promise<{ success: boolean; error?: string }>;
  resetUi?: () => Promise<{ success: boolean; error?: string }>;
  updateUi?: () => Promise<unknown>;
  retryBoot?: () => Promise<void>;
  openLogs?: () => Promise<void>;
  lockApp?: () => Promise<void>;
  unlockApp?: () => Promise<void>;
  getLockState?: () => Promise<boolean>;
  getLockSnapshot?: () => Promise<Record<string, unknown> | null>;
  saveBootTheme?: (theme: Record<string, string>) => Promise<void>;
  getBootTheme?: () => Promise<Record<string, string> | null>;
  onBootProgress?: (cb: (event: unknown, data: unknown) => void) => void;
  fullRestart?: () => Promise<void>;
  windowClose?: () => void;
  windowMinimize?: () => void;
  windowMaximize?: () => void;
}

interface ViewerTarget {
  title?: string;
  pid?: number;
  app?: string;
  bundleId?: string;
}

interface ViewerRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewerBridge {
  listWindows: () => Promise<
    Array<{ title: string; pid?: number; app?: string; region: ViewerRegion }>
  >;
  attach: (
    target: ViewerTarget,
    region: ViewerRegion,
  ) => Promise<{ ok: boolean; error?: string }>;
  updateRegion: (region: ViewerRegion) => Promise<{ ok: boolean }>;
  detach: () => Promise<{ ok: boolean }>;
  isAttached: () => Promise<boolean>;
  relayClick: (event: {
    localX: number;
    localY: number;
    button: "left" | "right" | "middle";
    type: "click" | "double_click";
  }) => Promise<boolean>;
  relayScroll: (event: {
    localX: number;
    localY: number;
    deltaX: number;
    deltaY: number;
  }) => Promise<boolean>;
  relayType: (event: { text: string }) => Promise<boolean>;
  relayKey: (event: { key: string; modifiers?: string[] }) => Promise<boolean>;
  screenshot: () => Promise<string>;
  snapshot: () => Promise<Record<string, unknown>>;
  click: (
    localX: number,
    localY: number,
    button?: "left" | "right",
  ) => Promise<{ ok: boolean }>;
  type: (text: string) => Promise<{ ok: boolean }>;
  status: () => Promise<{
    active: boolean;
    target: { title?: string; pid?: number } | null;
    region: ViewerRegion | null;
  }>;
  onDetached: (cb: () => void) => void;
}

interface Window {
  ctx: CtxBridge & { viewer?: ViewerBridge };
  orchard: CtxBridge & { viewer?: ViewerBridge };
}
