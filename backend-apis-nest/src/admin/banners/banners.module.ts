import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [BannersController],
  providers: [BannersService, RolesGuard],
})
export class BannersModule {}
