import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  // GET /api/store/info — public, resolves by x-store-domain header
  @Get('info')
  getStoreInfo(@Headers('x-store-domain') domain: string) {
    return this.storeService.getStoreInfo(domain);
  }

  // POST /api/store
  @Post()
  @UseGuards(JwtAuthGuard)
  createStore(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.storeService.createStore(user.userId, body);
  }

  // GET /api/store — all authenticated roles can read store info
  @Get()
  @UseGuards(JwtAuthGuard)
  getStore(@CurrentUser() user: { userId: string }) {
    return this.storeService.getStore(user.userId);
  }

  // PUT /api/store
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  updateStore(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.storeService.updateStore(user.userId, body);
  }

  // DELETE /api/store
  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteStore(@CurrentUser() user: { userId: string }) {
    return this.storeService.deleteStore(user.userId);
  }
}
