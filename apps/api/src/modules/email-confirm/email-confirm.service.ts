import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailConfirmService {
  constructor(private prisma: PrismaService) {}

  async find() {
    const record = await this.prisma.emailConfirm.findFirst({ where: { status: 1 } });
    return record ?? await this.prisma.emailConfirm.findFirst();
  }

  async update(data: any) {
    const existing = await this.prisma.emailConfirm.findFirst();
    if (existing) {
      return this.prisma.emailConfirm.update({ where: { id: existing.id }, data });
    }
    return this.prisma.emailConfirm.create({ data });
  }
}
