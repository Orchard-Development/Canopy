export interface TaskFile {
  id: string;
  filename: string;
  name: string;
  agent: string;
  model: string;
  dependsOn: string[];
  status: string;
  content: string;
}

export interface ProposalSession {
  id: string;
  action: string;
  task: string | null;
  agent: string;
  timestamp: string;
}

export interface Proposal {
  slug: string;
  title: string;
  date: string;
  status: string;
  repo: string;
  ticket: string | null;
  taskCount: number;
  tasksByStatus: Record<string, number>;
  proposal: string;
  impact: string | null;
  tasks: TaskFile[];
  sessions?: ProposalSession[];
}

export const STATUS_ACCENT: Record<string, string> = {
  draft: "grey.500",
  "in-progress": "warning.main",
  completed: "success.main",
  rejected: "error.main",
};

export const TASK_ACCENT: Record<string, string> = {
  pending: "grey.500",
  "in-progress": "warning.main",
  completed: "success.main",
  skipped: "grey.400",
};
