import { Controller, Get } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontCategoriesService } from './categories.service';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/categories')
export class StorefrontCategoriesController {
  constructor(private categoriesService: StorefrontCategoriesService) {}

  // GET /api/storefront/categories
  @Get()
  listCategories(@CurrentStore() store: Store) {
    return this.categoriesService.listCategories(store.id);
  }
}
