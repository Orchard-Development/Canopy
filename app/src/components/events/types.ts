export interface EventMessage {
  id: string;
  topic: string;
  payload: unknown;
  timestamp: number;
}
