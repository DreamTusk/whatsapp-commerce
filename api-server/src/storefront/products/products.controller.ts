import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontProductsService } from './products.service';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/products')
export class StorefrontProductsController {
  constructor(private productsService: StorefrontProductsService) {}

  // GET /api/storefront/products
  @Get()
  listProducts(
    @CurrentStore() store: Store,
    @Query('category_id') category_id?: string,
  ) {
    return this.productsService.listProducts(store.id, category_id);
  }

  // GET /api/storefront/products/:id
  @Get(':id')
  getProduct(@CurrentStore() store: Store, @Param('id') id: string) {
    return this.productsService.getProduct(store.id, id);
  }
}
