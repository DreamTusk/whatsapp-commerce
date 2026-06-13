import { Module } from '@nestjs/common';
import { PaymentProvidersController } from './payment-providers.controller';
import { PaymentProvidersService } from './payment-providers.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [PaymentProvidersController],
  providers: [PaymentProvidersService, RolesGuard],
  exports: [PaymentProvidersService],
})
export class PaymentProvidersModule {}
