import { Controller, Get, Headers } from '@nestjs/common';
import { StorefrontBannersService } from './banners.service';

@Controller('storefront/banners')
export class StorefrontBannersController {
  constructor(private bannersService: StorefrontBannersService) {}

  // GET /api/storefront/banners
  @Get()
  listBanners(@Headers('x-store-domain') domain: string) {
    return this.bannersService.listBanners(domain);
  }
}
