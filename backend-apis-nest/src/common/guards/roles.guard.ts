import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    if (!userId) return false;

    const userStore = await this.prisma.userStore.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    });

    if (!userStore) {
      throw new ForbiddenException('You do not have access to this store');
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any role can access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(userStore.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
