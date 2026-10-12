import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureSausageCrustProducts();
  }

  private async ensureSausageCrustProducts() {
    try {
      const extrasCategory = await this.prisma.category.findFirst({
        where: { name: { equals: 'Extras', mode: 'insensitive' } },
      });
      if (!extrasCategory) return;

      const items = [
        { name: 'Orilla de Salchicha MD', price: 45 },
        { name: 'Orilla de Salchicha GD', price: 65 },
        { name: 'Orilla de Salchicha FAM', price: 85 },
      ];

      for (const item of items) {
        const existing = await this.prisma.product.findFirst({
          where: { name: { equals: item.name, mode: 'insensitive' } },
        });
        if (!existing) {
          await this.prisma.product.create({
            data: {
              name: item.name,
              categoryId: extrasCategory.id,
              variants: [{ name: 'Única', price: item.price }],
            },
          });
          console.log(`[CATALOGO] Producto autosembrado con éxito: ${item.name} ($${item.price})`);
        }
      }
    } catch (e) {
      console.warn('[CATALOGO] Error asegurando productos de orilla de salchicha:', e);
    }
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(data: any) {
    return this.prisma.product.create({
      data,
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
