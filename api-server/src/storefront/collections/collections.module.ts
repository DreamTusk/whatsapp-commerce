import { Module } from '@nestjs/common';
import { StorefrontCollectionsController } from './collections.controller';
import { StorefrontCollectionsService } from './collections.service';

@Module({
  controllers: [StorefrontCollectionsController],
  providers: [StorefrontCollectionsService],
})
export class StorefrontCollectionsModule {}
