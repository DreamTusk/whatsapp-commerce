import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  private format(m: any) {
    return {
      id: m.id,
      user_id: m.userId,
      name: m.User.name,
      email: m.User.email,
      role: m.role,
      is_active: m.isActive,
      joined_at: m.createdAt,
    };
  }

  async listMembers(userId: string) {
    const storeId = await this.getStoreId(userId);

    const members = await this.prisma.userStore.findMany({
      where: { storeId },
      include: { User: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { members: members.map((m) => this.format(m)) };
  }

  async updateStatus(userId: string, userStoreId: string, is_active: boolean) {
    const storeId = await this.getStoreId(userId);

    const member = await this.prisma.userStore.findFirst({
      where: { id: userStoreId, storeId },
    });
    if (!member) throw new NotFoundException('User not found');
    if (member.userId === userId) throw new ForbiddenException('You cannot deactivate yourself');

    const updated = await this.prisma.userStore.update({
      where: { id: userStoreId },
      data: { isActive: is_active },
      include: { User: { select: { id: true, name: true, email: true } } },
    });

    return { member: this.format(updated) };
  }

  async removeMember(userId: string, userStoreId: string) {
    const storeId = await this.getStoreId(userId);

    const member = await this.prisma.userStore.findFirst({
      where: { id: userStoreId, storeId },
    });
    if (!member) throw new NotFoundException('User not found');
    if (member.userId === userId) throw new ForbiddenException('You cannot remove yourself');

    await this.prisma.userStore.delete({ where: { id: userStoreId } });

    return { message: 'User removed successfully' };
  }
}
