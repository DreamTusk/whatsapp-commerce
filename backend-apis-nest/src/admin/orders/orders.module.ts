import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
})
export class OrdersModule {}
