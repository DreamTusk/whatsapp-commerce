import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../shared/email.service';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

const INVITE_EXPIRY_DAYS = 3;

@Injectable()
export class InviteService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createInvite(userId: string, email: string, role: string) {
    if (!email || !role) throw new BadRequestException('email and role are required');
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role as Role)) {
      throw new BadRequestException(`role must be one of: ${validRoles.join(', ')}`);
    }

    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.userStore.findUnique({
        where: { userId_storeId: { userId: existingUser.id, storeId: userStore.storeId } },
      });
      if (alreadyMember) throw new ConflictException('This user is already a member of your store');
    }

    await this.prisma.storeInvite.deleteMany({
      where: { email, storeId: userStore.storeId, isUsed: false },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = await this.prisma.storeInvite.create({
      data: { storeId: userStore.storeId, email, role: role as Role, token, expiresAt },
      include: { Store: true },
    });

    const inviteLink = `${process.env.ADMIN_APP_URL || 'http://localhost:3011'}/accept-invite?token=${token}`;

    console.log(`\n--- STAFF INVITE ---`);
    console.log(`Store  : ${invite.Store.name}`);
    console.log(`Email  : ${email}`);
    console.log(`Role   : ${role}`);
    console.log(`Link   : ${inviteLink}`);
    console.log(`Expires: ${invite.expiresAt.toISOString()}`);
    console.log(`--------------------\n`);

    return {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expiresAt,
        created_at: invite.createdAt,
      },
    };
  }

  async listInvites(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const invites = await this.prisma.storeInvite.findMany({
      where: { storeId: userStore.storeId, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    return {
      invites: invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expiresAt,
        created_at: inv.createdAt,
      })),
    };
  }

  async cancelInvite(userId: string, inviteId: string) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const invite = await this.prisma.storeInvite.findFirst({
      where: { id: inviteId, storeId: userStore.storeId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.isUsed) throw new ConflictException('Cannot cancel an already accepted invite');

    await this.prisma.storeInvite.delete({ where: { id: invite.id } });

    return { message: 'Invite cancelled successfully' };
  }
}
