import type { ComponentType } from "react";

export type FormFieldType =
  | "text" | "textarea" | "select" | "path" | "chips"
  | "dir-picker" | "url-action" | "chip-select" | "seed-packs" | "theme-picker";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDef {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  helperText?: string;
  options?: FormFieldOption[];
  /** Hide the field from the UI but include its value in submission. */
  hidden?: boolean;
  /** Auto-compute this field's value when the source field changes. */
  computeFrom?: {
    field: string;
    transform: (value: string) => string;
  };
  /** Action button displayed alongside the field. */
  action?: {
    label: string;
    loadingLabel?: string;
    /** Called with this field's value + all form values. Return updates to batch-apply. */
    handler: (value: string, allValues: Record<string, string>) => Promise<Record<string, string> | void>;
  };
  /** Only show this field when another field has a specific value. */
  showWhen?: {
    field: string;
    value: string | string[];
  };
}

/** Props passed to custom field renderers registered in the field registry. */
export interface FieldRendererProps {
  field: FormFieldDef;
  value: string;
  onChange: (value: string) => void;
  allValues: Record<string, string>;
  onBatchChange: (updates: Record<string, string>) => void;
  disabled?: boolean;
}

export interface FormDef {
  type: string;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  submitLabel?: string;
  cancelLabel?: string;
  /** Render submit button in error/danger color (for destructive actions). */
  danger?: boolean;
  onSubmit: (values: Record<string, string>) => Promise<FormSubmitResult>;
  /**
   * Custom component to render instead of the generic field layout.
   * When set, ChatFormCard delegates entirely to this component.
   * The same component should be used by the corresponding page view
   * to guarantee visual parity.
   */
  component?: ComponentType<FormComponentProps>;
}

/** Props passed to custom form components registered via FormDef.component. */
export interface FormComponentProps {
  prefill?: Record<string, string>;
  onSubmitted?: (result: FormSubmitResult) => void;
  /** When true, hide cancel/navigation -- the form is embedded in chat. */
  embedded?: boolean;
}

export interface FormSubmitResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export type FormStatus = "idle" | "submitting" | "success" | "error";
