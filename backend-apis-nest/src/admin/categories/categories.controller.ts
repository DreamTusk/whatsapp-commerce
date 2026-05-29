import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // GET /api/categories
  @Get()
  listCategories(@CurrentUser() user: { userId: string }) {
    return this.categoriesService.listCategories(user.userId);
  }

  // POST /api/categories
  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  createCategory(
    @CurrentUser() user: { userId: string },
    @Body() body: { name: string; is_active?: string; parent_id?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.createCategory(user.userId, body, file);
  }

  // PUT /api/categories/:id
  @Put(':id')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  updateCategory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { name?: string; is_active?: string; parent_id?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.updateCategory(user.userId, id, body, file);
  }

  // DELETE /api/categories/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteCategory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.categoriesService.deleteCategory(user.userId, id);
  }
}
