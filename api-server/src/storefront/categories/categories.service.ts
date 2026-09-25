import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontCategoriesService {
  constructor(private prisma: PrismaService) {}

  async listCategories(storeId: string) {
    const all = await this.prisma.category.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, imageUrl: true, parentId: true },
    });

    const childrenMap = new Map<string, typeof all>();
    for (const cat of all) {
      if (cat.parentId) {
        const arr = childrenMap.get(cat.parentId) ?? [];
        arr.push(cat);
        childrenMap.set(cat.parentId, arr);
      }
    }

    const categories = all
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        image_url: c.imageUrl,
        children: (childrenMap.get(c.id) ?? []).map((ch) => ({
          id: ch.id,
          name: ch.name,
          image_url: ch.imageUrl,
        })),
      }));

    return { categories };
  }
}
