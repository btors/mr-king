import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        products: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(data: any) {
    return this.prisma.category.create({
      data,
    });
  }

  async update(id: string, data: any) {
    // Ensuring category exists
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Ensuring category exists
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
