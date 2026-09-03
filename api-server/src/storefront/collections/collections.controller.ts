import { Controller, Get, Param, Headers } from '@nestjs/common';
import { StorefrontCollectionsService } from './collections.service';

@Controller('storefront/collections')
export class StorefrontCollectionsController {
  constructor(private collectionsService: StorefrontCollectionsService) {}

  // GET /api/storefront/collections/:id
  @Get(':id')
  getCollection(
    @Headers('x-store-domain') domain: string,
    @Param('id') id: string,
  ) {
    return this.collectionsService.getCollection(domain, id);
  }
}
