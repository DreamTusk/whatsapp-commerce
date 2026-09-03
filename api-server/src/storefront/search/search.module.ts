import { Module } from '@nestjs/common';
import { StorefrontSearchController } from './search.controller';
import { StorefrontSearchService } from './search.service';

@Module({
  controllers: [StorefrontSearchController],
  providers: [StorefrontSearchService],
})
export class StorefrontSearchModule {}
