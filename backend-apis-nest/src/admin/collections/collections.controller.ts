import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('collections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  // GET /api/collections
  @Get()
  listCollections(@CurrentUser() user: { userId: string }) {
    return this.collectionsService.listCollections(user.userId);
  }

  // POST /api/collections
  @Post()
  createCollection(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.collectionsService.createCollection(user.userId, body);
  }

  // PATCH /api/collections/reorder — must be before /:id to avoid route conflict
  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  reorderCollections(
    @CurrentUser() user: { userId: string },
    @Body() body: { collection_ids: string[] },
  ) {
    return this.collectionsService.reorderCollections(user.userId, body.collection_ids);
  }

  // GET /api/collections/:id
  @Get(':id')
  getCollection(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.collectionsService.getCollection(user.userId, id);
  }

  // PUT /api/collections/:id
  @Put(':id')
  updateCollection(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.collectionsService.updateCollection(user.userId, id, body);
  }

  // DELETE /api/collections/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteCollection(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.collectionsService.deleteCollection(user.userId, id);
  }

  // POST /api/collections/:id/products
  @Post(':id/products')
  addProducts(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { product_ids: string[] },
  ) {
    return this.collectionsService.addProducts(user.userId, id, body.product_ids);
  }

  // DELETE /api/collections/:id/products/:productId
  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  removeProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.collectionsService.removeProduct(user.userId, id, productId);
  }

  // PATCH /api/collections/:id/products/reorder
  @Patch(':id/products/reorder')
  @HttpCode(HttpStatus.OK)
  reorderProducts(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { product_ids: string[] },
  ) {
    return this.collectionsService.reorderProducts(user.userId, id, body.product_ids);
  }
}
