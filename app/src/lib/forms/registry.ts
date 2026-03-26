import type { FormDef } from "../../types/forms";

const registry = new Map<string, FormDef>();

export function registerForm(def: FormDef): void {
  registry.set(def.type, def);
}

export function getForm(type: string): FormDef | undefined {
  return registry.get(type);
}

export function listForms(): FormDef[] {
  return Array.from(registry.values());
}
