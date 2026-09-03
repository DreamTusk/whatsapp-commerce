import { Module } from '@nestjs/common';
import { StorefrontOrdersController } from './orders.controller';
import { StorefrontOrdersService } from './orders.service';
import { PaymentProvidersModule } from '../../admin/payment-providers/payment-providers.module';

@Module({
  imports: [PaymentProvidersModule],
  controllers: [StorefrontOrdersController],
  providers: [StorefrontOrdersService],
})
export class StorefrontOrdersModule {}
