import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('CUSTOMER_JWT_SECRET') as string,
    });
  }

  async validate(payload: { customerId: string; storeId: string; phone: string; jti: string }) {
    const token = await this.prisma.customerToken.findUnique({ where: { jti: payload.jti } });
    if (!token || token.isRevoked) throw new UnauthorizedException('Token is invalid or has been revoked');
    return { customerId: payload.customerId, storeId: payload.storeId, phone: payload.phone, jti: payload.jti };
  }
}
