import { Module } from '@nestjs/common';
import { StoreModule } from './store/store.module';
import { InviteModule } from './invite/invite.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CollectionsModule } from './collections/collections.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BannersModule } from './banners/banners.module';

@Module({
  imports: [StoreModule, InviteModule, CategoriesModule, BrandsModule, ProductsModule, InventoryModule, CollectionsModule, OrdersModule, CustomersModule, DashboardModule, BannersModule],
})
export class AdminModule {}
