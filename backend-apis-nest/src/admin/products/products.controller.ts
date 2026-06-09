import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // GET /api/products
  @Get()
  listProducts(
    @CurrentUser() user: { userId: string },
    @Query('category_id') category_id?: string,
    @Query('brand_id') brand_id?: string,
  ) {
    return this.productsService.listProducts(user.userId, category_id, brand_id);
  }

  // GET /api/products/:id
  @Get(':id')
  getProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.productsService.getProduct(user.userId, id);
  }

  // POST /api/products
  @Post()
  createProduct(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.productsService.createProduct(user.userId, body);
  }

  // PUT /api/products/:id
  @Put(':id')
  updateProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.productsService.updateProduct(user.userId, id, body);
  }

  // DELETE /api/products/:id/media/:pmId
  @Delete(':id/media/:pmId')
  removeProductMedia(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('pmId') pmId: string,
  ) {
    return this.productsService.removeProductMedia(user.userId, id, pmId);
  }

  // PATCH /api/products/:id/media/:pmId/primary
  @Patch(':id/media/:pmId/primary')
  setPrimaryMedia(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('pmId') pmId: string,
  ) {
    return this.productsService.setPrimaryMedia(user.userId, id, pmId);
  }

  // DELETE /api/products/:id
  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.productsService.deleteProduct(user.userId, id);
  }
}
