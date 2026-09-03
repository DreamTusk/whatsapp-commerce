import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  private formatAddress(a: any) {
    return {
      id: a.id,
      label: a.label,
      address: a.address,
      door_no: a.doorNo,
      street: a.street,
      city: a.city,
      state: a.state,
      country: a.country,
      pincode: a.pincode,
      latitude: a.latitude,
      longitude: a.longitude,
      is_default: a.isDefault,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    };
  }

  async listAddresses(customerId: string, storeId: string) {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId, storeId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return { addresses: addresses.map((a) => this.formatAddress(a)) };
  }

  async createAddress(customerId: string, storeId: string, body: any) {
    if (!body.address && !body.street && !body.city) {
      throw new BadRequestException('At least one of address, street, or city is required');
    }

    if (body.is_default) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, storeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await this.prisma.customerAddress.create({
      data: {
        customerId,
        storeId,
        label: body.label?.trim() || null,
        address: body.address?.trim() || null,
        doorNo: body.door_no?.trim() || null,
        street: body.street?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        country: body.country?.trim() || null,
        pincode: body.pincode?.trim() || null,
        latitude: typeof body.latitude === 'number' ? body.latitude : null,
        longitude: typeof body.longitude === 'number' ? body.longitude : null,
        isDefault: !!body.is_default,
      },
    });

    return { address: this.formatAddress(newAddress) };
  }

  async updateAddress(customerId: string, storeId: string, addressId: string, body: any) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId, storeId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    if (body.is_default && !existing.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, storeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: existing.id },
      data: {
        label: body.label?.trim() || null,
        address: body.address?.trim() || null,
        doorNo: body.door_no?.trim() || null,
        street: body.street?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        country: body.country?.trim() || null,
        pincode: body.pincode?.trim() || null,
        latitude: typeof body.latitude === 'number' ? body.latitude : null,
        longitude: typeof body.longitude === 'number' ? body.longitude : null,
        ...(body.is_default !== undefined ? { isDefault: !!body.is_default } : {}),
      },
    });

    return { address: this.formatAddress(updated) };
  }

  async setDefault(customerId: string, storeId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId, storeId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    await this.prisma.customerAddress.updateMany({
      where: { customerId, storeId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.customerAddress.update({
      where: { id: existing.id },
      data: { isDefault: true },
    });

    return { address: this.formatAddress(updated) };
  }

  async deleteAddress(customerId: string, storeId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId, storeId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    await this.prisma.customerAddress.delete({ where: { id: existing.id } });
    return { message: 'Address deleted' };
  }
}
