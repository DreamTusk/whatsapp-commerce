import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // GET /api/categories
  @Get()
  listCategories(@CurrentUser() user: { userId: string }) {
    return this.categoriesService.listCategories(user.userId);
  }

  // POST /api/categories
  @Post()
  createCategory(
    @CurrentUser() user: { userId: string },
    @Body() body: { name: string; is_active?: string; parent_id?: string; media_id?: string },
  ) {
    return this.categoriesService.createCategory(user.userId, body);
  }

  // PUT /api/categories/:id
  @Put(':id')
  updateCategory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { name?: string; is_active?: string; parent_id?: string; media_id?: string; remove_image?: string },
  ) {
    return this.categoriesService.updateCategory(user.userId, id, body);
  }

  // PATCH /api/categories/:id/status
  @Patch(':id/status')
  updateCategoryStatus(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.categoriesService.updateCategoryStatus(user.userId, id, body.is_active);
  }

  // DELETE /api/categories/:id
  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteCategory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.categoriesService.deleteCategory(user.userId, id);
  }
}
