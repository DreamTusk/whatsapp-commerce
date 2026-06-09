import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [FilesController],
  providers: [RolesGuard],
})
export class FilesModule {}
