import type { ComponentType } from "react";
import type { FieldRendererProps } from "../../types/forms";

const renderers = new Map<string, ComponentType<FieldRendererProps>>();

/** Register a custom React component to render a specific field type. */
export function registerFieldRenderer(
  type: string,
  renderer: ComponentType<FieldRendererProps>,
): void {
  renderers.set(type, renderer);
}

/** Look up the custom renderer for a field type. Returns undefined for built-in types. */
export function getFieldRenderer(
  type: string,
): ComponentType<FieldRendererProps> | undefined {
  return renderers.get(type);
}
