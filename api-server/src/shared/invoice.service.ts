import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
import { buildInvoiceDocument, InvoiceData } from './invoice-template';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  // COD orders are invoiced once the store confirms them (payment happens on delivery).
  // ONLINE orders additionally require the payment to have actually succeeded.
  assertInvoiceAvailable(order: {
    status: string;
    Payment: { method: string; status: string } | null;
  }) {
    if (order.status === 'NEW' || order.status === 'CANCELLED') {
      throw new ForbiddenException('Invoice is not available for this order yet');
    }
    if (order.Payment?.method === 'ONLINE' && order.Payment.status !== 'PAID') {
      throw new ForbiddenException('Invoice is not available until payment is confirmed');
    }
  }

  async renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
    const storeLogo = await this.prepareLogo(data.storeLogo);
    return renderToBuffer(buildInvoiceDocument({ ...data, storeLogo }) as Parameters<typeof renderToBuffer>[0]);
  }

  // react-pdf only decodes JPEG/PNG — store logos are often WebP (or any other
  // format), so re-encode through sharp to a PNG data URI it can always render.
  private async prepareLogo(logoUrl: string | null): Promise<string | null> {
    if (!logoUrl || !logoUrl.startsWith('http')) return null;

    try {
      const res = await fetch(logoUrl);
      if (!res.ok) return null;

      const input = Buffer.from(await res.arrayBuffer());
      const png = await sharp(input).resize(200, 200, { fit: 'cover' }).png().toBuffer();
      return `data:image/png;base64,${png.toString('base64')}`;
    } catch (err) {
      this.logger.warn(`Failed to prepare invoice logo (${logoUrl}): ${err}`);
      return null;
    }
  }
}
