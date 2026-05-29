import { Module } from '@nestjs/common';
import { StorefrontProductsController } from './products.controller';
import { StorefrontProductsService } from './products.service';

@Module({
  controllers: [StorefrontProductsController],
  providers: [StorefrontProductsService],
})
export class StorefrontProductsModule {}
