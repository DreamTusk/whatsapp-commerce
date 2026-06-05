import { Controller, Get, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /api/users
  @Get()
  listMembers(@CurrentUser() user: { userId: string }) {
    return this.usersService.listMembers(user.userId);
  }

  // PUT /api/users/:id
  @Put(':id')
  updateStatus(
    @CurrentUser() user: { userId: string },
    @Param('id') userStoreId: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.usersService.updateStatus(user.userId, userStoreId, body.is_active);
  }

  // DELETE /api/users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @CurrentUser() user: { userId: string },
    @Param('id') userStoreId: string,
  ) {
    return this.usersService.removeMember(user.userId, userStoreId);
  }
}
