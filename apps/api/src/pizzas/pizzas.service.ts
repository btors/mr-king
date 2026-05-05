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
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const getPrice = (name: string) => {
         const v = variants.find((val: any) => val && val.name === name);
         return v ? Number((v as any).price) : 0;
      };
      
      const mdPrice = getPrice('MD');
      
      return {
        id: p.id,
        name: p.name,
        prices: {
          MD: mdPrice || 0,
          GD: getPrice('GD') || (mdPrice ? mdPrice + 20 : 0),
          FM: getPrice('FM') || (mdPrice ? mdPrice + 70 : 0),
        },
      };
    });
  }
}
