import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, RolesGuard],
})
export class CustomersModule {}
