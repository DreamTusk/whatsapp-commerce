import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontOrdersService } from './orders.service';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentCustomer } from '../../common/decorators/current-customer.decorator';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/orders')
@UseGuards(CustomerAuthGuard)
export class StorefrontOrdersController {
  constructor(private ordersService: StorefrontOrdersService) {}

  // GET /api/storefront/orders
  @Get()
  listOrders(@CurrentCustomer() customer: { customerId: string }) {
    return this.ordersService.listOrders(customer.customerId);
  }

  // POST /api/storefront/orders
  @Post()
  placeOrder(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @CurrentStore() store: Store,
    @Body() body: any,
  ) {
    return this.ordersService.placeOrder(
      customer.customerId,
      customer.storeId,
      store,
      body,
    );
  }

  // POST /api/storefront/orders/:id/retry-payment
  @Post(':id/retry-payment')
  @HttpCode(HttpStatus.OK)
  retryPayment(
    @CurrentCustomer() customer: { customerId: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.retryPayment(customer.customerId, id);
  }

  // POST /api/storefront/orders/:id/verify-payment
  @Post(':id/verify-payment')
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @CurrentCustomer() customer: { customerId: string },
    @Param('id') id: string,
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    return this.ordersService.verifyPayment(customer.customerId, id, body);
  }

  // PATCH /api/storefront/orders/:id/cancel
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @CurrentCustomer() customer: { customerId: string },
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.cancelOrder(customer.customerId, id, body.reason);
  }

  // GET /api/storefront/orders/:id/reorder
  @Get(':id/reorder')
  getReorderPreview(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.getReorderPreview(customer.customerId, customer.storeId, id);
  }

  // GET /api/storefront/orders/:id
  @Get(':id')
  getOrder(
    @CurrentCustomer() customer: { customerId: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrder(customer.customerId, id);
  }
}
