import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvidersService } from '../admin/payment-providers/payment-providers.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private paymentProviders: PaymentProvidersService,
  ) {}

  async handleRazorpayWebhook(storeId: string, rawBody: Buffer, signature: string) {
    if (!signature) throw new BadRequestException('Missing X-Razorpay-Signature header');

    const webhookSecret = await this.paymentProviders.getWebhookSecret(storeId, 'RAZORPAY');
    if (!webhookSecret) throw new BadRequestException('Webhook secret not configured for this store');

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());

    if (payload.event !== 'payment.captured') return { received: true };

    const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = payload.payload?.payment?.entity?.id;

    if (!razorpayOrderId || !razorpayPaymentId) return { received: true };

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    if (!payment) return { received: true };

    // Idempotency — already processed
    if (payment.status === PaymentStatus.PAID) return { received: true };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId,
        paidAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    return { received: true };
  }
}
