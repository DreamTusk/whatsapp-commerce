import { Controller, Get, Query } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontSearchService } from './search.service';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/search')
export class StorefrontSearchController {
  constructor(private searchService: StorefrontSearchService) {}

  // GET /api/storefront/search?q=tomato
  @Get()
  search(@CurrentStore() store: Store, @Query('q') q: string) {
    return this.searchService.search(store.id, q);
  }
}
