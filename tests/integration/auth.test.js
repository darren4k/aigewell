/**
 * Authentication Integration Tests
 * Tests user registration, login, role assignment, and JWT handling
 */

import { expect } from 'chai';
import supertest from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database setup
const TEST_DB = path.join(__dirname, '..', '..', 'test_healthcare.db');
const SCHEMA_FILE = path.join(__dirname, '..', '..', 'schema.sql');

describe('Authentication Integration Tests', function() {
    let db;
    let app;
    let request;

    before(async function() {
        // Clean up any existing test database
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }

        // Create test database with schema
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
        
        // Dynamically import server after setting test env
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

    beforeEach(function() {
        // Clean users table before each test
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM audit_logs').run();
    });

    describe('User Registration', function() {
        it('should register a new patient user', async function() {
            const userData = {
                email: 'test@patient.com',
                password: 'securePass123',
                first_name: 'John',
                last_name: 'Doe',
                role: 'patient',
                phone: '+1234567890'
            };

            const response = await request
                .post('/api/register')
                .send(userData)
                .expect(201);

            expect(response.body).to.have.property('success', true);
            expect(response.body).to.have.property('userId');
            expect(response.body).to.have.property('token');

            // Verify user in database
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(userData.email);
            expect(user).to.exist;
            expect(user.role).to.equal('patient');
            expect(user.first_name).to.equal('John');
        });

        it('should register a provider with additional fields', async function() {
            const providerData = {
                email: 'provider@test.com',
                password: 'securePass123',
                first_name: 'Jane',
                last_name: 'Smith',
                role: 'provider',
                provider_type: 'pt',
                license_number: 'PT123456',
                specialties: JSON.stringify(['geriatric', 'home_safety'])
            };

            const response = await request
                .post('/api/register')
                .send(providerData)
                .expect(201);

            expect(response.body.success).to.be.true;

            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(providerData.email);
            expect(user.provider_type).to.equal('pt');
            expect(user.license_number).to.equal('PT123456');
        });

        it('should reject registration with duplicate email', async function() {
            const userData = {
                email: 'duplicate@test.com',
                password: 'pass123',
                first_name: 'Test',
                last_name: 'User',
                role: 'patient'
            };

            // First registration should succeed
            await request.post('/api/register').send(userData).expect(201);

            // Second registration should fail
            const response = await request
                .post('/api/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('already exists');
        });

        it('should validate required fields', async function() {
            const incompleteData = {
                email: 'incomplete@test.com',
                // Missing password, first_name, last_name
            };

            const response = await request
                .post('/api/register')
                .send(incompleteData)
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('required');
        });
    });

    describe('User Login', function() {
        beforeEach(async function() {
            // Create test user for login tests
            await request.post('/api/register').send({
                email: 'login@test.com',
                password: 'testPass123',
                first_name: 'Test',
                last_name: 'User',
                role: 'patient'
            });
        });

        it('should login with valid credentials', async function() {
            const response = await request
                .post('/api/login')
                .send({
                    email: 'login@test.com',
                    password: 'testPass123'
                })
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('token');
            expect(response.body.user).to.have.property('role', 'patient');
            expect(response.body.user).to.not.have.property('password_hash');
        });

        it('should reject login with invalid password', async function() {
            const response = await request
                .post('/api/login')
                .send({
                    email: 'login@test.com',
                    password: 'wrongPassword'
                })
                .expect(401);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('Invalid');
        });

        it('should reject login for non-existent user', async function() {
            const response = await request
                .post('/api/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'anyPassword'
                })
                .expect(401);

            expect(response.body.success).to.be.false;
        });
    });

    describe('JWT Token Validation', function() {
        let validToken;
        let userId;

        beforeEach(async function() {
            const registerResponse = await request.post('/api/register').send({
                email: 'jwt@test.com',
                password: 'testPass123',
                first_name: 'JWT',
                last_name: 'User',
                role: 'patient'
            });
            validToken = registerResponse.body.token;
            userId = registerResponse.body.userId;
        });

        it('should access protected route with valid token', async function() {
            const response = await request
                .get('/api/dashboard')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.user).to.have.property('id', userId);
        });

        it('should reject access without token', async function() {
            await request
                .get('/api/dashboard')
                .expect(401);
        });

        it('should reject access with invalid token', async function() {
            await request
                .get('/api/dashboard')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);
        });
    });

    describe('Role-Based Access Control', function() {
        let patientToken, providerToken, caregiverToken;

        beforeEach(async function() {
            // Create users with different roles
            const patientRes = await request.post('/api/register').send({
                email: 'patient@rbac.com',
                password: 'pass123',
                first_name: 'Patient',
                last_name: 'User',
                role: 'patient'
            });
            patientToken = patientRes.body.token;

            const providerRes = await request.post('/api/register').send({
                email: 'provider@rbac.com',
                password: 'pass123',
                first_name: 'Provider',
                last_name: 'User',
                role: 'provider',
                provider_type: 'pt'
            });
            providerToken = providerRes.body.token;

            const caregiverRes = await request.post('/api/register').send({
                email: 'caregiver@rbac.com',
                password: 'pass123',
                first_name: 'Caregiver',
                last_name: 'User',
                role: 'caregiver'
            });
            caregiverToken = caregiverRes.body.token;
        });

        it('should allow providers to access provider endpoints', async function() {
            const response = await request
                .get('/api/providers/search')
                .set('Authorization', `Bearer ${providerToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
        });

        it('should allow patients to book appointments', async function() {
            const response = await request
                .get('/api/appointments/patient@rbac.com')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
        });

        it('should enforce role permissions correctly', async function() {
            // Patient trying to access admin functions should be controlled
            const response = await request
                .get('/api/dashboard')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.permissions).to.include('view_own_data');
            expect(response.body.permissions).to.not.include('manage_all_users');
        });
    });

    describe('Audit Logging', function() {
        let userToken;

        beforeEach(async function() {
            const registerResponse = await request.post('/api/register').send({
                email: 'audit@test.com',
                password: 'testPass123',
                first_name: 'Audit',
                last_name: 'User',
                role: 'patient'
            });
            userToken = registerResponse.body.token;
        });

        it('should log successful login attempts', async function() {
            await request.post('/api/login').send({
                email: 'audit@test.com',
                password: 'testPass123'
            }).expect(200);

            const logs = db.prepare('SELECT * FROM audit_logs WHERE action = ?').all('LOGIN');
            expect(logs).to.have.length.greaterThan(0);
            expect(logs[0]).to.have.property('result', 'success');
        });

        it('should log failed login attempts', async function() {
            await request.post('/api/login').send({
                email: 'audit@test.com',
                password: 'wrongPassword'
            }).expect(401);

            const logs = db.prepare('SELECT * FROM audit_logs WHERE action = ? AND result = ?').all('LOGIN', 'failed');
            expect(logs).to.have.length.greaterThan(0);
        });

        it('should log protected resource access', async function() {
            await request
                .get('/api/dashboard')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            const logs = db.prepare('SELECT * FROM audit_logs WHERE action = ?').all('DASHBOARD_ACCESS');
            expect(logs).to.have.length.greaterThan(0);
        });
    });
});