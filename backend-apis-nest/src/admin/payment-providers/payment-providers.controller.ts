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
import { PaymentProvidersService } from './payment-providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payment-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentProvidersController {
  constructor(private paymentProvidersService: PaymentProvidersService) {}

  // GET /api/payment-providers — any staff can view
  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.paymentProvidersService.list(user.userId);
  }

  // POST /api/payment-providers — OWNER only
  @Post()
  @Roles('OWNER')
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: { provider: string; key_id: string; key_secret: string },
  ) {
    return this.paymentProvidersService.create(user.userId, body);
  }

  // PUT /api/payment-providers/:id — OWNER only
  @Put(':id')
  @Roles('OWNER')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { key_id?: string; key_secret?: string; is_active?: boolean },
  ) {
    return this.paymentProvidersService.update(user.userId, id, body);
  }

  // DELETE /api/payment-providers/:id — OWNER only
  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.paymentProvidersService.remove(user.userId, id);
  }
}
