import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Store } from '@prisma/client';

export const CurrentStore = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Store => {
    const request = ctx.switchToHttp().getRequest();
    return request.store;
  },
);
