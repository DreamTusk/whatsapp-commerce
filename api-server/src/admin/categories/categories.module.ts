import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileService } from '../../shared/file.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, RolesGuard, FileService],
})
export class CategoriesModule {}
