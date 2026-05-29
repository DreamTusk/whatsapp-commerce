import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // GET /api/inventory
  @Get()
  listInventory(@CurrentUser() user: { userId: string }) {
    return this.inventoryService.listInventory(user.userId);
  }

  // PATCH /api/inventory/:productId
  @Patch(':productId')
  updateStock(
    @CurrentUser() user: { userId: string },
    @Param('productId') productId: string,
    @Body() body: { in_stock: any },
  ) {
    return this.inventoryService.updateStock(user.userId, productId, body.in_stock);
  }
}
