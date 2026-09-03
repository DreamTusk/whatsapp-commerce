import { Module } from '@nestjs/common';
import { StorefrontStoreController } from './store.controller';
import { StorefrontStoreService } from './store.service';

@Module({
  controllers: [StorefrontStoreController],
  providers: [StorefrontStoreService],
})
export class StorefrontStoreModule {}
