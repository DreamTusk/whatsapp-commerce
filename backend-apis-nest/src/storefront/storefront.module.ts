import { Module } from '@nestjs/common';
import { StorefrontAuthModule } from './auth/auth.module';
import { StorefrontCategoriesModule } from './categories/categories.module';
import { StorefrontProductsModule } from './products/products.module';
import { StorefrontCollectionsModule } from './collections/collections.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressesModule } from './addresses/addresses.module';
import { StorefrontOrdersModule } from './orders/orders.module';
import { StorefrontBannersModule } from './banners/banners.module';
import { StorefrontSearchModule } from './search/search.module';

@Module({
  imports: [StorefrontAuthModule, StorefrontCategoriesModule, StorefrontProductsModule, StorefrontCollectionsModule, CartModule, WishlistModule, AddressesModule, StorefrontOrdersModule, StorefrontBannersModule, StorefrontSearchModule],
})
export class StorefrontModule {}
