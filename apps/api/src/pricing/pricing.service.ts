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
    price?: number;
    variantName?: string;
    productId?: string;
    productName?: string;
    categoryName?: string;
    config?: { 
      variants?: any[];
      variantName?: string;
      isHalfAndHalf?: boolean;
      halfA?: { productId?: string; price?: number; variantName?: string };
      halfB?: { productId?: string; price?: number; variantName?: string };
      isCombo?: boolean;
    }
  }): Promise<number> {
    console.log('Procesando Item:', JSON.stringify(item, null, 2));
    let unitPrice = Number(item.price || 0); // initial fallback
    const mainVariantName = item.variantName || item.config?.variantName;
    
    // Fetch product to retrieve operational flags and category fallback
    let productDetails: any = null;
    if (item.productId) {
      productDetails = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true }
      });

      if (!productDetails) {
        throw new BadRequestException(`Producto no encontrado: ${item.productId}`);
      }

      // STRICT MODE: If productId is present, we IGNORE item.price from payload
      unitPrice = 0; 

      // Find variant price — throw if the requested variant doesn't exist in DB
      const vName = mainVariantName || 'Única'; // Fallback to Única if not provided
      if (!Array.isArray(productDetails.variants) || productDetails.variants.length === 0) {
        throw new BadRequestException(`El producto '${productDetails.name}' no tiene variantes configuradas.`);
      }
      const variant = productDetails.variants.find((v: any) => v.name === vName);
      if (!variant) {
        throw new BadRequestException(`Variante de producto no válida: '${vName}' para '${productDetails.name}'`);
      }
      unitPrice = Number(variant.price);
      
      // Flavor validation
      if (Array.isArray(productDetails.flavors) && productDetails.flavors.length > 0) {
        const flavorsSent = item.config?.variants || [];
        if (flavorsSent.length === 0) {
          throw new BadRequestException(`El producto '${productDetails.name}' requiere al menos un sabor.`);
        }
        if (productDetails.maxFlavors > 0 && flavorsSent.length > productDetails.maxFlavors) {
          throw new BadRequestException(`El número de sabores (${flavorsSent.length}) supera el límite permitido (${productDetails.maxFlavors})`);
        }
      }
    }

    // Determine the category name from input or database
    const finalCategoryName = item.categoryName || productDetails?.category?.name || '';

    // 1. Handle Half-and-Half Pizza Rule with Database strictness
    if (item.config?.isHalfAndHalf) {
      let priceA = Number(item.config?.halfA?.price || 0);
      let priceB = Number(item.config?.halfB?.price || 0);

      // Trust Database over Frontend if IDs are provided
      if (item.config?.halfA?.productId) {
        const prodA = await this.prisma.product.findUnique({ where: { id: item.config.halfA.productId } });
        if (prodA) {
          const vNameA = item.config.halfA.variantName || mainVariantName;
          if (vNameA && Array.isArray(prodA.variants)) {
            const variantA = (prodA.variants as any[]).find((v: any) => v.name === vNameA);
            if (variantA && variantA.price !== undefined) priceA = Number(variantA.price);
          }
        }
      }

      if (item.config?.halfB?.productId) {
        const prodB = await this.prisma.product.findUnique({ where: { id: item.config.halfB.productId } });
        if (prodB) {
          const vNameB = item.config.halfB.variantName || mainVariantName;
          if (vNameB && Array.isArray(prodB.variants)) {
            const variantB = (prodB.variants as any[]).find((v: any) => v.name === vNameB);
            if (variantB && variantB.price !== undefined) priceB = Number(variantB.price);
          }
        }
      }

      let surcharge = 15;
      const extraProduct = await this.prisma.product.findFirst({
        where: { name: 'PIZZA MITAD Y MITAD', category: { name: 'EXTRAS' } }
      });

      if (extraProduct && Array.isArray(extraProduct.variants) && extraProduct.variants.length > 0) {
        const firstVariant: any = extraProduct.variants[0];
        if (firstVariant && firstVariant.price !== undefined) {
          surcharge = Number(firstVariant.price);
        }
      }

      unitPrice = Math.max(priceA, priceB) + surcharge;
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
