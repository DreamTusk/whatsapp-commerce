import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentCustomer } from '../../common/decorators/current-customer.decorator';

@Controller('storefront/cart')
@UseGuards(CustomerAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  // GET /api/storefront/cart
  @Get()
  getCart(@CurrentCustomer() customer: { customerId: string; storeId: string }) {
    return this.cartService.getCart(customer.customerId, customer.storeId);
  }

  // POST /api/storefront/cart
  @Post()
  addToCart(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Body() body: { product_id: string; quantity?: number },
  ) {
    return this.cartService.addToCart(customer.customerId, customer.storeId, body.product_id, body.quantity);
  }

  // PATCH /api/storefront/cart/:productId
  @Patch(':productId')
  updateQuantity(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(customer.customerId, customer.storeId, productId, body.quantity);
  }

  // DELETE /api/storefront/cart/:productId
  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(customer.customerId, customer.storeId, productId);
  }

  // DELETE /api/storefront/cart
  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@CurrentCustomer() customer: { customerId: string; storeId: string }) {
    return this.cartService.clearCart(customer.customerId, customer.storeId);
  }
}
