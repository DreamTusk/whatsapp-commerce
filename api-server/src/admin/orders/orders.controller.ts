import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // POST /api/orders — manual order creation
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createManualOrder(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.ordersService.createManualOrder(user.userId, body);
  }

  // GET /api/orders
  @Get()
  listOrders(
    @CurrentUser() user: { userId: string },
    @Query('status') status?: string,
    @Query('payment_method') payment_method?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    return this.ordersService.listOrders(user.userId, { status, payment_method, start_date, end_date });
  }

  // GET /api/orders/:id
  @Get(':id')
  getOrder(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrder(user.userId, id);
  }

  // PUT /api/orders/:id/status
  @Put(':id/status')
  updateOrderStatus(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { status: string; cancellation_reason?: string },
  ) {
    return this.ordersService.updateOrderStatus(user.userId, id, body.status, body.cancellation_reason);
  }

  // POST /api/orders/:id/shipment
  @Post(':id/shipment')
  @HttpCode(HttpStatus.CREATED)
  addShipment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { carrier_name: string; tracking_id: string; tracking_url?: string },
  ) {
    return this.ordersService.addShipment(user.userId, id, body);
  }
}
