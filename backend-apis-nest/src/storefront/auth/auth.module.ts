import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { StorefrontAuthController } from './auth.controller';
import { StorefrontAuthService } from './auth.service';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [StorefrontAuthController],
  providers: [StorefrontAuthService, CustomerJwtStrategy],
  exports: [CustomerJwtStrategy, PassportModule],
})
export class StorefrontAuthModule {}
