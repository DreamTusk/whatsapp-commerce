import { Controller, Get } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { StorefrontBannersService } from './banners.service';
import { CurrentStore } from '../../common/decorators/current-store.decorator';

@Controller('storefront/banners')
export class StorefrontBannersController {
  constructor(private bannersService: StorefrontBannersService) {}

  // GET /api/storefront/banners
  @Get()
  listBanners(@CurrentStore() store: Store) {
    return this.bannersService.listBanners(store.id);
  }
}
