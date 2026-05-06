import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { name, username, password, role, isActive } = data;
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role || Role.WAITER,
        isActive: isActive !== undefined ? isActive : true,
      },
    });
  }

  async findOneByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findOneById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findOneByRole(role: Role) {
    return this.prisma.user.findFirst({
      where: { role },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
  }

  async update(id: string, data: any) {
    const { name, username, password, role, isActive } = data;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { 
        _count: { 
          select: { 
            orders: true,
            shiftsOpened: true,
            shiftsClosed: true
          } 
        } 
      }
    });
    
    if (!user) return null;
    
    const hasHistory = user._count.orders > 0 || 
                       user._count.shiftsOpened > 0 || 
                       user._count.shiftsClosed > 0;
    
    if (hasHistory) {
      // If user has orders or shifts, we don't delete, we just deactivate
      return this.prisma.user.update({
        where: { id },
        data: { isActive: false }
      });
    }
    
    return this.prisma.user.delete({
      where: { id }
    });
  }
}
