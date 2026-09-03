import { Controller, Get, Query, Headers } from '@nestjs/common';
import { StorefrontSearchService } from './search.service';

@Controller('storefront/search')
export class StorefrontSearchController {
  constructor(private searchService: StorefrontSearchService) {}

  // GET /api/storefront/search?q=tomato
  @Get()
  search(
    @Headers('x-store-domain') domain: string,
    @Query('q') q: string,
  ) {
    return this.searchService.search(domain, q);
  }
}
