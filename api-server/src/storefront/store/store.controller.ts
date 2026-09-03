import { Controller, Get, Headers } from '@nestjs/common';
import { StorefrontStoreService } from './store.service';

@Controller('storefront/store')
export class StorefrontStoreController {
  constructor(private storeService: StorefrontStoreService) {}

  // GET /api/storefront/store
  @Get()
  getStore(@Headers('x-store-domain') domain: string) {
    return this.storeService.getStore(domain);
  }
}
