import { Module } from '@nestjs/common';
import { StorefrontCategoriesController } from './categories.controller';
import { StorefrontCategoriesService } from './categories.service';

@Module({
  controllers: [StorefrontCategoriesController],
  providers: [StorefrontCategoriesService],
})
export class StorefrontCategoriesModule {}
