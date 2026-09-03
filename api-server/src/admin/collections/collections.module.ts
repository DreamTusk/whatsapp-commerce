import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService, RolesGuard],
})
export class CollectionsModule {}
