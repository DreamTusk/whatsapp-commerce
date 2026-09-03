import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private shipmentsService: ShipmentsService) {}

  // GET /api/shipments
  @Get()
  listShipments(@CurrentUser() user: { userId: string }) {
    return this.shipmentsService.listShipments(user.userId);
  }

  // GET /api/shipments/:id
  @Get(':id')
  getShipment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.shipmentsService.getShipment(user.userId, id);
  }

  // PUT /api/shipments/:id
  @Put(':id')
  updateShipment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { carrier_name?: string; tracking_id?: string; tracking_url?: string },
  ) {
    return this.shipmentsService.updateShipment(user.userId, id, body);
  }
}
