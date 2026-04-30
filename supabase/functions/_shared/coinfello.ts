// CoinFello typed client (scaffold).
// Docs: https://docs.coinfello.com/agent/quickstart
// Runs in MOCK mode unless COINFELLO_API_KEY is set.

export interface QuoteRequest {
  destination: string;
  amount: string | number;
  asset_code: string;
  memo?: string;
}

export interface QuoteResponse {
  quote_id: string;
  rate: number;
  fee: string;
  estimated_total: string;
  expires_at: string;
  raw?: unknown;
}

export interface ExecuteRequest {
  quote_id: string;
  source_account?: string;
  signed_xdr?: string; // user-signed Stellar tx if required
  destination: string;
  amount: string | number;
  asset_code: string;
  memo?: string;
}

export interface ExecuteResponse {
  payment_id: string;
  status: "submitted" | "settled" | "failed" | "pending";
  stellar_tx_hash?: string;
  raw?: unknown;
}

export interface StatusResponse {
  payment_id: string;
  status: "submitted" | "settled" | "failed" | "pending";
  stellar_tx_hash?: string;
  raw?: unknown;
}

export class CoinFelloClient {
  private apiKey: string | null;
  private baseUrl: string;
  public mock: boolean;

  constructor(apiKey: string | null, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.coinfello.com/agent/v1";
    this.mock = !apiKey;
  }

  private async req<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`CoinFello ${path} failed [${res.status}]: ${text}`);
    }
    try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
  }

  async quote(input: QuoteRequest): Promise<QuoteResponse> {
    if (this.mock) {
      const amount = Number(input.amount);
      const fee = +(amount * 0.005).toFixed(6);
      return {
        quote_id: `mock_q_${crypto.randomUUID()}`,
        rate: 1,
        fee: fee.toString(),
        estimated_total: (amount + fee).toString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        raw: { mock: true },
      };
    }
    return this.req<QuoteResponse>("/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async execute(input: ExecuteRequest): Promise<ExecuteResponse> {
    if (this.mock) {
      const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      return {
        payment_id: `mock_p_${crypto.randomUUID()}`,
        status: "submitted",
        stellar_tx_hash: hash,
        raw: { mock: true },
      };
    }
    return this.req<ExecuteResponse>("/payments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async status(paymentId: string): Promise<StatusResponse> {
    if (this.mock) {
      // Mock: 70% settle on first poll, otherwise still submitted.
      const settled = Math.random() < 0.7;
      return {
        payment_id: paymentId,
        status: settled ? "settled" : "submitted",
        raw: { mock: true },
      };
    }
    return this.req<StatusResponse>(`/payments/${paymentId}`, { method: "GET" });
  }
}

export function getClient() {
  const apiKey = Deno.env.get("COINFELLO_API_KEY") ?? null;
  const baseUrl = Deno.env.get("COINFELLO_BASE_URL") ?? undefined;
  return new CoinFelloClient(apiKey, baseUrl);
}
