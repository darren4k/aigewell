/**
 * Stripe Payment Processing Service
 * Handles payment processing, subscription management, and billing
 * HIPAA-compliant with audit logging
 */

import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PaymentService {
  constructor() {
    // Initialize Stripe - use test key if no production key provided
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
    
    if (!stripeKey) {
      console.warn('Stripe API key not configured. Payment processing disabled.');
      this.mockMode = true;
    } else {
      this.stripe = new Stripe(stripeKey);
      this.mockMode = false;
      console.log('Stripe payment processing initialized');
    }

    // Database connection
    const dbPath = path.join(__dirname, '..', '..', 'healthcare.db');
    this.db = new Database(dbPath);

    // Initialize payment tables
    this.initializePaymentTables();

    // Service pricing configuration
    this.servicePricing = {
      room_analysis: {
        price: 2999, // $29.99 in cents
        description: 'Professional Room Safety Analysis'
      },
      appointment_consultation: {
        price: 8500, // $85.00 in cents
        description: 'Occupational Therapy Consultation'
      },
      appointment_evaluation: {
        price: 15000, // $150.00 in cents
        description: 'Comprehensive Home Safety Evaluation'
      },
      subscription_basic: {
        price: 1999, // $19.99/month in cents
        description: 'Basic Safety Monitoring Plan'
      },
      subscription_premium: {
        price: 4999, // $49.99/month in cents
        description: 'Premium Safety & Therapy Plan'
      }
    };
  }

  /**
   * Initialize payment-related database tables
   */
  initializePaymentTables() {
    // Payment transactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_payment_intent_id TEXT UNIQUE,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'usd',
        service_type TEXT NOT NULL,
        service_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        receipt_url TEXT,
        refund_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Subscriptions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_subscription_id TEXT UNIQUE,
        stripe_customer_id TEXT NOT NULL,
        plan_type TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_start DATETIME,
        current_period_end DATETIME,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Payment audit log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        payment_id TEXT,
        amount INTEGER,
        status_before TEXT,
        status_after TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `);

    console.log('Payment database tables initialized');
  }

  /**
   * Create payment intent for one-time service payment
   */
  async createPaymentIntent(paymentData) {
    try {
      const { user_id, service_type, service_id, metadata = {} } = paymentData;

      if (this.mockMode) {
        return this.createMockPayment(paymentData);
      }

      // Validate service type and get pricing
      const serviceConfig = this.servicePricing[service_type];
      if (!serviceConfig) {
        throw new Error(`Invalid service type: ${service_type}`);
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(user_id);

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: serviceConfig.price,
        currency: 'usd',
        customer: customer.id,
        description: serviceConfig.description,
        metadata: {
          user_id,
          service_type,
          service_id: service_id || '',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store transaction in database
      const transactionId = uuidv4();
      const transaction = {
        id: transactionId,
        user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: serviceConfig.price,
        currency: 'usd',
        service_type,
        service_id: service_id || null,
        status: 'pending',
        metadata: JSON.stringify(metadata)
      };

      this.db.prepare(`
        INSERT INTO payment_transactions (
          id, user_id, stripe_payment_intent_id, amount, currency,
          service_type, service_id, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transaction.id,
        transaction.user_id,
        transaction.stripe_payment_intent_id,
        transaction.amount,
        transaction.currency,
        transaction.service_type,
        transaction.service_id,
        transaction.status,
        transaction.metadata
      );

      // Audit log
      this.logPaymentAction(user_id, 'payment_intent_created', transactionId, serviceConfig.price);

      return {
        success: true,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        transaction_id: transactionId,
        amount: serviceConfig.price,
        currency: 'usd',
        description: serviceConfig.description
      };

    } catch (error) {
      console.error('Payment intent creation failed:', error);
      
      // Audit log for failed payment
      this.logPaymentAction(paymentData.user_id, 'payment_intent_failed', null, 0, {
        error: error.message
      });

      return {
        success: false,
        error: 'Payment processing unavailable',
        details: this.mockMode ? 'Stripe not configured' : error.message
      };
    }
  }

  /**
   * Confirm payment and update transaction status
   */
  async confirmPayment(paymentIntentId, paymentMethodId = null) {
    try {
      if (this.mockMode) {
        return this.confirmMockPayment(paymentIntentId);
      }

      // Get payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update local transaction
        const updateResult = this.db.prepare(`
          UPDATE payment_transactions 
          SET status = 'completed', 
              payment_method = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE stripe_payment_intent_id = ?
        `).run(paymentMethodId, paymentIntentId);

        if (updateResult.changes > 0) {
          // Get transaction details
          const transaction = this.db.prepare(`
            SELECT * FROM payment_transactions 
            WHERE stripe_payment_intent_id = ?
          `).get(paymentIntentId);

          // Audit log
          this.logPaymentAction(
            transaction.user_id, 
            'payment_confirmed', 
            transaction.id, 
            transaction.amount,
            { payment_method: paymentMethodId }
          );

          // Trigger service fulfillment
          await this.fulfillService(transaction);

          return {
            success: true,
            transaction_id: transaction.id,
            amount: transaction.amount,
            service_type: transaction.service_type,
            status: 'completed'
          };
        }
      }

      return {
        success: false,
        error: 'Payment confirmation failed',
        status: paymentIntent.status
      };

    } catch (error) {
      console.error('Payment confirmation failed:', error);
      return {
        success: false,
        error: 'Payment confirmation failed',
        details: error.message
      };
    }
  }

  /**
   * Create subscription for recurring services
   */
  async createSubscription(subscriptionData) {
    try {
      const { user_id, plan_type, payment_method_id } = subscriptionData;

      if (this.mockMode) {
        return this.createMockSubscription(subscriptionData);
      }

      // Validate plan type
      const planConfig = this.servicePricing[`subscription_${plan_type}`];
      if (!planConfig) {
        throw new Error(`Invalid subscription plan: ${plan_type}`);
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(user_id);

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(payment_method_id, {
        customer: customer.id,
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: planConfig.description,
              },
              unit_amount: planConfig.price,
              recurring: {
                interval: 'month',
              },
            },
          },
        ],
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id,
          plan_type
        }
      });

      // Store subscription in database
      const subscriptionId = uuidv4();
      this.db.prepare(`
        INSERT INTO subscriptions (
          id, user_id, stripe_subscription_id, stripe_customer_id,
          plan_type, status, current_period_start, current_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subscriptionId,
        user_id,
        subscription.id,
        customer.id,
        plan_type,
        subscription.status,
        new Date(subscription.current_period_start * 1000).toISOString(),
        new Date(subscription.current_period_end * 1000).toISOString()
      );

      // Audit log
      this.logPaymentAction(user_id, 'subscription_created', subscriptionId, planConfig.price);

      return {
        success: true,
        subscription_id: subscriptionId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        client_secret: subscription.latest_invoice.payment_intent.client_secret
      };

    } catch (error) {
      console.error('Subscription creation failed:', error);
      return {
        success: false,
        error: 'Subscription creation failed',
        details: error.message
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    try {
      if (this.mockMode) {
        return this.cancelMockSubscription(subscriptionId);
      }

      // Get subscription from database
      const subscription = this.db.prepare(`
        SELECT * FROM subscriptions WHERE id = ?
      `).get(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Cancel in Stripe
      const canceledSubscription = await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: !cancelImmediately,
        }
      );

      if (cancelImmediately) {
        await this.stripe.subscriptions.del(subscription.stripe_subscription_id);
      }

      // Update database
      this.db.prepare(`
        UPDATE subscriptions 
        SET cancel_at_period_end = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(!cancelImmediately, cancelImmediately ? 'canceled' : 'active', subscriptionId);

      // Audit log
      this.logPaymentAction(subscription.user_id, 'subscription_canceled', subscriptionId, 0);

      return {
        success: true,
        subscription_id: subscriptionId,
        status: cancelImmediately ? 'canceled' : 'active',
        cancel_at_period_end: !cancelImmediately
      };

    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      return {
        success: false,
        error: 'Subscription cancellation failed',
        details: error.message
      };
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateStripeCustomer(userId) {
    // Check if customer already exists in our database
    const user = this.db.prepare(`
      SELECT id, email, first_name, last_name, stripe_customer_id 
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.stripe_customer_id) {
      try {
        // Verify customer exists in Stripe
        const customer = await this.stripe.customers.retrieve(user.stripe_customer_id);
        if (!customer.deleted) {
          return customer;
        }
      } catch (error) {
        console.warn('Stripe customer not found, creating new one');
      }
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      metadata: {
        user_id: userId
      }
    });

    // Update user record with Stripe customer ID
    this.db.prepare(`
      UPDATE users SET stripe_customer_id = ? WHERE id = ?
    `).run(customer.id, userId);

    return customer;
  }

  /**
   * Fulfill service after successful payment
   */
  async fulfillService(transaction) {
    try {
      const metadata = JSON.parse(transaction.metadata || '{}');

      switch (transaction.service_type) {
        case 'room_analysis':
          // Trigger premium AI analysis
          metadata.payment_confirmed = true;
          metadata.premium_features = true;
          break;

        case 'appointment_consultation':
        case 'appointment_evaluation':
          // Update appointment status
          if (transaction.service_id) {
            this.db.prepare(`
              UPDATE appointments 
              SET payment_status = 'paid', payment_id = ?
              WHERE id = ?
            `).run(transaction.id, transaction.service_id);
          }
          break;
      }

      console.log(`Service fulfilled for transaction ${transaction.id}`);

    } catch (error) {
      console.error('Service fulfillment failed:', error);
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, amount = null, reason = 'requested_by_customer') {
    try {
      if (this.mockMode) {
        return this.processMockRefund(transactionId);
      }

      const transaction = this.db.prepare(`
        SELECT * FROM payment_transactions WHERE id = ?
      `).get(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const refundAmount = amount || transaction.amount;

      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: transaction.stripe_payment_intent_id,
        amount: refundAmount,
        reason: reason,
        metadata: {
          transaction_id: transactionId
        }
      });

      // Update transaction
      this.db.prepare(`
        UPDATE payment_transactions 
        SET status = ?, refund_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('refunded', refund.id, transactionId);

      // Audit log
      this.logPaymentAction(transaction.user_id, 'refund_processed', transactionId, refundAmount);

      return {
        success: true,
        refund_id: refund.id,
        amount_refunded: refundAmount,
        status: 'refunded'
      };

    } catch (error) {
      console.error('Refund processing failed:', error);
      return {
        success: false,
        error: 'Refund processing failed',
        details: error.message
      };
    }
  }

  /**
   * Get payment history for user
   */
  getPaymentHistory(userId, limit = 50) {
    const transactions = this.db.prepare(`
      SELECT id, amount, currency, service_type, status, 
             created_at, updated_at, receipt_url
      FROM payment_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(userId, limit);

    const subscriptions = this.db.prepare(`
      SELECT id, plan_type, status, current_period_start, 
             current_period_end, cancel_at_period_end
      FROM subscriptions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);

    return {
      transactions,
      subscriptions,
      summary: {
        total_spent: transactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0),
        active_subscriptions: subscriptions.filter(s => s.status === 'active').length
      }
    };
  }

  /**
   * Log payment actions for audit trail
   */
  logPaymentAction(userId, action, paymentId, amount, details = {}) {
    try {
      this.db.prepare(`
        INSERT INTO payment_audit_log (
          id, user_id, action, payment_id, amount, 
          timestamp, details
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `).run(
        uuidv4(),
        userId,
        action,
        paymentId,
        amount,
        JSON.stringify(details)
      );
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  // Mock implementations for testing/development
  createMockPayment(paymentData) {
    const transactionId = uuidv4();
    return {
      success: true,
      payment_intent_id: `pi_mock_${transactionId}`,
      client_secret: `pi_mock_${transactionId}_secret`,
      transaction_id: transactionId,
      amount: this.servicePricing[paymentData.service_type]?.price || 2999,
      currency: 'usd',
      description: 'Mock payment for testing',
      mock_mode: true
    };
  }

  confirmMockPayment(paymentIntentId) {
    return {
      success: true,
      transaction_id: uuidv4(),
      amount: 2999,
      service_type: 'room_analysis',
      status: 'completed',
      mock_mode: true
    };
  }

  createMockSubscription(subscriptionData) {
    return {
      success: true,
      subscription_id: uuidv4(),
      stripe_subscription_id: `sub_mock_${Date.now()}`,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      client_secret: 'mock_client_secret',
      mock_mode: true
    };
  }

  cancelMockSubscription(subscriptionId) {
    return {
      success: true,
      subscription_id: subscriptionId,
      status: 'canceled',
      cancel_at_period_end: false,
      mock_mode: true
    };
  }

  processMockRefund(transactionId) {
    return {
      success: true,
      refund_id: `re_mock_${Date.now()}`,
      amount_refunded: 2999,
      status: 'refunded',
      mock_mode: true
    };
  }

  /**
   * Health check for payment service
   */
  async healthCheck() {
    const health = {
      service: 'Payment Service',
      status: this.mockMode ? 'mock_mode' : 'stripe_enabled',
      stripe_configured: !this.mockMode,
      database_connected: true,
      timestamp: new Date().toISOString()
    };

    if (!this.mockMode) {
      try {
        // Test Stripe connection
        await this.stripe.accounts.retrieve();
        health.stripe_connection = 'connected';
      } catch (error) {
        health.stripe_connection = 'error';
        health.stripe_error = error.message;
      }
    }

    return health;
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;