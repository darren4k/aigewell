/**
 * Equipment Marketplace - "Amazon for Healthcare Equipment"
 * SafeAging Healthcare Disruption Platform v2.0
 * 
 * High-margin revenue stream: 15% commission on $500+ AOV
 * TARGET: $15M equipment revenue annually = $2.25M platform revenue
 */

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  averageOrderValue: number;
  demandScore: number; // 1-10 based on SafeAging assessments
  commissionRate: number;
  parentCategory?: string;
}

export interface EquipmentProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  price: number; // in cents
  costOfGoods: number; // vendor cost
  platformCommission: number; // calculated commission
  vendorPayout: number; // amount to vendor
  inStock: boolean;
  stockLevel: number;
  vendorId: string;
  specifications: Record<string, any>;
  safetyRatings: {
    adaCompliant: boolean;
    fallPrevention: boolean;
    seniorFriendly: boolean;
    medicareApproved: boolean;
  };
  aiRecommendationScore: number; // Based on assessments
  reviews: {
    averageRating: number;
    totalReviews: number;
    verifiedPurchases: number;
  };
  shipping: {
    freeShipping: boolean;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    deliveryDays: number;
  };
}

export interface EquipmentOrder {
  id: string;
  patientId: string;
  items: OrderItem[];
  subtotal: number;
  platformFees: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned';
  shippingAddress: Address;
  paymentMethod: string;
  createdAt: Date;
  estimatedDelivery: Date;
  trackingNumber?: string;
  recommendedBy?: string; // PT who recommended
  aiTriggered: boolean; // Recommended by AI assessment
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  platformCommission: number;
  vendorPayout: number;
}

export interface Vendor {
  id: string;
  companyName: string;
  contactEmail: string;
  payoutMethod: 'stripe' | 'ach' | 'check';
  commissionRate: number;
  productCount: number;
  monthlyRevenue: number;
  rating: number;
  verified: boolean;
  specialties: string[];
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export class EquipmentStore {
  private products: Map<string, EquipmentProduct> = new Map();
  private orders: Map<string, EquipmentOrder> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private categories: Map<string, EquipmentCategory> = new Map();

  constructor() {
    this.initializeCategories();
    this.loadCuratedProducts(); // Darren's curated high-demand items
  }

  /**
   * AI-DRIVEN PRODUCT RECOMMENDATIONS FROM ASSESSMENTS
   */
  async getAIRecommendations(
    patientId: string, 
    assessmentData: any
  ): Promise<EquipmentProduct[]> {
    const riskFactors = this.extractRiskFactors(assessmentData);
    const recommendations: EquipmentProduct[] = [];

    // Fall risk → Safety equipment
    if (riskFactors.fallRisk > 0.7) {
      recommendations.push(
        ...this.getProductsByCategory('fall-prevention')
          .sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore)
          .slice(0, 3)
      );
    }

    // Mobility issues → Mobility aids
    if (riskFactors.mobilityIssues) {
      recommendations.push(
        ...this.getProductsByCategory('mobility-aids')
          .filter(p => p.safetyRatings.seniorFriendly)
          .slice(0, 2)
      );
    }

    // Vision problems → Lighting and visibility
    if (riskFactors.visionImpairment) {
      recommendations.push(
        ...this.getProductsByCategory('lighting-visibility')
          .slice(0, 2)
      );
    }

    // Home safety → Environmental modifications
    if (riskFactors.homeHazards > 0.5) {
      recommendations.push(
        ...this.getProductsByCategory('home-modifications')
          .slice(0, 3)
      );
    }

    return recommendations.slice(0, 8); // Max 8 recommendations
  }

  /**
   * PT-RECOMMENDED PRODUCT BUNDLES
   */
  async createPTRecommendedBundle(
    ptId: string,
    patientId: string,
    recommendedProductIds: string[],
    customNote: string
  ): Promise<{ bundle: EquipmentProduct[]; totalSavings: number; ptCommission: number }> {
    const products = recommendedProductIds
      .map(id => this.products.get(id))
      .filter(Boolean) as EquipmentProduct[];

    const bundleDiscount = 0.10; // 10% bundle discount
    const ptCommissionRate = 0.05; // 5% commission to referring PT
    
    const originalTotal = products.reduce((sum, p) => sum + p.price, 0);
    const discountedTotal = Math.round(originalTotal * (1 - bundleDiscount));
    const totalSavings = originalTotal - discountedTotal;
    const ptCommission = Math.round(discountedTotal * ptCommissionRate);

    // Track PT recommendation for commission payout
    await this.trackPTReferral(ptId, patientId, recommendedProductIds, ptCommission);

    return {
      bundle: products,
      totalSavings,
      ptCommission
    };
  }

  /**
   * PROCESS EQUIPMENT ORDER
   */
  async processOrder(
    patientId: string,
    items: Array<{ productId: string; quantity: number }>,
    shippingAddress: Address,
    paymentMethodId: string,
    recommendedBy?: string
  ): Promise<{ success: boolean; order?: EquipmentOrder; error?: string }> {
    
    try {
      // Calculate order totals
      const orderItems: OrderItem[] = [];
      let subtotal = 0;
      let platformFees = 0;

      for (const item of items) {
        const product = this.products.get(item.productId);
        if (!product) {
          return { success: false, error: `Product ${item.productId} not found` };
        }

        if (product.stockLevel < item.quantity) {
          return { success: false, error: `Insufficient stock for ${product.name}` };
        }

        const itemTotal = product.price * item.quantity;
        const itemCommission = Math.round(itemTotal * 0.15); // 15% commission
        const vendorPayout = itemTotal - itemCommission;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          platformCommission: itemCommission,
          vendorPayout
        });

        subtotal += itemTotal;
        platformFees += itemCommission;
      }

      const shippingCost = this.calculateShipping(orderItems, shippingAddress);
      const tax = Math.round(subtotal * 0.08); // 8% tax rate
      const total = subtotal + shippingCost + tax;

      const order: EquipmentOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId,
        items: orderItems,
        subtotal,
        platformFees,
        shippingCost,
        tax,
        total,
        status: 'pending',
        shippingAddress,
        paymentMethod: paymentMethodId,
        createdAt: new Date(),
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        recommendedBy,
        aiTriggered: !recommendedBy
      };

      this.orders.set(order.id, order);

      // Process payment through payment processor
      const { PaymentProcessor } = await import('./payment-processor');
      const paymentProcessor = new PaymentProcessor();
      
      // Process payment for each vendor separately
      for (const item of orderItems) {
        const product = this.products.get(item.productId)!;
        const paymentResult = await paymentProcessor.processEquipmentPayment(
          order.id,
          patientId,
          product.vendorId,
          item.unitPrice * item.quantity,
          paymentMethodId
        );

        if (!paymentResult.success) {
          return { success: false, error: paymentResult.error };
        }
      }

      // Update inventory
      for (const item of orderItems) {
        const product = this.products.get(item.productId)!;
        product.stockLevel -= item.quantity;
      }

      order.status = 'confirmed';
      
      // Schedule vendor notifications
      await this.notifyVendorsOfOrder(order);

      console.log(`📦 Equipment order processed: $${total/100} (Platform fees: $${platformFees/100})`);

      return { success: true, order };

    } catch (error) {
      return { success: false, error: 'Order processing failed' };
    }
  }

  /**
   * HIGH-DEMAND PRODUCT CURATION (Darren's Strategy)
   */
  private loadCuratedProducts(): void {
    // Top fall prevention products (highest demand from assessments)
    this.addProduct({
      id: 'grab-bar-premium-set',
      name: 'SafeGrip Premium Grab Bar Set',
      brand: 'SafetyFirst',
      category: 'fall-prevention',
      description: 'Professional-grade grab bars recommended by 95% of PTs',
      images: ['/products/grab-bars-1.jpg'],
      price: 12900, // $129
      costOfGoods: 4500,
      platformCommission: 1935, // 15%
      vendorPayout: 10965,
      inStock: true,
      stockLevel: 500,
      vendorId: 'vendor_safety_first',
      specifications: {
        material: 'Stainless Steel',
        weight_capacity: '400 lbs',
        ada_compliant: true
      },
      safetyRatings: {
        adaCompliant: true,
        fallPrevention: true,
        seniorFriendly: true,
        medicareApproved: true
      },
      aiRecommendationScore: 0.95,
      reviews: { averageRating: 4.8, totalReviews: 340, verifiedPurchases: 320 },
      shipping: { freeShipping: true, weight: 5, dimensions: { length: 24, width: 8, height: 4 }, deliveryDays: 2 }
    });

    // Mobility aids
    this.addProduct({
      id: 'walker-premium-rollator',
      name: 'Ultra-Light Premium Rollator Walker',
      brand: 'MobilityMax',
      category: 'mobility-aids',
      description: 'Lightweight aluminum rollator with seat and storage',
      images: ['/products/rollator-1.jpg'],
      price: 24900, // $249
      costOfGoods: 12000,
      platformCommission: 3735,
      vendorPayout: 21165,
      inStock: true,
      stockLevel: 200,
      vendorId: 'vendor_mobility_max',
      specifications: {
        weight: '11 lbs',
        weight_capacity: '300 lbs',
        seat_height: 'Adjustable'
      },
      safetyRatings: {
        adaCompliant: true,
        fallPrevention: true,
        seniorFriendly: true,
        medicareApproved: true
      },
      aiRecommendationScore: 0.92,
      reviews: { averageRating: 4.7, totalReviews: 180, verifiedPurchases: 165 },
      shipping: { freeShipping: true, weight: 15, dimensions: { length: 30, width: 25, height: 15 }, deliveryDays: 3 }
    });

    // Home modifications
    this.addProduct({
      id: 'bathroom-safety-bundle',
      name: 'Complete Bathroom Safety Bundle',
      brand: 'HomeSecure',
      category: 'home-modifications',
      description: 'Everything needed for bathroom safety: shower seat, grab bars, non-slip mats',
      images: ['/products/bathroom-bundle-1.jpg'],
      price: 18900, // $189
      costOfGoods: 7500,
      platformCommission: 2835,
      vendorPayout: 16065,
      inStock: true,
      stockLevel: 150,
      vendorId: 'vendor_home_secure',
      specifications: {
        includes: 'Shower seat, 3 grab bars, 2 non-slip mats, installation hardware'
      },
      safetyRatings: {
        adaCompliant: true,
        fallPrevention: true,
        seniorFriendly: true,
        medicareApproved: false
      },
      aiRecommendationScore: 0.88,
      reviews: { averageRating: 4.6, totalReviews: 120, verifiedPurchases: 115 },
      shipping: { freeShipping: true, weight: 12, dimensions: { length: 32, width: 18, height: 8 }, deliveryDays: 3 }
    });

    console.log('📦 Loaded curated high-demand products');
  }

  /**
   * VENDOR ONBOARDING AND MANAGEMENT
   */
  async onboardVendor(
    companyName: string,
    contactEmail: string,
    specialties: string[],
    initialProducts: Omit<EquipmentProduct, 'id' | 'vendorId'>[]
  ): Promise<{ vendorId: string; productsAdded: number }> {
    
    const vendor: Vendor = {
      id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyName,
      contactEmail,
      payoutMethod: 'stripe',
      commissionRate: 0.15,
      productCount: initialProducts.length,
      monthlyRevenue: 0,
      rating: 0,
      verified: false,
      specialties
    };

    this.vendors.set(vendor.id, vendor);

    // Add vendor's products
    let productsAdded = 0;
    for (const productData of initialProducts) {
      const product: EquipmentProduct = {
        ...productData,
        id: `prod_${Date.now()}_${productsAdded}`,
        vendorId: vendor.id,
        platformCommission: Math.round(productData.price * 0.15),
        vendorPayout: Math.round(productData.price * 0.85),
        aiRecommendationScore: 0.5 // Default score, improved with data
      };
      
      this.products.set(product.id, product);
      productsAdded++;
    }

    console.log(`🏪 Vendor onboarded: ${companyName} with ${productsAdded} products`);
    
    return { vendorId: vendor.id, productsAdded };
  }

  // Helper methods
  private initializeCategories(): void {
    const categories: EquipmentCategory[] = [
      {
        id: 'fall-prevention',
        name: 'Fall Prevention',
        description: 'Grab bars, non-slip mats, safety rails',
        averageOrderValue: 15000, // $150
        demandScore: 10,
        commissionRate: 0.15
      },
      {
        id: 'mobility-aids',
        name: 'Mobility Aids',
        description: 'Walkers, wheelchairs, canes, scooters',
        averageOrderValue: 35000, // $350
        demandScore: 9,
        commissionRate: 0.15
      },
      {
        id: 'home-modifications',
        name: 'Home Safety Modifications',
        description: 'Bathroom safety, stair railings, lighting',
        averageOrderValue: 25000, // $250
        demandScore: 8,
        commissionRate: 0.15
      },
      {
        id: 'lighting-visibility',
        name: 'Lighting & Visibility',
        description: 'LED lights, motion sensors, magnifiers',
        averageOrderValue: 8000, // $80
        demandScore: 7,
        commissionRate: 0.15
      },
      {
        id: 'medication-management',
        name: 'Medication Management',
        description: 'Pill organizers, medication reminders',
        averageOrderValue: 5000, // $50
        demandScore: 6,
        commissionRate: 0.15
      }
    ];

    categories.forEach(cat => this.categories.set(cat.id, cat));
  }

  private addProduct(product: EquipmentProduct): void {
    this.products.set(product.id, product);
  }

  private getProductsByCategory(categoryId: string): EquipmentProduct[] {
    return Array.from(this.products.values())
      .filter(p => p.category === categoryId && p.inStock);
  }

  private extractRiskFactors(assessmentData: any): any {
    return {
      fallRisk: assessmentData.fallRiskScore || 0.5,
      mobilityIssues: assessmentData.mobilityLimitations || false,
      visionImpairment: assessmentData.visionProblems || false,
      homeHazards: assessmentData.homeHazardScore || 0.3
    };
  }

  private calculateShipping(items: OrderItem[], address: Address): number {
    const totalWeight = items.reduce((sum, item) => {
      const product = this.products.get(item.productId)!;
      return sum + (product.shipping.weight * item.quantity);
    }, 0);

    // Free shipping for orders > $100, otherwise $15
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    return subtotal >= 10000 ? 0 : 1500; // $15 shipping
  }

  private async trackPTReferral(
    ptId: string,
    patientId: string,
    productIds: string[],
    commission: number
  ): Promise<void> {
    console.log(`💰 PT referral tracked: ${ptId} → $${commission/100} commission`);
  }

  private async notifyVendorsOfOrder(order: EquipmentOrder): Promise<void> {
    const vendorOrders = new Map<string, OrderItem[]>();
    
    // Group order items by vendor
    for (const item of order.items) {
      const product = this.products.get(item.productId)!;
      if (!vendorOrders.has(product.vendorId)) {
        vendorOrders.set(product.vendorId, []);
      }
      vendorOrders.get(product.vendorId)!.push(item);
    }

    // Send notification to each vendor
    for (const [vendorId, items] of vendorOrders) {
      const vendor = this.vendors.get(vendorId)!;
      console.log(`📧 Order notification sent to ${vendor.companyName}: ${items.length} items`);
      
      // In production: send email notification, create shipping labels, etc.
    }
  }

  // Public API methods
  async searchProducts(query: string, category?: string): Promise<EquipmentProduct[]> {
    let products = Array.from(this.products.values());
    
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    if (query) {
      const searchTerm = query.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm)
      );
    }

    return products.filter(p => p.inStock)
      .sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore);
  }

  getOrder(orderId: string): EquipmentOrder | undefined {
    return this.orders.get(orderId);
  }

  async getOrderHistory(patientId: string): Promise<EquipmentOrder[]> {
    return Array.from(this.orders.values())
      .filter(o => o.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getCategories(): EquipmentCategory[] {
    return Array.from(this.categories.values())
      .sort((a, b) => b.demandScore - a.demandScore);
  }
}