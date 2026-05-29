import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentCustomer } from '../../common/decorators/current-customer.decorator';

@Controller('storefront/wishlist')
@UseGuards(CustomerAuthGuard)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  // GET /api/storefront/wishlist
  @Get()
  getWishlist(@CurrentCustomer() customer: { customerId: string; storeId: string }) {
    return this.wishlistService.getWishlist(customer.customerId, customer.storeId);
  }

  // POST /api/storefront/wishlist
  @Post()
  addToWishlist(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Body() body: { product_id: string },
  ) {
    return this.wishlistService.addToWishlist(customer.customerId, customer.storeId, body.product_id);
  }

  // DELETE /api/storefront/wishlist/:productId
  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  removeFromWishlist(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(customer.customerId, customer.storeId, productId);
  }
}
