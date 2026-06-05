import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [BannersController],
  providers: [BannersService, RolesGuard],
})
export class BannersModule {}
