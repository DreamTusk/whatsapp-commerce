import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoreResolverMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const domain = req.headers['x-store-domain'] as string | undefined;

    if (!domain) {
      res.status(400).json({ message: 'Missing x-store-domain header' });
      return;
    }

    const store = await this.prisma.store.findUnique({ where: { domain } });

    if (!store) {
      res.status(404).json({ message: 'Store not found' });
      return;
    }

    if (!store.isActive) {
      res.status(400).json({ message: 'Store is not active' });
      return;
    }

    (req as Request & { store: typeof store }).store = store;
    next();
  }
}
