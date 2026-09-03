import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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
import { StorefrontStoreModule } from './store/store.module';
import { StoreActiveMiddleware } from '../common/middleware/store-active.middleware';

@Module({
  imports: [StorefrontAuthModule, StorefrontCategoriesModule, StorefrontProductsModule, StorefrontCollectionsModule, CartModule, WishlistModule, AddressesModule, StorefrontOrdersModule, StorefrontBannersModule, StorefrontSearchModule, StorefrontStoreModule],
})
export class StorefrontModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StoreActiveMiddleware)
      .exclude({ path: 'storefront/store', method: RequestMethod.GET })
      .forRoutes({ path: 'storefront/*path', method: RequestMethod.ALL });
  }
}
