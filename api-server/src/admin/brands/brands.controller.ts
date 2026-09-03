import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  // GET /api/brands
  @Get()
  listBrands(@CurrentUser() user: { userId: string }) {
    return this.brandsService.listBrands(user.userId);
  }

  // POST /api/brands
  @Post()
  createBrand(
    @CurrentUser() user: { userId: string },
    @Body() body: { name: string },
  ) {
    return this.brandsService.createBrand(user.userId, body.name);
  }

  // PUT /api/brands/:id
  @Put(':id')
  updateBrand(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.brandsService.updateBrand(user.userId, id, body.name);
  }

  // DELETE /api/brands/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  deleteBrand(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.brandsService.deleteBrand(user.userId, id);
  }
}
