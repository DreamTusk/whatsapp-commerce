import { Controller, Get, Headers } from '@nestjs/common';
import { StorefrontCategoriesService } from './categories.service';

@Controller('storefront/categories')
export class StorefrontCategoriesController {
  constructor(private categoriesService: StorefrontCategoriesService) {}

  // GET /api/storefront/categories
  @Get()
  listCategories(@Headers('x-store-domain') domain: string) {
    return this.categoriesService.listCategories(domain);
  }
}
