import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/auth/signup
  @Post('signup')
  signup(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.signup(body.name, body.email, body.password);
  }

  // POST /api/auth/resend-otp
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() body: { email: string }) {
    return this.authService.resendOtp(body.email);
  }

  // POST /api/auth/verify-user
  @Post('verify-user')
  @HttpCode(HttpStatus.OK)
  verifyUser(@Body() body: { user_id: string; otp: string }) {
    return this.authService.verifyUser(body.user_id, body.otp);
  }

  // POST /api/auth/forgot-password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  // POST /api/auth/reset-password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { email: string; otp: string; new_password: string }) {
    return this.authService.resetPassword(body.email, body.otp, body.new_password);
  }

  // POST /api/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // POST /api/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() body: { refresh_token: string }) {
    return this.authService.logout(body.refresh_token);
  }

  // GET /api/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  // GET /api/auth/invite/:token
  @Get('invite/:token')
  getInvite(@Param('token') token: string) {
    return this.authService.getInvite(token);
  }

  // POST /api/auth/accept-invite
  @Post('accept-invite')
  @HttpCode(HttpStatus.CREATED)
  acceptInvite(
    @Body() body: { token: string; name?: string; password?: string },
    @Headers('authorization') authHeader: string,
  ) {
    return this.authService.acceptInvite(body.token, body.name, body.password, authHeader);
  }
}
