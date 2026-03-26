/**
 * Adapter that wraps AiCreateFlow to satisfy the FormComponentProps
 * interface used by the chat inline form system.
 */
import { AiCreateFlow } from "./AiCreateFlow";
import type { ProjectRecord } from "../../lib/api";
import type { FormComponentProps, FormSubmitResult } from "../../types/forms";

export function AiCreateFormAdapter({ prefill, onSubmitted }: FormComponentProps) {
  function handleCreated(project: ProjectRecord) {
    const result: FormSubmitResult = {
      success: true,
      message: `Project "${project.name}" created successfully`,
      data: project as unknown as Record<string, unknown>,
    };
    onSubmitted?.(result);
  }

  return (
    <AiCreateFlow
      onCreated={handleCreated}
      prefillUrl={prefill?.quickStartUrl || prefill?.url}
    />
  );
}
