import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage.service';

type RawCategory = {
  id: string; name: string; imageUrl: string | null;
  isActive: boolean; parentId: string | null; storeId: string; createdAt: Date;
};

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private formatCategory(cat: RawCategory, children: RawCategory[] = []): any {
    return {
      id: cat.id,
      name: cat.name,
      image_url: cat.imageUrl,
      is_active: cat.isActive,
      parent_id: cat.parentId,
      store_id: cat.storeId,
      created_at: cat.createdAt,
      children: children.map((c) => this.formatCategory(c)),
    };
  }

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listCategories(userId: string) {
    const storeId = await this.getStoreId(userId);

    const all = await this.prisma.category.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });

    const childrenMap = new Map<string, RawCategory[]>();
    for (const cat of all) {
      if (cat.parentId) {
        const arr = childrenMap.get(cat.parentId) ?? [];
        arr.push(cat);
        childrenMap.set(cat.parentId, arr);
      }
    }

    const topLevel = all
      .filter((c) => !c.parentId)
      .map((c) => this.formatCategory(c, childrenMap.get(c.id) ?? []));

    return { categories: topLevel };
  }

  async createCategory(
    userId: string,
    body: { name: string; is_active?: string; parent_id?: string },
    file?: Express.Multer.File,
  ) {
    const storeId = await this.getStoreId(userId);

    if (!body.name?.trim()) throw new BadRequestException('name is required');

    if (body.parent_id) {
      const parent = await this.prisma.category.findFirst({
        where: { id: body.parent_id, storeId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId) throw new BadRequestException('Only one level of sub-categories is allowed');
    }

    let imageUrl: string | null = null;
    if (file) imageUrl = await this.storageService.uploadImage(file.buffer, 'categories') || null;

    const category = await this.prisma.category.create({
      data: {
        name: body.name.trim(),
        imageUrl,
        isActive: body.is_active !== undefined ? body.is_active === 'true' : true,
        parentId: body.parent_id || null,
        storeId,
      },
    });

    return { category: this.formatCategory(category) };
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    body: { name?: string; is_active?: string; parent_id?: string },
    file?: Express.Multer.File,
  ) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.category.findFirst({ where: { id: categoryId, storeId } });
    if (!existing) throw new NotFoundException('Category not found');

    if (body.parent_id) {
      if (body.parent_id === categoryId) throw new BadRequestException('Category cannot be its own parent');
      const parent = await this.prisma.category.findFirst({ where: { id: body.parent_id, storeId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId) throw new BadRequestException('Only one level of sub-categories is allowed');
    }

    let imageUrl: string | undefined = undefined;
    if (file) imageUrl = await this.storageService.uploadImage(file.buffer, 'categories') || undefined;

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.parent_id !== undefined && { parentId: body.parent_id || null }),
      },
    });

    return { category: this.formatCategory(category) };
  }

  async deleteCategory(userId: string, categoryId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId },
      include: { children: true },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing.children.length > 0) throw new BadRequestException('Delete all sub-categories first');

    await this.prisma.category.delete({ where: { id: categoryId } });

    return { message: 'Category deleted successfully' };
  }
}
