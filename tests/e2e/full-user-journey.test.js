/**
 * End-to-End User Journey Tests
 * Tests complete user workflows from registration through service completion
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
const TEST_IMAGES_DIR = path.join(__dirname, '..', 'fixtures', 'images');

describe('End-to-End User Journey Tests', function() {
    let db;
    let app;
    let request;

    before(async function() {
        this.timeout(15000);

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

        // Create test images directory and test image
        if (!fs.existsSync(TEST_IMAGES_DIR)) {
            fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
        }

        const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
        if (!fs.existsSync(testImagePath)) {
            const testImageBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/AB+D', 'base64');
            fs.writeFileSync(testImagePath, testImageBuffer);
        }

        // Import server with test database
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_PATH = TEST_DB;
        
        const serverModule = await import('../../server.js');
        app = serverModule.default || serverModule.app;
        request = supertest(app);
    });

    after(function() {
        db.close();
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    describe('Complete Patient Journey: From Registration to Service Completion', function() {
        let patientToken, patientId;
        let providerToken, providerId;
        let caregiverToken, caregiverId;

        it('should complete the full patient onboarding and service workflow', async function() {
            this.timeout(30000);

            // Step 1: Patient Registration
            console.log('Step 1: Patient Registration');
            const patientRegister = await request
                .post('/api/register')
                .send({
                    email: 'patient@journey.com',
                    password: 'securePass123',
                    first_name: 'Sarah',
                    last_name: 'Johnson',
                    role: 'patient',
                    phone: '+1555-123-4567'
                })
                .expect(201);

            expect(patientRegister.body.success).to.be.true;
            patientToken = patientRegister.body.token;
            patientId = patientRegister.body.userId;

            // Step 2: Provider Registration
            console.log('Step 2: Provider Registration');
            const providerRegister = await request
                .post('/api/register')
                .send({
                    email: 'provider@journey.com',
                    password: 'securePass123',
                    first_name: 'Dr. Michael',
                    last_name: 'Thompson',
                    role: 'provider',
                    provider_type: 'pt',
                    license_number: 'PT789012',
                    specialties: JSON.stringify(['geriatric', 'home_safety', 'fall_prevention'])
                })
                .expect(201);

            expect(providerRegister.body.success).to.be.true;
            providerToken = providerRegister.body.token;
            providerId = providerRegister.body.userId;

            // Step 3: Caregiver Registration
            console.log('Step 3: Caregiver Registration');
            const caregiverRegister = await request
                .post('/api/register')
                .send({
                    email: 'caregiver@journey.com',
                    password: 'securePass123',
                    first_name: 'Robert',
                    last_name: 'Johnson',
                    role: 'caregiver'
                })
                .expect(201);

            expect(caregiverRegister.body.success).to.be.true;
            caregiverToken = caregiverRegister.body.token;
            caregiverId = caregiverRegister.body.userId;

            // Step 4: Patient performs room safety assessment
            console.log('Step 4: Room Safety Assessment');
            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            const roomAnalysis = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${patientToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .field('user_context', JSON.stringify({
                    age_range: '70-75',
                    mobility_concerns: true,
                    fall_history: false,
                    medications: ['blood_pressure'],
                    vision_impaired: false
                }))
                .expect(200);

            expect(roomAnalysis.body.success).to.be.true;
            expect(roomAnalysis.body.hazards).to.be.an('array');
            expect(roomAnalysis.body.recommendations).to.be.an('array');
            const analysisId = roomAnalysis.body.analysis_id;

            // Step 5: Patient searches for providers
            console.log('Step 5: Provider Search');
            const providerSearch = await request
                .get('/api/providers/search?specialty=geriatric&provider_type=pt')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(providerSearch.body.success).to.be.true;
            expect(providerSearch.body.providers).to.be.an('array');
            const foundProvider = providerSearch.body.providers.find(p => p.id === providerId);
            expect(foundProvider).to.exist;

            // Step 6: Patient checks provider availability
            console.log('Step 6: Check Provider Availability');
            const availability = await request
                .get(`/api/providers/${providerId}/availability?date=2024-12-15`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(availability.body.success).to.be.true;
            expect(availability.body.available_slots).to.be.an('array');

            // Step 7: Patient books appointment
            console.log('Step 7: Book Appointment');
            const appointmentBooking = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-15T14:00:00Z',
                    appointment_type: 'consultation',
                    duration: 60,
                    notes: 'Follow-up on bathroom safety assessment - requesting home safety consultation',
                    assessment_id: analysisId,
                    contact_preference: 'video'
                })
                .expect(201);

            expect(appointmentBooking.body.success).to.be.true;
            const appointmentId = appointmentBooking.body.appointment_id;
            const confirmationNumber = appointmentBooking.body.confirmation_number;

            // Step 8: Patient creates payment for appointment
            console.log('Step 8: Payment Processing');
            const paymentIntent = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    service_type: 'appointment_consultation',
                    service_id: appointmentId,
                    metadata: {
                        appointment_type: 'consultation',
                        provider_id: providerId
                    }
                })
                .expect(201);

            expect(paymentIntent.body.success).to.be.true;
            expect(paymentIntent.body.amount).to.equal(8500); // $85.00

            // Step 9: Patient confirms payment
            console.log('Step 9: Payment Confirmation');
            const paymentConfirm = await request
                .post('/api/payments/confirm')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    payment_intent_id: paymentIntent.body.payment_intent_id,
                    payment_method_id: 'pm_card_visa_test'
                })
                .expect(200);

            expect(paymentConfirm.body.success).to.be.true;

            // Step 10: Patient adds caregiver relationship
            console.log('Step 10: Add Caregiver Relationship');
            db.prepare(`
                INSERT INTO caregiver_relationships (patient_id, caregiver_id, relationship, permissions, is_active)
                VALUES (?, ?, 'spouse', '["view_appointments", "view_assessments", "emergency_contact"]', 1)
            `).run(patientId, caregiverId);

            // Step 11: Provider views their appointments
            console.log('Step 11: Provider Dashboard');
            const providerAppointments = await request
                .get(`/api/providers/${providerId}/appointments`)
                .set('Authorization', `Bearer ${providerToken}`)
                .expect(200);

            expect(providerAppointments.body.success).to.be.true;
            expect(providerAppointments.body.appointments).to.be.an('array');
            const providerAppointment = providerAppointments.body.appointments.find(a => a.id === appointmentId);
            expect(providerAppointment).to.exist;
            expect(providerAppointment.patient_name).to.include('Sarah Johnson');

            // Step 12: Provider confirms appointment
            console.log('Step 12: Provider Confirms Appointment');
            const appointmentConfirm = await request
                .patch(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({
                    status: 'confirmed',
                    provider_notes: 'Reviewed room assessment - focusing on bathroom safety modifications'
                })
                .expect(200);

            expect(appointmentConfirm.body.success).to.be.true;

            // Step 13: Patient views updated appointment status
            console.log('Step 13: Patient Views Appointment Status');
            const patientAppointments = await request
                .get(`/api/appointments/${patientId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(patientAppointments.body.success).to.be.true;
            const patientAppointment = patientAppointments.body.appointments.find(a => a.id === appointmentId);
            expect(patientAppointment.status).to.equal('confirmed');

            // Step 14: Caregiver can view patient's appointments
            console.log('Step 14: Caregiver Access');
            const caregiverView = await request
                .get(`/api/appointments/${patientId}`)
                .set('Authorization', `Bearer ${caregiverToken}`)
                .expect(200);

            expect(caregiverView.body.success).to.be.true;
            expect(caregiverView.body.appointments).to.be.an('array');

            // Step 15: Provider completes appointment
            console.log('Step 15: Provider Completes Appointment');
            const appointmentComplete = await request
                .patch(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({
                    status: 'completed',
                    provider_notes: 'Appointment completed. Recommended grab bar installation in bathroom, non-slip mat for shower. Patient demonstrates good understanding of safety measures. Follow-up in 30 days.'
                })
                .expect(200);

            expect(appointmentComplete.body.success).to.be.true;

            // Step 16: Patient views payment history
            console.log('Step 16: Payment History Review');
            const paymentHistory = await request
                .get('/api/payments/history')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(paymentHistory.body.success).to.be.true;
            expect(paymentHistory.body.transactions).to.have.lengthOf(1);
            expect(paymentHistory.body.summary.total_spent).to.equal(8500);

            // Step 17: Patient creates subscription for ongoing monitoring
            console.log('Step 17: Subscription Creation');
            const subscription = await request
                .post('/api/subscriptions')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    plan_type: 'basic',
                    payment_method_id: 'pm_card_visa_test'
                })
                .expect(201);

            expect(subscription.body.success).to.be.true;

            // Step 18: Verify all data integrity
            console.log('Step 18: Data Integrity Verification');
            
            // Verify assessment record
            const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(analysisId);
            expect(assessment).to.exist;
            expect(assessment.user_id).to.equal(patientId);
            expect(assessment.room_type).to.equal('bathroom');

            // Verify appointment record
            const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment).to.exist;
            expect(appointment.user_id).to.equal(patientId);
            expect(appointment.provider_id).to.equal(providerId);
            expect(appointment.status).to.equal('completed');

            // Verify payment record
            const payment = db.prepare('SELECT * FROM payment_transactions WHERE service_id = ?').get(appointmentId);
            expect(payment).to.exist;
            expect(payment.user_id).to.equal(patientId);
            expect(payment.status).to.equal('completed');
            expect(payment.amount).to.equal(8500);

            // Verify subscription record
            const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(patientId);
            expect(sub).to.exist;
            expect(sub.plan_type).to.equal('basic');

            // Verify caregiver relationship
            const relationship = db.prepare('SELECT * FROM caregiver_relationships WHERE patient_id = ? AND caregiver_id = ?').get(patientId, caregiverId);
            expect(relationship).to.exist;
            expect(relationship.relationship).to.equal('spouse');

            // Verify audit logs exist
            const auditLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
            expect(auditLogs.count).to.be.greaterThan(10); // Should have many audit entries

            console.log('✅ Complete End-to-End User Journey Successful!');
            console.log(`   - Patient: ${patientRegister.body.user.email}`);
            console.log(`   - Provider: ${providerRegister.body.user.email}`);
            console.log(`   - Caregiver: ${caregiverRegister.body.user.email}`);
            console.log(`   - Assessment: ${analysisId}`);
            console.log(`   - Appointment: ${appointmentId} (${appointment.status})`);
            console.log(`   - Payment: $${(payment.amount / 100).toFixed(2)} (${payment.status})`);
            console.log(`   - Subscription: ${sub.plan_type} plan`);
            console.log(`   - Audit Logs: ${auditLogs.count} entries`);
        });
    });

    describe('Provider Workflow: Clinical Assessment and Reporting', function() {
        let providerToken, providerId;
        let patientToken, patientId;

        beforeEach(async function() {
            // Create provider and patient for clinical workflow testing
            const providerRes = await request.post('/api/register').send({
                email: 'clinician@test.com',
                password: 'testPass123',
                first_name: 'Dr. Lisa',
                last_name: 'Chen',
                role: 'provider',
                provider_type: 'ot',
                license_number: 'OT456789'
            });
            providerToken = providerRes.body.token;
            providerId = providerRes.body.userId;

            const patientRes = await request.post('/api/register').send({
                email: 'clinical_patient@test.com',
                password: 'testPass123',
                first_name: 'Eleanor',
                last_name: 'Williams',
                role: 'patient',
                phone: '+1555-987-6543'
            });
            patientToken = patientRes.body.token;
            patientId = patientRes.body.userId;
        });

        it('should complete clinical assessment workflow', async function() {
            this.timeout(15000);

            // Step 1: Patient uploads multiple room assessments
            console.log('Clinical Step 1: Multiple Room Assessments');
            const rooms = ['bathroom', 'bedroom', 'kitchen', 'living_room'];
            const assessmentIds = [];

            for (const roomType of rooms) {
                const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
                const roomAnalysis = await request
                    .post('/api/room-analysis')
                    .set('Authorization', `Bearer ${patientToken}`)
                    .attach('image', testImagePath)
                    .field('room_type', roomType)
                    .field('user_context', JSON.stringify({
                        age_range: '80+',
                        mobility_concerns: true,
                        fall_history: true,
                        mobility_aids: ['walker'],
                        vision_impaired: true
                    }))
                    .expect(200);

                assessmentIds.push(roomAnalysis.body.analysis_id);
            }

            expect(assessmentIds).to.have.lengthOf(4);

            // Step 2: Patient books comprehensive evaluation
            console.log('Clinical Step 2: Book Comprehensive Evaluation');
            const appointmentBooking = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-20T10:00:00Z',
                    appointment_type: 'evaluation',
                    duration: 120,
                    notes: 'Comprehensive home safety evaluation - multiple rooms assessed',
                    contact_preference: 'in_person'
                })
                .expect(201);

            const appointmentId = appointmentBooking.body.appointment_id;

            // Step 3: Payment for comprehensive evaluation
            console.log('Clinical Step 3: Payment for Evaluation');
            const paymentIntent = await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    service_type: 'appointment_evaluation',
                    service_id: appointmentId
                })
                .expect(201);

            expect(paymentIntent.body.amount).to.equal(15000); // $150.00

            await request
                .post('/api/payments/confirm')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    payment_intent_id: paymentIntent.body.payment_intent_id,
                    payment_method_id: 'pm_card_visa_test'
                })
                .expect(200);

            // Step 4: Provider reviews all assessments
            console.log('Clinical Step 4: Provider Reviews Assessments');
            const allAssessments = await request
                .get(`/api/assessments/${patientId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .expect(200);

            expect(allAssessments.body.assessments).to.have.lengthOf(4);

            // Step 5: Provider conducts appointment with detailed notes
            console.log('Clinical Step 5: Provider Conducts Evaluation');
            const clinicalNotes = `
COMPREHENSIVE HOME SAFETY EVALUATION

PATIENT: Eleanor Williams (80+)
MOBILITY: Uses walker, history of falls
VISION: Impaired

ROOM ASSESSMENTS REVIEWED:
- Bathroom: High risk - recommend grab bars, non-slip surfaces
- Bedroom: Moderate risk - improve lighting, clear pathways  
- Kitchen: High risk - reorganize storage, improve accessibility
- Living room: Low risk - minor furniture adjustments

CLINICAL RECOMMENDATIONS:
1. IMMEDIATE (0-7 days):
   - Install grab bars in bathroom (shower and toilet)
   - Add non-slip mats in bathroom and shower
   - Improve lighting in bedroom and hallways

2. SHORT TERM (1-4 weeks):
   - Reorganize kitchen storage to accessible levels
   - Clear walkway obstacles
   - Consider raised toilet seat

3. LONG TERM (1-3 months):
   - Evaluate need for additional mobility aids
   - Consider home modification consultation
   - Follow-up assessment in 60 days

FALL PREVENTION SCORE: 7/10 (HIGH PRIORITY)
NEXT APPOINTMENT: 60 days for reassessment
            `;

            const appointmentUpdate = await request
                .patch(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({
                    status: 'completed',
                    provider_notes: clinicalNotes.trim()
                })
                .expect(200);

            expect(appointmentUpdate.body.success).to.be.true;

            // Step 6: Verify clinical documentation
            console.log('Clinical Step 6: Verify Clinical Documentation');
            const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment.notes).to.include('COMPREHENSIVE HOME SAFETY EVALUATION');
            expect(appointment.notes).to.include('FALL PREVENTION SCORE');
            expect(appointment.status).to.equal('completed');

            // Step 7: Provider views their completed appointments
            const providerAppointments = await request
                .get(`/api/providers/${providerId}/appointments?status=completed`)
                .set('Authorization', `Bearer ${providerToken}`)
                .expect(200);

            const completedAppointment = providerAppointments.body.appointments.find(a => a.id === appointmentId);
            expect(completedAppointment).to.exist;
            expect(completedAppointment.type).to.equal('evaluation');
            expect(completedAppointment.duration_minutes).to.equal(120);

            console.log('✅ Clinical Assessment Workflow Completed Successfully!');
        });
    });

    describe('Error Handling and Edge Cases', function() {
        it('should handle system errors gracefully throughout the workflow', async function() {
            this.timeout(10000);

            // Test 1: Registration with invalid data
            const invalidRegister = await request
                .post('/api/register')
                .send({
                    email: 'invalid-email',
                    password: '123', // Too short
                    first_name: '',
                    role: 'invalid_role'
                })
                .expect(400);

            expect(invalidRegister.body.success).to.be.false;

            // Test 2: Unauthorized access
            await request
                .get('/api/dashboard')
                .expect(401);

            // Test 3: Invalid token
            await request
                .get('/api/dashboard')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);

            // Test 4: Access to non-existent resources
            const validUser = await request.post('/api/register').send({
                email: 'error_test@test.com',
                password: 'testPass123',
                first_name: 'Error',
                last_name: 'Test',
                role: 'patient'
            });

            const token = validUser.body.token;

            await request
                .get('/api/appointments/999999')
                .set('Authorization', `Bearer ${token}`)
                .expect(404);

            // Test 5: Invalid payment service type
            await request
                .post('/api/payments/intent')
                .set('Authorization', `Bearer ${token}`)
                .send({ service_type: 'nonexistent_service' })
                .expect(400);

            console.log('✅ Error Handling Tests Passed');
        });
    });
});