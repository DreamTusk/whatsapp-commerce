import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [ShipmentsController],
  providers: [ShipmentsService, RolesGuard],
})
export class ShipmentsModule {}
