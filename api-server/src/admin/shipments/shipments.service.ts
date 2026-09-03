import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  private formatShipment(s: any) {
    return {
      id: s.id,
      carrier_name: s.carrierName,
      tracking_id: s.trackingId,
      tracking_url: s.trackingUrl,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      order: {
        id: s.Order.id,
        order_number: s.Order.orderNumber,
        status: s.Order.status,
        total_amount: s.Order.totalAmount,
        customer: {
          name: s.Order.Customer.name,
          phone: s.Order.Customer.phone,
        },
      },
    };
  }

  async listShipments(userId: string) {
    const storeId = await this.getStoreId(userId);

    const shipments = await this.prisma.orderShipment.findMany({
      where: { storeId },
      include: {
        Order: {
          include: { Customer: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { shipments: shipments.map((s) => this.formatShipment(s)) };
  }

  async getShipment(userId: string, shipmentId: string) {
    const storeId = await this.getStoreId(userId);

    const shipment = await this.prisma.orderShipment.findFirst({
      where: { id: shipmentId, storeId },
      include: {
        Order: {
          include: { Customer: { select: { name: true, phone: true } } },
        },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');

    return { shipment: this.formatShipment(shipment) };
  }

  async updateShipment(
    userId: string,
    shipmentId: string,
    body: { carrier_name?: string; tracking_id?: string; tracking_url?: string },
  ) {
    if (!body.carrier_name?.trim() && !body.tracking_id?.trim() && body.tracking_url === undefined) {
      throw new BadRequestException('At least one field is required');
    }

    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.orderShipment.findFirst({ where: { id: shipmentId, storeId } });
    if (!existing) throw new NotFoundException('Shipment not found');

    const updateData: any = {};
    if (body.carrier_name?.trim()) updateData.carrierName = body.carrier_name.trim();
    if (body.tracking_id?.trim()) updateData.trackingId = body.tracking_id.trim();
    if (body.tracking_url !== undefined) updateData.trackingUrl = body.tracking_url?.trim() || null;

    const shipment = await this.prisma.orderShipment.update({
      where: { id: shipmentId },
      data: updateData,
      include: {
        Order: {
          include: { Customer: { select: { name: true, phone: true } } },
        },
      },
    });

    return { shipment: this.formatShipment(shipment) };
  }
}
