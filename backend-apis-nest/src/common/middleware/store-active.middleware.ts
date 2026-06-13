import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoreActiveMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const domain = req.headers['x-store-domain'] as string | undefined;

    if (!domain) return next();

    const store = await this.prisma.store.findUnique({
      where: { domain },
      select: { isActive: true },
    });

    if (!store || !store.isActive) {
      res.status(503).json({ message: 'Store is not active' });
      return;
    }

    next();
  }
}
