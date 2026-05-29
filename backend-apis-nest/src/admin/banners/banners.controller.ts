import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('banners')
@UseGuards(JwtAuthGuard)
export class BannersController {
  constructor(private bannersService: BannersService) {}

  // GET /api/banners
  @Get()
  listBanners(@CurrentUser() user: { userId: string }) {
    return this.bannersService.listBanners(user.userId);
  }

  // POST /api/banners
  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  createBanner(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannersService.createBanner(user.userId, body, file);
  }

  // PATCH /api/banners/reorder
  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  reorderBanners(
    @CurrentUser() user: { userId: string },
    @Body() body: { banner_ids: string[] },
  ) {
    return this.bannersService.reorderBanners(user.userId, body.banner_ids);
  }

  // PUT /api/banners/:id
  @Put(':id')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  updateBanner(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannersService.updateBanner(user.userId, id, body, file);
  }

  // DELETE /api/banners/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteBanner(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.bannersService.deleteBanner(user.userId, id);
  }
}
