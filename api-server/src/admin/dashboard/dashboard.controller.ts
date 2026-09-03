import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  // GET /api/dashboard/stats
  @Get('stats')
  getStats(@CurrentUser() user: { userId: string }) {
    return this.dashboardService.getStats(user.userId);
  }
}
