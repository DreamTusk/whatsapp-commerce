import { Injectable, Logger } from '@nestjs/common';

export interface CloudflareDomainResult {
  id: string;
  name: string;
  status: string;
  verification_data?: unknown;
  validation_data?: unknown;
}

// Thin wrapper around Cloudflare Pages' custom-domains API. We never compute
// DNS record types/values ourselves — Cloudflare's response already knows
// whether a hostname is an apex or a subdomain and returns what to show.
@Injectable()
export class CloudflareClient {
  private readonly logger = new Logger(CloudflareClient.name);
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  private get accountId(): string {
    return process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
  }

  private get project(): string {
    return process.env.CLOUDFLARE_PAGES_PROJECT ?? '';
  }

  private get token(): string {
    return process.env.CLOUDFLARE_API_TOKEN ?? '';
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || body?.success === false) {
      const message = body?.errors?.[0]?.message ?? `Cloudflare API error (${res.status})`;
      this.logger.error(`Cloudflare Pages domains API failed: ${message}`);
      throw new Error(message);
    }

    return body.result as T;
  }

  async addDomain(hostname: string): Promise<CloudflareDomainResult> {
    return this.request<CloudflareDomainResult>(
      `/accounts/${this.accountId}/pages/projects/${this.project}/domains`,
      { method: 'POST', body: JSON.stringify({ name: hostname }) },
    );
  }

  async getDomainStatus(hostname: string): Promise<CloudflareDomainResult> {
    return this.request<CloudflareDomainResult>(
      `/accounts/${this.accountId}/pages/projects/${this.project}/domains/${hostname}`,
    );
  }

  async removeDomain(hostname: string): Promise<void> {
    await this.request<void>(
      `/accounts/${this.accountId}/pages/projects/${this.project}/domains/${hostname}`,
      { method: 'DELETE' },
    );
  }
}
