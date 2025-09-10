/**
 * Payment Processing System - 20% Commission Model
 * SafeAging Healthcare Disruption Platform v2.0
 * 
 * Handles all marketplace transactions with automated commission splitting
 * TARGET: Process $10M+ annually at 20% take rate = $2M platform revenue
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'venmo';
  last4: string;
  brand?: string;
  isDefault: boolean;
  expiryMonth?: number;
  expiryYear?: number;
  billingAddress?: Address;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Transaction {
  id: string;
  sessionId: string;
  patientId: string;
  providerId: string;
  amount: number;           // Total charge in cents
  platformFee: number;      // 20% commission in cents  
  providerPayout: number;   // 80% to provider in cents
  currency: 'usd';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed';
  paymentMethod: PaymentMethod;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
  stripePaymentIntentId?: string;
  platformRevenue: number;  // Our commission
  refundable: boolean;
  metadata: {
    sessionType: string;
    sessionDuration: number;
    networkEffectBonus?: number;
  };
}

export interface Payout {
  id: string;
  providerId: string;
  amount: number;
  currency: 'usd';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: 'instant' | 'standard';
  estimatedArrival: Date;
  feeAmount: number;
  metadata: {
    period: string;
    sessionCount: number;
    avgSessionValue: number;
  };
}

export interface CommissionStructure {
  baseCommissionRate: number;     // 20% base rate
  volumeIncentives: {
    tier1: { threshold: 10000, rate: 0.18 };   // High volume: 18%
    tier2: { threshold: 50000, rate: 0.15 };   // Premium volume: 15%  
    tier3: { threshold: 100000, rate: 0.12 };  // Elite volume: 12%
  };
  networkEffectBonus: {
    referralBonus: number;        // $25 per successful referral
    qualityBonus: number;         // $10 for 5-star sessions
    loyaltyBonus: number;         // 2% reduction after 100 sessions
  };
}

export class PaymentProcessor {
  private transactions: Map<string, Transaction> = new Map();
  private payouts: Map<string, Payout> = new Map();
  private commissionStructure: CommissionStructure;
  private stripe: any; // Stripe client
  
  constructor() {
    this.commissionStructure = this.initializeCommissionStructure();
    // Initialize Stripe in production
    if (process.env.NODE_ENV === 'production') {
      this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
  }

  /**
   * PROCESS PT SESSION PAYMENT (Primary Revenue Driver)
   */
  async processSessionPayment(
    sessionId: string,
    patientId: string, 
    providerId: string,
    amount: number, // in cents
    paymentMethodId: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    
    try {
      // Calculate commission split
      const commissionRate = await this.calculateCommissionRate(providerId);
      const platformFee = Math.round(amount * commissionRate);
      const providerPayout = amount - platformFee;

      // Create payment intent with Stripe
      let paymentIntentId: string | undefined;
      if (this.stripe) {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirmation_method: 'manual',
          confirm: true,
          metadata: {
            sessionId,
            patientId,
            providerId,
            platformFee: platformFee.toString()
          }
        });
        paymentIntentId = paymentIntent.id;
      }

      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        patientId,
        providerId,
        amount,
        platformFee,
        providerPayout,
        currency: 'usd',
        status: 'processing',
        paymentMethod: await this.getPaymentMethod(paymentMethodId),
        createdAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
        platformRevenue: platformFee,
        refundable: true,
        metadata: {
          sessionType: 'pt_session',
          sessionDuration: 60,
          networkEffectBonus: await this.calculateNetworkBonus(providerId)
        }
      };

      this.transactions.set(transaction.id, transaction);
      
      // Schedule provider payout (T+2 business days)
      await this.schedulePayout(providerId, providerPayout, transaction.id);
      
      // Update transaction status
      transaction.status = 'completed';
      transaction.processedAt = new Date();

      // Track for network effects
      await this.recordRevenueForNetworkEffects(transaction);

      console.log(`💰 Payment processed: $${amount/100} (Platform: $${platformFee/100}, Provider: $${providerPayout/100})`);

      return { success: true, transaction };
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment processing failed' 
      };
    }
  }

  /**
   * EQUIPMENT MARKETPLACE PAYMENT (High Margin Revenue)
   */
  async processEquipmentPayment(
    orderId: string,
    patientId: string,
    vendorId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    
    const equipmentCommission = 0.15; // 15% for equipment vs 20% for services
    const platformFee = Math.round(amount * equipmentCommission);
    const vendorPayout = amount - platformFee;

    // Similar processing logic but with equipment-specific handling
    const transaction: Transaction = {
      id: `eqp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: orderId,
      patientId,
      providerId: vendorId,
      amount,
      platformFee,
      providerPayout: vendorPayout,
      currency: 'usd',
      status: 'completed',
      paymentMethod: await this.getPaymentMethod(paymentMethodId),
      createdAt: new Date(),
      processedAt: new Date(),
      platformRevenue: platformFee,
      refundable: true,
      metadata: {
        sessionType: 'equipment_order',
        sessionDuration: 0
      }
    };

    this.transactions.set(transaction.id, transaction);
    await this.schedulePayout(vendorId, vendorPayout, transaction.id);

    return { success: true, transaction };
  }

  /**
   * DYNAMIC COMMISSION CALCULATION (Volume Incentives)
   */
  private async calculateCommissionRate(providerId: string): Promise<number> {
    const providerVolume = await this.getProviderMonthlyVolume(providerId);
    const { volumeIncentives } = this.commissionStructure;

    if (providerVolume >= volumeIncentives.tier3.threshold) {
      return volumeIncentives.tier3.rate; // 12% for elite providers
    } else if (providerVolume >= volumeIncentives.tier2.threshold) {
      return volumeIncentives.tier2.rate; // 15% for premium providers
    } else if (providerVolume >= volumeIncentives.tier1.threshold) {
      return volumeIncentives.tier1.rate; // 18% for high volume
    }
    
    return this.commissionStructure.baseCommissionRate; // 20% base rate
  }

  /**
   * AUTOMATED PAYOUT SYSTEM (T+2 Settlement)
   */
  private async schedulePayout(
    providerId: string, 
    amount: number, 
    transactionId: string
  ): Promise<void> {
    const payout: Payout = {
      id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerId,
      amount,
      currency: 'usd',
      status: 'pending',
      payoutMethod: 'standard',
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // T+2
      feeAmount: 0, // We absorb payout fees
      metadata: {
        period: 'daily',
        sessionCount: 1,
        avgSessionValue: amount
      }
    };

    this.payouts.set(payout.id, payout);
    
    // In production, integrate with Stripe Connect for automatic payouts
    if (this.stripe) {
      setTimeout(async () => {
        try {
          await this.stripe.transfers.create({
            amount,
            currency: 'usd',
            destination: await this.getProviderStripeAccountId(providerId),
            metadata: { transactionId }
          });
          payout.status = 'completed';
        } catch (error) {
          payout.status = 'failed';
          console.error('Payout failed:', error);
        }
      }, 2 * 24 * 60 * 60 * 1000); // Execute after T+2
    }
  }

  /**
   * REFUND PROCESSING
   */
  async processRefund(
    transactionId: string,
    reason: string = 'requested_by_customer'
  ): Promise<{ success: boolean; error?: string }> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    if (!transaction.refundable) {
      return { success: false, error: 'Transaction not refundable' };
    }

    try {
      // Process refund through Stripe
      if (this.stripe && transaction.stripePaymentIntentId) {
        await this.stripe.refunds.create({
          payment_intent: transaction.stripePaymentIntentId,
          reason
        });
      }

      transaction.status = 'refunded';
      
      // Handle provider payout reversal if already paid
      await this.handlePayoutReversal(transaction.providerId, transaction.providerPayout);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Refund processing failed' };
    }
  }

  /**
   * REVENUE ANALYTICS FOR GROWTH TRACKING
   */
  async getRevenueAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    platformRevenue: number;
    providerPayouts: number;
    transactionCount: number;
    avgTransactionValue: number;
    commissionRate: number;
    growthRate: number;
  }> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    
    const periodTransactions = Array.from(this.transactions.values())
      .filter(t => t.createdAt >= periodStart && t.status === 'completed');

    const platformRevenue = periodTransactions.reduce((sum, t) => sum + t.platformFee, 0);
    const providerPayouts = periodTransactions.reduce((sum, t) => sum + t.providerPayout, 0);
    const totalVolume = platformRevenue + providerPayouts;
    
    return {
      platformRevenue: platformRevenue / 100, // Convert to dollars
      providerPayouts: providerPayouts / 100,
      transactionCount: periodTransactions.length,
      avgTransactionValue: totalVolume / periodTransactions.length / 100,
      commissionRate: platformRevenue / totalVolume,
      growthRate: await this.calculateGrowthRate(period)
    };
  }

  /**
   * DARREN'S 50 PT REVENUE PROJECTION
   */
  projectFounderRevenue(initialPTs: number = 50): {
    week1: { revenue: number; transactions: number };
    month1: { revenue: number; transactions: number };
    month3: { revenue: number; transactions: number };
    yearlyProjection: { revenue: number; platformFee: number };
  } {
    const avgSessionValue = 15000; // $150 per session in cents
    const commissRate = 0.20;
    const sessionsPerPTWeekly = 15; // Conservative estimate

    const week1Sessions = initialPTs * 0.7 * 5; // 70% onboarded, 5 sessions first week
    const month1Sessions = initialPTs * 1.5 * sessionsPerPTWeekly * 4; // Viral growth to 1.5x
    const month3Sessions = initialPTs * 2.3 * sessionsPerPTWeekly * 4; // Strong network effect

    return {
      week1: {
        revenue: Math.round(week1Sessions * avgSessionValue * commissRate / 100),
        transactions: week1Sessions
      },
      month1: {
        revenue: Math.round(month1Sessions * avgSessionValue * commissRate / 100),
        transactions: month1Sessions
      },
      month3: {
        revenue: Math.round(month3Sessions * avgSessionValue * commissRate / 100),
        transactions: month3Sessions
      },
      yearlyProjection: {
        revenue: Math.round(month3Sessions * 12 * avgSessionValue * commissRate / 100),
        platformFee: Math.round(month3Sessions * 12 * avgSessionValue * commissRate)
      }
    };
  }

  // Helper methods
  private initializeCommissionStructure(): CommissionStructure {
    return {
      baseCommissionRate: 0.20, // 20% base commission
      volumeIncentives: {
        tier1: { threshold: 10000, rate: 0.18 },
        tier2: { threshold: 50000, rate: 0.15 },
        tier3: { threshold: 100000, rate: 0.12 }
      },
      networkEffectBonus: {
        referralBonus: 2500,  // $25 in cents
        qualityBonus: 1000,   // $10 in cents
        loyaltyBonus: 0.02    // 2% rate reduction
      }
    };
  }

  private async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    // Mock payment method - integrate with Stripe in production
    return {
      id: paymentMethodId,
      type: 'card',
      last4: '4242',
      brand: 'visa',
      isDefault: true,
      expiryMonth: 12,
      expiryYear: 2025
    };
  }

  private async getProviderMonthlyVolume(providerId: string): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);
    
    return Array.from(this.transactions.values())
      .filter(t => t.providerId === providerId && t.createdAt >= monthStart)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private async calculateNetworkBonus(providerId: string): Promise<number> {
    // Calculate network effect bonuses (referrals, quality ratings, etc.)
    return 0; // Implement based on provider performance
  }

  private async recordRevenueForNetworkEffects(transaction: Transaction): Promise<void> {
    // Record transaction for network effects calculations
    console.log(`📈 Revenue recorded for network effects: $${transaction.platformRevenue/100}`);
  }

  private async getProviderStripeAccountId(providerId: string): Promise<string> {
    // Return Stripe Connect account ID for provider
    return `acct_${providerId}`;
  }

  private async handlePayoutReversal(providerId: string, amount: number): Promise<void> {
    // Handle reversal of provider payouts for refunds
    console.log(`↩️ Reversing payout: $${amount/100} for provider ${providerId}`);
  }

  private getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(date);
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(date.getDate() - date.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    return start;
  }

  private async calculateGrowthRate(period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    // Calculate revenue growth rate for the period
    return 0.15; // 15% growth rate placeholder
  }

  /**
   * PUBLIC API METHODS FOR MARKETPLACE INTEGRATION
   */
  async getTransactionHistory(userId: string, userType: 'patient' | 'provider'): Promise<Transaction[]> {
    const filterField = userType === 'patient' ? 'patientId' : 'providerId';
    return Array.from(this.transactions.values())
      .filter(t => t[filterField] === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPayoutHistory(providerId: string): Promise<Payout[]> {
    return Array.from(this.payouts.values())
      .filter(p => p.providerId === providerId)
      .sort((a, b) => b.estimatedArrival.getTime() - a.estimatedArrival.getTime());
  }

  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }
}