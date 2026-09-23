import { Controller, Get, Param } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontCollectionsService } from './collections.service';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/collections')
export class StorefrontCollectionsController {
  constructor(private collectionsService: StorefrontCollectionsService) {}

  // GET /api/storefront/collections/:id
  @Get(':id')
  getCollection(@CurrentStore() store: Store, @Param('id') id: string) {
    return this.collectionsService.getCollection(store.id, id);
  }
}
