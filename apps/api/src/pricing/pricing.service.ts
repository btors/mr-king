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
      sauces?: any[];
      flavor?: string;
    }
  }): Promise<number> {
    console.log('Procesando Item:', JSON.stringify(item, null, 2));
    let unitPrice = Number(item.price || 0); // initial fallback
    const config = item.config || {};
    const mainVariantName = item.variantName || config.variantName;
    
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

      // Michelada flavor-to-variant price resolution
      let resolvedVariantName = vName;
      if (productDetails.name.toLowerCase().includes('michelada') && vName.toLowerCase() === 'única') {
        const rawVariants = config.variants || config.sauces || (config.flavor ? [config.flavor] : []);
        const flavorsSent = Array.isArray(rawVariants) 
          ? rawVariants 
          : typeof rawVariants === 'string' 
            ? [rawVariants] 
            : [];
        if (flavorsSent.length > 0 && typeof flavorsSent[0] === 'string') {
          const flavorVariant = productDetails.variants.find((v: any) => v.name.toLowerCase() === flavorsSent[0].toLowerCase());
          if (flavorVariant) {
            resolvedVariantName = flavorVariant.name;
          }
        }
      }

      const variant = productDetails.variants.find((v: any) => v.name.toLowerCase() === resolvedVariantName.toLowerCase());
      if (!variant) {
        throw new BadRequestException(`Variante de producto no válida: '${resolvedVariantName}' para '${productDetails.name}'`);
      }
      unitPrice = Number(variant.price);
      
      // Flavor validation
      if (Array.isArray(productDetails.flavors) && productDetails.flavors.length > 0) {
        const rawVariants = config.variants || config.sauces || (config.flavor ? [config.flavor] : []);
        const flavorsSent = Array.isArray(rawVariants) 
          ? rawVariants 
          : typeof rawVariants === 'string' 
            ? [rawVariants] 
            : [];

        if (flavorsSent.length === 0) {
          throw new BadRequestException(`El producto '${productDetails.name}' requiere al menos un sabor/salsa.`);
        }
        if (productDetails.maxFlavors > 0 && flavorsSent.length > productDetails.maxFlavors) {
          throw new BadRequestException(`El número de sabores (${flavorsSent.length}) supera el límite permitido (${productDetails.maxFlavors})`);
        }

        // Validate each flavor is allowed in case-insensitive match
        const allowedFlavorsLower = productDetails.flavors.map((f: string) => f.toLowerCase());
        for (const flavorSent of flavorsSent) {
          if (typeof flavorSent !== 'string') {
            throw new BadRequestException(`Formato de sabor no válido para '${productDetails.name}'`);
          }
          if (!allowedFlavorsLower.includes(flavorSent.toLowerCase())) {
            throw new BadRequestException(`El sabor '${flavorSent}' no es válido para '${productDetails.name}'. Sabores permitidos: ${productDetails.flavors.join(', ')}`);
          }
        }
      }
    }

    // Determine the category name from input or database
    const finalCategoryName = item.categoryName || productDetails?.category?.name || '';

    // 1. Handle Half-and-Half Pizza Rule with Database strictness
    if (config.isHalfAndHalf) {
      let priceA = Number(config.halfA?.price || 0);
      let priceB = Number(config.halfB?.price || 0);

      // Trust Database over Frontend if IDs are provided
      if (config.halfA?.productId) {
        const prodA = await this.prisma.product.findUnique({ where: { id: config.halfA.productId } });
        if (prodA) {
          const vNameA = config.halfA.variantName || mainVariantName;
          if (vNameA && Array.isArray(prodA.variants)) {
            const variantA = (prodA.variants as any[]).find((v: any) => v.name.toLowerCase() === vNameA.toLowerCase());
            if (variantA && variantA.price !== undefined) priceA = Number(variantA.price);
          }
        }
      }

      if (config.halfB?.productId) {
        const prodB = await this.prisma.product.findUnique({ where: { id: config.halfB.productId } });
        if (prodB) {
          const vNameB = config.halfB.variantName || mainVariantName;
          if (vNameB && Array.isArray(prodB.variants)) {
            const variantB = (prodB.variants as any[]).find((v: any) => v.name.toLowerCase() === vNameB.toLowerCase());
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

    return Math.round(unitPrice * item.quantity * 100) / 100;
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
    return Math.round(total * 100) / 100;
  }
}
