import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  createStore(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storeService.createStore(user.userId, body, file);
  }

  // GET /api/store
  @Get()
  @UseGuards(JwtAuthGuard)
  getStore(@CurrentUser() user: { userId: string }) {
    return this.storeService.getStore(user.userId);
  }

  // PUT /api/store
  @Put()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  updateStore(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storeService.updateStore(user.userId, body, file);
  }

  // DELETE /api/store
  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteStore(@CurrentUser() user: { userId: string }) {
    return this.storeService.deleteStore(user.userId);
  }
}
