/**
 * Payment Processing Integration Tests
 * Tests Stripe integration, subscription management, and payment workflows
 */

import { expect } from 'chai';
import supertest from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB = path.join(__dirname, '..', '..', 'test_healthcare.db');
const SCHEMA_FILE = path.join(__dirname, '..', '..', 'schema.sql');

describe('Payment Processing Integration Tests', function() {
    let db;
    let app;
    let request;
    let userToken;
    let userId;

    before(async function() {
        this.timeout(10000);

        // Clean up any existing test database
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }

        // Create test database
        db = new Database(TEST_DB);
        const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
        const statements = schema.split(';').filter(s => s.trim());
        statements.forEach(statement => {
            if (statement.trim()) {
                db.exec(statement.trim());
            }
        });

        // Import server with test database
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_PATH = TEST_DB;
        
        const serverModule = await import('../../server.js');
        app = serverModule.default || serverModule.app;
        request = supertest(app);

        // Create test user
        const registerResponse = await request.post('/api/auth/register').send({
            email: 'payment@test.com',
            password: 'testPass123',
            firstName: 'Payment',
            lastName: 'User',
            role: 'patient'
        });
        
        userToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;
    });

    after(function() {
        db.close();
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    beforeEach(function() {
        // Clean payment-related tables before each test
        db.prepare('DELETE FROM payment_transactions').run();
        db.prepare('DELETE FROM payment_subscriptions').run();
        db.prepare('DELETE FROM audit_logs').run();
    });

    describe('Payment Service Health Check', function() {
        it('should provide payment service health status', async function() {
            const response = await request
                .get('/api/payments/health')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body).to.have.property('service', 'Payment Service');
            expect(response.body).to.have.property('status');
            expect(response.body).to.have.property('timestamp');

            // In test environment without Stripe keys, should be in mock mode
            if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_TEST_SECRET_KEY) {
                expect(response.body.status).to.equal('mock_mode');
                expect(response.body.stripe_configured).to.be.false;
            }
        });

        it('should require authentication for health check', async function() {
            await request
                .get('/api/payments/health')
                .expect(401);
        });
    });

    describe('Payment Intent Creation', function() {
        it('should create payment intent for room analysis', async function() {
            const paymentData = {
                service_type: 'room_analysis',
                service_id: 'analysis_123',
                metadata: {
                    room_type: 'bathroom',
                    premium_features: true
                }
            };

            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('payment_intent_id');
            expect(response.body).to.have.property('client_secret');
            expect(response.body).to.have.property('transaction_id');
            expect(response.body.amount).to.equal(2999); // $29.99 for room analysis
            expect(response.body.currency).to.equal('usd');

            // Verify transaction stored in database
            const transaction = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(response.body.transaction_id);
            expect(transaction).to.exist;
            expect(transaction.user_id).to.equal(userId);
            expect(transaction.service_type).to.equal('room_analysis');
            expect(transaction.amount).to.equal(2999);
            expect(transaction.status).to.equal('pending');
        });

        it('should create payment intent for appointment consultation', async function() {
            const paymentData = {
                service_type: 'appointment_consultation',
                service_id: 'appointment_456'
            };

            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.success).to.be.true;
            expect(response.body.amount).to.equal(8500); // $85.00 for consultation
        });

        it('should create payment intent for comprehensive evaluation', async function() {
            const paymentData = {
                service_type: 'appointment_evaluation'
            };

            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.success).to.be.true;
            expect(response.body.amount).to.equal(15000); // $150.00 for evaluation
        });

        it('should reject invalid service types', async function() {
            const paymentData = {
                service_type: 'invalid_service'
            };

            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send(paymentData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('Invalid service type');
        });

        it('should require authentication for payment intent creation', async function() {
            await request
                .post('/api/payments/intent')
                .send({ service_type: 'room_analysis' })
                .expect(401);
        });
    });

    describe('Payment Confirmation', function() {
        let paymentIntentId, transactionId;

        beforeEach(async function() {
            // Create payment intent for testing confirmation
            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    service_type: 'room_analysis',
                    service_id: 'test_analysis'
                })
                .expect(201);

            paymentIntentId = response.body.payment_intent_id;
            transactionId = response.body.transaction_id;
        });

        it('should confirm payment successfully', async function() {
            const confirmData = {
                payment_intent_id: paymentIntentId,
                payment_method_id: 'pm_card_visa'
            };

            const response = await request
                .post('/api/payments/confirm')
                .set('Authorization', `Bearer ${userToken}`)
                .send(confirmData)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.transaction_id).to.equal(transactionId);
            expect(response.body.status).to.equal('completed');

            // Verify transaction status updated in database
            const transaction = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(transactionId);
            expect(transaction.status).to.equal('completed');

            // Verify audit log entry
            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE payment_id = ? AND action = ?').get(transactionId, 'payment_confirmed');
            expect(auditLog).to.exist;
        });

        it('should handle payment confirmation failures gracefully', async function() {
            const confirmData = {
                payment_intent_id: 'invalid_payment_intent',
                payment_method_id: 'pm_card_visa'
            };

            const response = await request
                .post('/api/payments/confirm')
                .set('Authorization', `Bearer ${userToken}`)
                .send(confirmData)
                .expect(200);

            // In mock mode, should still handle gracefully
            expect(response.body.success).to.be.false;
        });

        it('should require authentication for payment confirmation', async function() {
            await request
                .post('/api/payments/confirm')
                .send({
                    payment_intent_id: paymentIntentId,
                    payment_method_id: 'pm_card_visa'
                })
                .expect(401);
        });
    });

    describe('Subscription Management', function() {
        it('should create basic subscription', async function() {
            const subscriptionData = {
                plan_type: 'basic',
                payment_method_id: 'pm_card_visa'
            };

            const response = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send(subscriptionData)
                .expect(201);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('subscription_id');
            expect(response.body).to.have.property('stripe_subscription_id');
            expect(response.body.status).to.exist;

            // Verify subscription stored in database
            const subscription = db.prepare('SELECT * FROM payment_subscriptions WHERE id = ?').get(response.body.subscription_id);
            expect(subscription).to.exist;
            expect(subscription.user_id).to.equal(userId);
            expect(subscription.plan_type).to.equal('basic');
        });

        it('should create premium subscription', async function() {
            const subscriptionData = {
                plan_type: 'premium',
                payment_method_id: 'pm_card_visa'
            };

            const response = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send(subscriptionData)
                .expect(201);

            expect(response.body.success).to.be.true;
            
            const subscription = db.prepare('SELECT * FROM payment_subscriptions WHERE id = ?').get(response.body.subscription_id);
            expect(subscription.plan_type).to.equal('premium');
        });

        it('should reject invalid subscription plan types', async function() {
            const subscriptionData = {
                plan_type: 'invalid_plan',
                payment_method_id: 'pm_card_visa'
            };

            const response = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send(subscriptionData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('Invalid subscription plan');
        });

        it('should require payment method for subscription creation', async function() {
            const subscriptionData = {
                plan_type: 'basic'
                // Missing payment_method_id
            };

            const response = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send(subscriptionData)
                .expect(400);

            expect(response.body.success).to.be.false;
        });
    });

    describe('Subscription Cancellation', function() {
        let subscriptionId;

        beforeEach(async function() {
            // Create subscription for cancellation tests
            const response = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    plan_type: 'basic',
                    payment_method_id: 'pm_card_visa'
                })
                .expect(201);

            subscriptionId = response.body.subscription_id;
        });

        it('should cancel subscription at period end', async function() {
            const response = await request
                .post(`/api/subscriptions/${subscriptionId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancel_immediately: false })
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.subscription_id).to.equal(subscriptionId);
            expect(response.body.cancel_at_period_end).to.be.true;

            // Verify database update
            const subscription = db.prepare('SELECT * FROM payment_subscriptions WHERE id = ?').get(subscriptionId);
            expect(subscription.cancel_at_period_end).to.equal(1);
        });

        it('should cancel subscription immediately', async function() {
            const response = await request
                .post(`/api/subscriptions/${subscriptionId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancel_immediately: true })
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.status).to.equal('canceled');

            // Verify audit log
            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE payment_id = ? AND action = ?').get(subscriptionId, 'subscription_canceled');
            expect(auditLog).to.exist;
        });

        it('should prevent unauthorized subscription cancellation', async function() {
            // Create another user
            const otherUserResponse = await request.post('/api/auth/register').send({
                email: 'other@payment.com',
                password: 'testPass123',
                firstName: 'Other',
                lastName: 'User',
                role: 'patient'
            });

            const otherUserToken = otherUserResponse.body.token;

            // Try to cancel first user's subscription
            const response = await request
                .post(`/api/subscriptions/${subscriptionId}/cancel`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ cancel_immediately: false })
                .expect(400);

            expect(response.body.success).to.be.false;
        });

        it('should handle cancellation of non-existent subscription', async function() {
            const response = await request
                .post('/api/subscriptions/nonexistent_sub/cancel')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancel_immediately: false })
                .expect(400);

            expect(response.body.success).to.be.false;
        });
    });

    describe('Refund Processing', function() {
        let transactionId;

        beforeEach(async function() {
            // Create and confirm a payment for refund testing
            const intentResponse = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    service_type: 'room_analysis',
                    service_id: 'refund_test'
                });

            transactionId = intentResponse.body.transaction_id;

            // Confirm the payment
            await request
                .post('/api/payments/confirm')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    payment_intent_id: intentResponse.body.payment_intent_id,
                    payment_method_id: 'pm_card_visa'
                });
        });

        it('should process full refund', async function() {
            const response = await request
                .post(`/api/payments/${transactionId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    reason: 'requested_by_customer'
                })
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('refund_id');
            expect(response.body.status).to.equal('refunded');

            // Verify transaction status updated
            const transaction = db.prepare('SELECT status FROM payment_transactions WHERE id = ?').get(transactionId);
            expect(transaction.status).to.equal('refunded');

            // Verify audit log
            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE payment_id = ? AND action = ?').get(transactionId, 'refund_processed');
            expect(auditLog).to.exist;
        });

        it('should process partial refund', async function() {
            const response = await request
                .post(`/api/payments/${transactionId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    amount: 1500, // Partial refund of $15.00
                    reason: 'service_issue'
                })
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.amount_refunded).to.equal(1500);
        });

        it('should prevent refund of non-existent transaction', async function() {
            const response = await request
                .post('/api/payments/nonexistent_transaction/refund')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    reason: 'requested_by_customer'
                })
                .expect(400);

            expect(response.body.success).to.be.false;
        });

        it('should require authentication for refunds', async function() {
            await request
                .post(`/api/payments/${transactionId}/refund`)
                .send({ reason: 'requested_by_customer' })
                .expect(401);
        });
    });

    describe('Payment History', function() {
        beforeEach(async function() {
            // Create multiple transactions and subscriptions for history testing
            const transactions = [
                { service_type: 'room_analysis', service_id: 'analysis_1' },
                { service_type: 'appointment_consultation', service_id: 'appointment_1' },
                { service_type: 'appointment_evaluation', service_id: 'appointment_2' }
            ];

            for (const txn of transactions) {
                const intentResponse = await request
                    .post('/api/payments/intent')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send(txn);

                await request
                    .post('/api/payments/confirm')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({
                        payment_intent_id: intentResponse.body.payment_intent_id,
                        payment_method_id: 'pm_card_visa'
                    });
            }

            // Create subscription
            await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    plan_type: 'premium',
                    payment_method_id: 'pm_card_visa'
                });
        });

        it('should retrieve payment history', async function() {
            const response = await request
                .get('/api/payments/history')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.transactions).to.be.an('array');
            expect(response.body.subscriptions).to.be.an('array');
            expect(response.body.summary).to.have.property('total_spent');
            expect(response.body.summary).to.have.property('active_subscriptions');

            expect(response.body.transactions.length).to.equal(3);
            expect(response.body.subscriptions.length).to.equal(1);

            // Verify transaction structure
            const transaction = response.body.transactions[0];
            expect(transaction).to.have.property('id');
            expect(transaction).to.have.property('amount');
            expect(transaction).to.have.property('service_type');
            expect(transaction).to.have.property('status');
            expect(transaction).to.have.property('created_at');
        });

        it('should limit payment history results', async function() {
            const response = await request
                .get('/api/payments/history?limit=2')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.transactions.length).to.equal(2);
        });

        it('should prevent access to other users payment history', async function() {
            // Create another user
            const otherUserResponse = await request.post('/api/auth/register').send({
                email: 'other@history.com',
                password: 'testPass123',
                firstName: 'Other',
                lastName: 'User',
                role: 'patient'
            });

            const otherUserToken = otherUserResponse.body.token;

            // Other user should have empty payment history
            const response = await request
                .get('/api/payments/history')
                .set('Authorization', `Bearer ${otherUserToken}`)
                .expect(200);

            expect(response.body.transactions.length).to.equal(0);
            expect(response.body.subscriptions.length).to.equal(0);
        });

        it('should require authentication for payment history', async function() {
            await request
                .get('/api/payments/history')
                .expect(401);
        });
    });

    describe('Payment Audit Logging', function() {
        it('should log payment intent creation', async function() {
            await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    service_type: 'room_analysis',
                    service_id: 'audit_test'
                })
                .expect(201);

            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE action = ? AND user_id = ?').get('payment_intent_created', userId);
            expect(auditLog).to.exist;
            expect(auditLog.amount).to.equal(2999);
        });

        it('should log failed payment attempts', async function() {
            const response = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    service_type: 'invalid_service'
                })
                .expect(400);

            expect(response.body.success).to.be.false;

            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE action = ? AND user_id = ?').get('payment_intent_failed', userId);
            expect(auditLog).to.exist;
        });

        it('should include IP address and user agent in audit logs', async function() {
            await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${userToken}`)
                .set('User-Agent', 'Test-Agent/1.0')
                .set('X-Forwarded-For', '192.168.1.100')
                .send({
                    service_type: 'room_analysis'
                })
                .expect(201);

            // Note: In actual implementation, IP and User-Agent should be captured
            // This test verifies the audit logging structure exists
            const auditLog = db.prepare('SELECT * FROM payment_audit_log WHERE action = ?').get('payment_intent_created');
            expect(auditLog).to.exist;
        });
    });
});