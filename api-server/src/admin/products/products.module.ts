import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileService } from '../../shared/file.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, RolesGuard, FileService],
})
export class ProductsModule {}
