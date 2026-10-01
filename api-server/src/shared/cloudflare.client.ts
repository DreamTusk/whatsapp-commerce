import { Injectable, Logger } from '@nestjs/common';

export interface CloudflareOwnershipVerification {
  type: string;
  name: string;
  value: string;
}

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status: string;
  ssl?: { status: string };
  ownership_verification?: CloudflareOwnershipVerification;
}

// Wrapper around Cloudflare for SaaS' Custom Hostnames API (zone-scoped) —
// store-customer is a Worker, not a Pages project, so the Pages custom-domains
// API this used to call against doesn't apply here. Hostname lookups/deletes
// go by Cloudflare's own hostname id (stored as Store.cloudflareHostnameId),
// not the hostname string itself.
@Injectable()
export class CloudflareClient {
  private readonly logger = new Logger(CloudflareClient.name);
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  private get zoneId(): string {
    return process.env.CUSTOM_DOMAIN_CLOUDFLARE_ZONE_ID ?? '';
  }

  private get token(): string {
    return process.env.CUSTOM_DOMAIN_CLOUDFLARE_TOKEN ?? '';
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
      this.logger.error(`Cloudflare Custom Hostnames API failed: ${message}`);
      throw new Error(message);
    }

    return body.result as T;
  }

  async addHostname(hostname: string): Promise<CloudflareCustomHostname> {
    return this.request<CloudflareCustomHostname>(`/zones/${this.zoneId}/custom_hostnames`, {
      method: 'POST',
      body: JSON.stringify({
        hostname,
        ssl: { method: 'http', type: 'dv', bundle_method: 'ubiquitous' },
      }),
    });
  }

  async getHostnameStatus(hostnameId: string): Promise<CloudflareCustomHostname> {
    return this.request<CloudflareCustomHostname>(`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`);
  }

  async removeHostname(hostnameId: string): Promise<void> {
    await this.request<void>(`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`, { method: 'DELETE' });
  }
}
