import { Module } from '@nestjs/common';
import { StorefrontOrdersController } from './orders.controller';
import { StorefrontOrdersService } from './orders.service';

@Module({
  controllers: [StorefrontOrdersController],
  providers: [StorefrontOrdersService],
})
export class StorefrontOrdersModule {}
