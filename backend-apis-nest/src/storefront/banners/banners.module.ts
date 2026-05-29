import { Module } from '@nestjs/common';
import { StorefrontBannersController } from './banners.controller';
import { StorefrontBannersService } from './banners.service';

@Module({
  controllers: [StorefrontBannersController],
  providers: [StorefrontBannersService],
})
export class StorefrontBannersModule {}
