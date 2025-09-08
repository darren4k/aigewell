/**
 * Appointment Booking Integration Tests
 * Tests end-to-end appointment scheduling, provider search, and booking workflow
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

describe('Appointment Booking Integration Tests', function() {
    let db;
    let app;
    let request;
    let patientToken, providerToken, caregiverToken;
    let patientId, providerId, caregiverId;

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

        // Create test users
        const patientResponse = await request.post('/api/auth/register').send({
            email: 'patient@appointment.com',
            password: 'testPass123',
            firstName: 'John',
            lastName: 'Patient',
            role: 'patient',
            phone: '+1234567890'
        });
        patientToken = patientResponse.body.token;
        patientId = patientResponse.body.userId;

        const providerResponse = await request.post('/api/auth/register').send({
            email: 'provider@appointment.com',
            password: 'testPass123',
            firstName: 'Jane',
            lastName: 'Provider',
            role: 'provider',
            provider_type: 'pt',
            license_number: 'PT123456',
            specialties: JSON.stringify(['geriatric', 'home_safety'])
        });
        providerToken = providerResponse.body.token;
        providerId = providerResponse.body.userId;

        const caregiverResponse = await request.post('/api/auth/register').send({
            email: 'caregiver@appointment.com',
            password: 'testPass123',
            firstName: 'Mary',
            lastName: 'Caregiver',
            role: 'caregiver'
        });
        caregiverToken = caregiverResponse.body.token;
        caregiverId = caregiverResponse.body.userId;
    });

    after(function() {
        db.close();
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    beforeEach(function() {
        // Clean appointments table before each test
        db.prepare('DELETE FROM appointments').run();
    });

    describe('Provider Search and Discovery', function() {
        it('should search for available providers', async function() {
            const response = await request
                .get('/api/providers/search')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.providers).to.be.an('array');
            
            // Should find our test provider
            const provider = response.body.providers.find(p => p.id === providerId);
            expect(provider).to.exist;
            expect(provider.firstName).to.equal('Jane');
            expect(provider.provider_type).to.equal('pt');
            expect(provider.specialties).to.include('geriatric');
        });

        it('should filter providers by specialty', async function() {
            const response = await request
                .get('/api/providers/search?specialty=geriatric')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            const provider = response.body.providers.find(p => p.id === providerId);
            expect(provider).to.exist;
        });

        it('should filter providers by type', async function() {
            const response = await request
                .get('/api/providers/search?provider_type=pt')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            const provider = response.body.providers.find(p => p.id === providerId);
            expect(provider).to.exist;
            expect(provider.provider_type).to.equal('pt');
        });

        it('should get provider availability', async function() {
            const response = await request
                .get(`/api/providers/${providerId}/availability?date=2024-12-01`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.provider_id).to.equal(providerId);
            expect(response.body.available_slots).to.be.an('array');
        });

        it('should require authentication for provider search', async function() {
            await request
                .get('/api/providers/search')
                .expect(401);
        });
    });

    describe('Appointment Booking Workflow', function() {
        it('should book a new appointment successfully', async function() {
            const appointmentData = {
                provider_id: providerId,
                scheduled_at: '2024-12-01T10:00:00Z',
                appointment_type: 'consultation',
                duration: 60,
                notes: 'Initial consultation for home safety assessment',
                contact_preference: 'phone'
            };

            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(201);

            expect(response.body.success).to.be.true;
            expect(response.body.appointment_id).to.exist;
            expect(response.body.confirmation_number).to.exist;

            // Verify appointment in database
            const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(response.body.appointment_id);
            expect(appointment).to.exist;
            expect(appointment.user_id).to.equal(patientId);
            expect(appointment.provider_id).to.equal(providerId);
            expect(appointment.type).to.equal('consultation');
        });

        it('should validate required booking fields', async function() {
            const incompleteData = {
                provider_id: providerId,
                // Missing scheduled_at and appointment_type
            };

            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(incompleteData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('required');
        });

        it('should prevent double booking for the same time slot', async function() {
            const appointmentData = {
                provider_id: providerId,
                scheduled_at: '2024-12-01T14:00:00Z',
                appointment_type: 'consultation',
                duration: 60
            };

            // First booking should succeed
            await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(201);

            // Second booking at same time should fail
            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(409);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('available');
        });

        it('should allow caregivers to book appointments for patients', async function() {
            // First create caregiver relationship
            db.prepare(`
                INSERT INTO caregiver_relationships (patient_id, caregiver_id, relationship, permissions)
                VALUES (?, ?, 'family', '["schedule_appointments", "view_appointments"]')
            `).run(patientId, caregiverId);

            const appointmentData = {
                patient_id: patientId, // Caregiver booking for patient
                provider_id: providerId,
                scheduled_at: '2024-12-01T15:00:00Z',
                appointment_type: 'evaluation',
                duration: 90
            };

            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${caregiverToken}`)
                .send(appointmentData)
                .expect(201);

            expect(response.body.success).to.be.true;

            // Verify appointment is linked to patient, not caregiver
            const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(response.body.appointment_id);
            expect(appointment.user_id).to.equal(patientId);
        });

        it('should validate appointment types', async function() {
            const appointmentData = {
                provider_id: providerId,
                scheduled_at: '2024-12-01T16:00:00Z',
                appointment_type: 'invalid_type',
                duration: 60
            };

            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('appointment_type');
        });
    });

    describe('Appointment Management', function() {
        let appointmentId;

        beforeEach(async function() {
            // Create test appointment
            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-01T11:00:00Z',
                    appointment_type: 'consultation',
                    duration: 60
                })
                .expect(201);

            appointmentId = response.body.appointment_id;
        });

        it('should retrieve user appointments', async function() {
            const response = await request
                .get(`/api/appointments/${patientId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.appointments).to.be.an('array');
            expect(response.body.appointments.length).to.equal(1);

            const appointment = response.body.appointments[0];
            expect(appointment.id).to.equal(appointmentId);
            expect(appointment.provider_name).to.exist;
            expect(appointment.status).to.equal('scheduled');
        });

        it('should update appointment status', async function() {
            const response = await request
                .patch(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ status: 'confirmed' })
                .expect(200);

            expect(response.body.success).to.be.true;

            // Verify in database
            const appointment = db.prepare('SELECT status FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment.status).to.equal('confirmed');
        });

        it('should cancel appointments', async function() {
            const response = await request
                .delete(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;

            // Verify status changed to cancelled
            const appointment = db.prepare('SELECT status FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment.status).to.equal('cancelled');
        });

        it('should prevent cancellation too close to appointment time', async function() {
            // Update appointment to be in 1 hour (assuming cancellation cutoff is 2 hours)
            const soonTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            db.prepare('UPDATE appointments SET scheduled_at = ? WHERE id = ?').run(soonTime, appointmentId);

            const response = await request
                .delete(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('cancellation');
        });

        it('should prevent unauthorized appointment access', async function() {
            // Create another patient
            const otherPatientResponse = await request.post('/api/auth/register').send({
                email: 'other@patient.com',
                password: 'testPass123',
                firstName: 'Other',
                lastName: 'Patient',
                role: 'patient'
            });

            const otherPatientToken = otherPatientResponse.body.token;

            // Try to access first patient's appointments
            await request
                .get(`/api/appointments/${patientId}`)
                .set('Authorization', `Bearer ${otherPatientToken}`)
                .expect(403);

            // Try to cancel first patient's appointment
            await request
                .delete(`/api/appointments/${appointmentId}`)
                .set('Authorization', `Bearer ${otherPatientToken}`)
                .expect(403);
        });
    });

    describe('Provider Dashboard and Scheduling', function() {
        beforeEach(async function() {
            // Create some appointments for the provider
            await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-01T09:00:00Z',
                    appointment_type: 'consultation',
                    duration: 60
                });

            await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-01T13:00:00Z',
                    appointment_type: 'evaluation',
                    duration: 90
                });
        });

        it('should allow providers to view their appointments', async function() {
            const response = await request
                .get(`/api/providers/${providerId}/appointments`)
                .set('Authorization', `Bearer ${providerToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.appointments).to.be.an('array');
            expect(response.body.appointments.length).to.equal(2);

            const appointment = response.body.appointments[0];
            expect(appointment).to.have.property('patient_name');
            expect(appointment).to.have.property('scheduled_at');
            expect(appointment).to.have.property('type');
        });

        it('should allow providers to update appointment notes', async function() {
            const appointments = await request
                .get(`/api/providers/${providerId}/appointments`)
                .set('Authorization', `Bearer ${providerToken}`);
            
            const appointmentId = appointments.body.appointments[0].id;

            const response = await request
                .patch(`/api/appointments/${appointmentId}/provider-notes`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send({ 
                    notes: 'Patient reports increased mobility concerns',
                    status: 'in_progress'
                })
                .expect(200);

            expect(response.body.success).to.be.true;

            // Verify notes were updated
            const appointment = db.prepare('SELECT notes, status FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment.notes).to.include('mobility concerns');
            expect(appointment.status).to.equal('in_progress');
        });

        it('should prevent providers from accessing other providers appointments', async function() {
            // Create another provider
            const otherProviderResponse = await request.post('/api/auth/register').send({
                email: 'other@provider.com',
                password: 'testPass123',
                firstName: 'Other',
                lastName: 'Provider',
                role: 'provider',
                provider_type: 'ot'
            });

            const otherProviderToken = otherProviderResponse.body.token;

            // Try to access first provider's appointments
            const response = await request
                .get(`/api/providers/${providerId}/appointments`)
                .set('Authorization', `Bearer ${otherProviderToken}`)
                .expect(403);

            expect(response.body.success).to.be.false;
        });
    });

    describe('Appointment Search and Filtering', function() {
        beforeEach(async function() {
            // Create appointments with different statuses and dates
            const appointments = [
                {
                    scheduled_at: '2024-12-01T10:00:00Z',
                    appointment_type: 'consultation',
                    status: 'scheduled'
                },
                {
                    scheduled_at: '2024-12-02T14:00:00Z',
                    appointment_type: 'evaluation',
                    status: 'confirmed'
                },
                {
                    scheduled_at: '2024-12-03T16:00:00Z',
                    appointment_type: 'follow_up',
                    status: 'completed'
                }
            ];

            for (const appt of appointments) {
                await request
                    .post('/api/appointments')
                    .set('Authorization', `Bearer ${patientToken}`)
                    .send({
                        provider_id: providerId,
                        ...appt
                    });
            }
        });

        it('should filter appointments by status', async function() {
            const response = await request
                .get(`/api/appointments/${patientId}?status=scheduled`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.appointments).to.be.an('array');
            
            const scheduledAppointments = response.body.appointments.filter(a => a.status === 'scheduled');
            expect(scheduledAppointments.length).to.be.greaterThan(0);
        });

        it('should filter appointments by date range', async function() {
            const response = await request
                .get(`/api/appointments/${patientId}?start_date=2024-12-01&end_date=2024-12-02`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.appointments.length).to.be.lessThan(3); // Should exclude Dec 3rd appointment
        });

        it('should sort appointments by date', async function() {
            const response = await request
                .get(`/api/appointments/${patientId}?sort=date_asc`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            const appointments = response.body.appointments;
            
            // Verify chronological order
            for (let i = 1; i < appointments.length; i++) {
                const prevDate = new Date(appointments[i-1].scheduled_at);
                const currentDate = new Date(appointments[i].scheduled_at);
                expect(prevDate.getTime()).to.be.lessThanOrEqual(currentDate.getTime());
            }
        });
    });

    describe('Appointment Notifications and Reminders', function() {
        it('should track reminder status for appointments', async function() {
            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-01T10:00:00Z',
                    appointment_type: 'consultation',
                    contact_preference: 'email'
                })
                .expect(201);

            const appointmentId = response.body.appointment_id;

            // Check appointment has reminder fields
            const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment).to.have.property('reminder_sent_at');
        });

        it('should handle appointment confirmation workflow', async function() {
            const response = await request
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    provider_id: providerId,
                    scheduled_at: '2024-12-01T10:00:00Z',
                    appointment_type: 'consultation'
                })
                .expect(201);

            const appointmentId = response.body.appointment_id;
            const confirmationNumber = response.body.confirmation_number;

            // Simulate confirmation via confirmation number
            const confirmResponse = await request
                .post(`/api/appointments/${appointmentId}/confirm`)
                .send({ confirmation_number: confirmationNumber })
                .expect(200);

            expect(confirmResponse.body.success).to.be.true;

            // Verify status updated
            const appointment = db.prepare('SELECT status FROM appointments WHERE id = ?').get(appointmentId);
            expect(appointment.status).to.equal('confirmed');
        });
    });
});