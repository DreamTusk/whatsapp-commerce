import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InviteService } from './invite.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('invite')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class InviteController {
  constructor(private inviteService: InviteService) {}

  // POST /api/invite
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createInvite(
    @CurrentUser() user: { userId: string },
    @Body() body: { email: string; role: string },
  ) {
    return this.inviteService.createInvite(user.userId, body.email, body.role);
  }

  // GET /api/invite
  @Get()
  listInvites(@CurrentUser() user: { userId: string }) {
    return this.inviteService.listInvites(user.userId);
  }

  // DELETE /api/invite/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancelInvite(
    @CurrentUser() user: { userId: string },
    @Param('id') inviteId: string,
  ) {
    return this.inviteService.cancelInvite(user.userId, inviteId);
  }
}
