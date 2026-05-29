import { Module } from '@nestjs/common';
import { StorefrontAuthModule } from './auth/auth.module';
import { StorefrontCategoriesModule } from './categories/categories.module';
import { StorefrontProductsModule } from './products/products.module';
import { StorefrontCollectionsModule } from './collections/collections.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressesModule } from './addresses/addresses.module';
import { StorefrontOrdersModule } from './orders/orders.module';

@Module({
  imports: [StorefrontAuthModule, StorefrontCategoriesModule, StorefrontProductsModule, StorefrontCollectionsModule, CartModule, WishlistModule, AddressesModule, StorefrontOrdersModule],
})
export class StorefrontModule {}
