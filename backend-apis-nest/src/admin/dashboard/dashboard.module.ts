import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, RolesGuard],
})
export class DashboardModule {}
