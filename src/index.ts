export type StreamServerType = "camera-stream-server" | "desktop-stream-server" | (string & {});
export type StreamAction = "pause" | "resume" | "restart";

export type CreateStreamInput = {
  type: StreamServerType;
  name?: string;
  config?: Record<string, unknown>;
};

export type StreamSession = {
  id: string;
  type: StreamServerType;
  owner: string;
  status: "starting" | "running" | "paused" | "offline";
  name: string | null;
  source: Record<string, unknown>;
  runtime: { connectedCount: number; activity: "empty" | "active"; updatedAt: string };
  connection: { signalingPath: "/signaling"; room: string; accessToken: string };
};

export type StreamingClientOptions = { baseUrl: string; apiKey: string; fetch?: typeof globalThis.fetch };

export class TomoStreamingError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

export class TomoStreamingClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(private readonly options: StreamingClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async listSessions(): Promise<StreamSession[]> {
    return (await this.request<{ sessions: StreamSession[] }>("/api/v1/streams")).sessions;
  }

  async createSession(input: CreateStreamInput): Promise<StreamSession> {
    return (await this.request<{ session: StreamSession }>("/api/v1/streams", { method: "POST", body: input })).session;
  }

  async getSession(id: string): Promise<StreamSession> {
    return (await this.request<{ session: StreamSession }>(`/api/v1/streams/${encodeURIComponent(id)}`)).session;
  }

  async action(id: string, action: StreamAction): Promise<StreamSession> {
    return (await this.request<{ session: StreamSession }>(`/api/v1/streams/${encodeURIComponent(id)}/actions`, { method: "POST", body: { action } })).session;
  }

  async deleteSession(id: string): Promise<void> {
    await this.request(`/api/v1/streams/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  signalingUrl(session: StreamSession): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = session.connection.signalingPath;
    url.search = "";
    return url.toString();
  }

  joinMessage(session: StreamSession, username?: string): Record<string, string> {
    return { type: "join", room: session.connection.room, role: "player", accessToken: session.connection.accessToken, ...(username ? { username } : {}) };
  }

  private async request<T = void>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: { "x-api-key": this.options.apiKey, ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } };
    if (!response.ok) throw new TomoStreamingError(payload.error?.message ?? `streaming API returned ${response.status}`, response.status, payload.error?.code ?? "request_failed");
    return payload as T;
  }
}

/** Versioned inputs. ArrayBuffer avoids RTCDataChannel.send overload conflicts. */
export const TomoStreamInput = {
  keyboard(hidUsage: number, pressed: boolean): ArrayBuffer {
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);
    view.setUint8(0, 1); view.setUint8(1, 1); view.setUint8(2, pressed ? 1 : 0); view.setUint16(3, hidUsage, false);
    return buffer;
  },
  pointer(x: number, y: number, buttons = 0): ArrayBuffer {
    const buffer = new ArrayBuffer(7);
    const view = new DataView(buffer);
    view.setUint8(0, 1); view.setUint8(1, 2);
    view.setUint16(2, Math.max(0, Math.min(65535, Math.round(x))), false);
    view.setUint16(4, Math.max(0, Math.min(65535, Math.round(y))), false);
    view.setUint8(6, buttons & 0xff);
    return buffer;
  },
  wheel(deltaX: number, deltaY: number): ArrayBuffer {
    const buffer = new ArrayBuffer(6);
    const view = new DataView(buffer);
    view.setUint8(0, 1); view.setUint8(1, 3);
    view.setInt16(2, Math.max(-32768, Math.min(32767, Math.round(deltaX))), false);
    view.setInt16(4, Math.max(-32768, Math.min(32767, Math.round(deltaY))), false);
    return buffer;
  },
};
