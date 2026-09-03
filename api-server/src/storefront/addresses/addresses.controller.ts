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
import { AddressesService } from './addresses.service';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentCustomer } from '../../common/decorators/current-customer.decorator';

@Controller('storefront/addresses')
@UseGuards(CustomerAuthGuard)
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  // GET /api/storefront/addresses
  @Get()
  listAddresses(@CurrentCustomer() customer: { customerId: string; storeId: string }) {
    return this.addressesService.listAddresses(customer.customerId, customer.storeId);
  }

  // POST /api/storefront/addresses
  @Post()
  createAddress(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Body() body: any,
  ) {
    return this.addressesService.createAddress(customer.customerId, customer.storeId, body);
  }

  // PUT /api/storefront/addresses/:id
  @Put(':id')
  updateAddress(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.addressesService.updateAddress(customer.customerId, customer.storeId, id, body);
  }

  // PATCH /api/storefront/addresses/:id/default
  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  setDefault(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('id') id: string,
  ) {
    return this.addressesService.setDefault(customer.customerId, customer.storeId, id);
  }

  // DELETE /api/storefront/addresses/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteAddress(
    @CurrentCustomer() customer: { customerId: string; storeId: string },
    @Param('id') id: string,
  ) {
    return this.addressesService.deleteAddress(customer.customerId, customer.storeId, id);
  }
}
