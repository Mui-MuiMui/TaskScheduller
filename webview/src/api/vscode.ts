// VSCode API wrapper for webview communication

interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

// Get VSCode API instance (singleton)
let vscodeApi: VSCodeApi | null = null;

export function getVSCodeAPI(): VSCodeApi {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

// Message types
export interface BaseMessage {
  id: string;
  timestamp: number;
  type: string;
  payload?: unknown;
  command?: string;
}

// Generate unique message ID
export function generateMessageId(): string {
  return crypto.randomUUID();
}

// Send message to extension host
export function postMessage(message: { type: string; payload?: unknown }): string {
  const id = generateMessageId();
  const fullMessage = {
    ...message,
    id,
    timestamp: Date.now(),
  };
  getVSCodeAPI().postMessage(fullMessage);
  return id;
}

// Listen for messages from extension host
export function onMessage(callback: (message: BaseMessage) => void): () => void {
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
