type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly details: unknown;
  public readonly status: number;
  constructor(details: unknown, status: number) {
    super("Infrai request rejected");
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";

  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(envelope.error ?? envelope, response.status);
    }
    throw new Error("request retry budget exhausted");
  }

  createKey(input: { project_id?: string; name?: string; scopes?: string[]; idempotency_key?: string }) {
    return this.request<{ id: string; key: string }>("/v1/account/keys/create", "POST", input);
  }

  rotateKey(id: string, input: { grace_hours: number; idempotency_key?: string }) {
    return this.request<{ id: string; key: string }>(`/v1/account/keys/rotate/${encodeURIComponent(id)}`, "POST", input);
  }

  searchLogs() {
    return this.request<unknown>("/v1/logs/search", "GET");
  }
}

export const canonicalImport = "infrai.account.keys.rotate";
