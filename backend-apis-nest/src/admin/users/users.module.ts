import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
