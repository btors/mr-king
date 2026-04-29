import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PizzasService {
  constructor(private readonly prisma: PrismaService) {}

  async getSizesAndPrices() {
    // We assume that products in the PIZZAS category with requiresSizes: true
    // represent the MD size price.
    const pizzas = await this.prisma.product.findMany({
      where: {
        category: { name: 'PIZZAS' },
        requiresSizes: true,
      },
    });

    return pizzas.map((p) => {
      const basePrice = Number(p.price);
      return {
        id: p.id,
        name: p.name,
        prices: {
          MD: basePrice,
          GD: basePrice + 20,
          FM: basePrice + 70,
        },
      };
    });
  }
}
