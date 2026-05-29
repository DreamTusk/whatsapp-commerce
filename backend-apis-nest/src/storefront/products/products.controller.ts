import { Controller, Get, Param, Query, Headers } from '@nestjs/common';
import { StorefrontProductsService } from './products.service';

@Controller('storefront/products')
export class StorefrontProductsController {
  constructor(private productsService: StorefrontProductsService) {}

  // GET /api/storefront/products
  @Get()
  listProducts(
    @Headers('x-store-domain') domain: string,
    @Query('category_id') category_id?: string,
  ) {
    return this.productsService.listProducts(domain, category_id);
  }

  // GET /api/storefront/products/:id
  @Get(':id')
  getProduct(
    @Headers('x-store-domain') domain: string,
    @Param('id') id: string,
  ) {
    return this.productsService.getProduct(domain, id);
  }
}
