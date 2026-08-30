export type ActionPayloadField = {
  name: string;
  source: string;
  send: boolean;
  value?: unknown;
  schema?: { type?: string };
  payload_path?: string[];
  serialize_as?: 'VALUE' | 'EVIDENCE' | 'LINES';
};

export function buildActionPayload(formData: { get(name: string): unknown }, fields: ActionPayloadField[]): Record<string, unknown>;
