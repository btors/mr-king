import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the price for a single order item.
   * - Pizzas medias (half-and-half): max(halfA, halfB) + 15
   * - Burgers/Hot Dogs Combo: base price + surcharge (+20 for Burger, +15 for Hot Dog)
   * - Wings Scaling: Tiered pricing (6:$85, 12:$160, 18:$230, 24:$290, 36:$380)
   */
  async calculateOrderItemPrice(item: { 
    quantity: number; 
    price: number;
    productId?: string;
    productName?: string;
    categoryName?: string;
    config?: { 
      variants?: any[];
      isHalfAndHalf?: boolean;
      halfA?: { productId?: string; price?: number };
      halfB?: { productId?: string; price?: number };
      isCombo?: boolean;
    }
  }): Promise<number> {
    console.log('Procesando Item:', JSON.stringify(item, null, 2));
    let unitPrice = Number(item.price || 0);
    
    // Fetch product to retrieve operational flags and category fallback
    let productDetails: any = null;
    if (item.productId) {
      productDetails = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true }
      });

      if (productDetails && item.config?.variants) {
        if (productDetails.maxSauces > 0 && item.config.variants.length > productDetails.maxSauces) {
          throw new BadRequestException('El número de salsas supera el límite permitido');
        }
      }
    }

    // Determine the category name from input or database
    const finalCategoryName = item.categoryName || productDetails?.category?.name || '';

    // 1. Handle Wings Scaling (Alitas)
    if (finalCategoryName === 'ALITAS' || item.productName === 'Alitas') {
      const wingsTiers: Record<number, number> = {
        6: 85,
        12: 160,
        18: 230,
        24: 290,
        36: 380,
      };
      
      if (wingsTiers[item.quantity]) {
        return wingsTiers[item.quantity]; // Return fixed tier price, ignoring unit multiplication
      }
    }

    // 2. Handle Half-and-Half Pizza Rule with Database strictness
    if (item.config?.isHalfAndHalf) {
      let priceA = Number(item.config?.halfA?.price || 0);
      let priceB = Number(item.config?.halfB?.price || 0);

      // Trust Database over Frontend if IDs are provided
      if (item.config?.halfA?.productId) {
        const prodA = await this.prisma.product.findUnique({ where: { id: item.config.halfA.productId } });
        if (prodA) priceA = Number(prodA.price);
      }

      if (item.config?.halfB?.productId) {
        const prodB = await this.prisma.product.findUnique({ where: { id: item.config.halfB.productId } });
        if (prodB) priceB = Number(prodB.price);
      }

      unitPrice = Math.max(priceA, priceB) + 15;
    }

    // 3. Handle Combo Logic for Burgers and Hot Dogs
    if (item.config?.isCombo) {
      if (finalCategoryName === 'HAMBURGUESAS') {
        unitPrice += 20; // Surcharge for Burger combo
      } else if (finalCategoryName === 'HOT DOGS') {
        unitPrice += 15; // Surcharge for Hot Dog combo
      }
    }

    return unitPrice * item.quantity;
  }

  /**
   * Calculates the total price for an array of order items asynchronously.
   */
  async calculateOrderTotal(items: { 
    quantity: number; 
    price: number; 
    productId?: string;
    productName?: string;
    categoryName?: string;
    config?: { 
      variants?: any[];
      isHalfAndHalf?: boolean;
      halfA?: { productId?: string; price?: number };
      halfB?: { productId?: string; price?: number };
      isCombo?: boolean;
    }
  }[]): Promise<number> {
    let total = 0;
    for (const item of items) {
      total += await this.calculateOrderItemPrice(item);
    }
    return total;
  }
}
