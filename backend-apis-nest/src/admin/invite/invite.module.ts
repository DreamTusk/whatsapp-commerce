import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [InviteController],
  providers: [InviteService, RolesGuard],
})
export class InviteModule {}
