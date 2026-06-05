import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  createProduct(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.createProduct(user.userId, body, file);
  }

  // PUT /api/products/:id
  @Put(':id')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  updateProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.updateProduct(user.userId, id, body, file);
  }

  // DELETE /api/products/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteProduct(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.productsService.deleteProduct(user.userId, id);
  }
}
