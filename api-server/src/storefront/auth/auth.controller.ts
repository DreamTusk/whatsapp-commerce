import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StorefrontAuthService } from './auth.service';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentCustomer } from '../../common/decorators/current-customer.decorator';

@Controller('storefront/auth')
export class StorefrontAuthController {
  constructor(private authService: StorefrontAuthService) {}

  // GET /api/storefront/auth/methods
  @Get('methods')
  getMethods(@Headers('x-store-domain') domain: string) {
    return this.authService.getMethods(domain);
  }

  // POST /api/storefront/auth/send-otp
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(
    @Headers('x-store-domain') domain: string,
    @Body() body: { phone: string },
  ) {
    return this.authService.sendOtp(domain, body.phone);
  }

  // POST /api/storefront/auth/verify-otp
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Headers('x-store-domain') domain: string,
    @Body() body: { phone: string; otp: string },
  ) {
    return this.authService.verifyOtp(domain, body.phone, body.otp);
  }

  // GET /api/storefront/auth/me
  @Get('me')
  @UseGuards(CustomerAuthGuard)
  getMe(@CurrentCustomer() customer: { customerId: string }) {
    return this.authService.getMe(customer.customerId);
  }

  // PUT /api/storefront/auth/profile
  @Put('profile')
  @UseGuards(CustomerAuthGuard)
  updateProfile(
    @CurrentCustomer() customer: { customerId: string },
    @Body() body: { name: string; email?: string },
  ) {
    return this.authService.updateProfile(customer.customerId, body.name, body.email);
  }

  // POST /api/storefront/auth/logout
  @Post('logout')
  @UseGuards(CustomerAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentCustomer() customer: { jti: string }) {
    return this.authService.logout(customer.jti);
  }
}
