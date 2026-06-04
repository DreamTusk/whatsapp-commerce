import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  // GET /api/customers/search?q=
  @Get('search')
  searchCustomers(
    @CurrentUser() user: { userId: string },
    @Query('q') q: string,
  ) {
    return this.customersService.searchCustomers(user.userId, q);
  }

  // GET /api/customers
  @Get()
  listCustomers(@CurrentUser() user: { userId: string }) {
    return this.customersService.listCustomers(user.userId);
  }
}
