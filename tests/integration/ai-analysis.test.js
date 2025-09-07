/**
 * AI Room Analysis Integration Tests
 * Tests real AI room analysis, hazard detection, and recommendation generation
 */

import { expect } from 'chai';
import supertest from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB = path.join(__dirname, '..', '..', 'test_healthcare.db');
const TEST_IMAGES_DIR = path.join(__dirname, '..', 'fixtures', 'images');
const SCHEMA_FILE = path.join(__dirname, '..', '..', 'schema.sql');

describe('AI Room Analysis Integration Tests', function() {
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

        // Create test images directory
        if (!fs.existsSync(TEST_IMAGES_DIR)) {
            fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
        }

        // Create sample test image if it doesn't exist
        const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
        if (!fs.existsSync(testImagePath)) {
            // Create a simple test image (1x1 pixel JPEG)
            const testImageBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/AB+D', 'base64');
            fs.writeFileSync(testImagePath, testImageBuffer);
        }

        // Import server with test database
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_PATH = TEST_DB;
        
        const serverModule = await import('../../server.js');
        app = serverModule.default || serverModule.app;
        request = supertest(app);

        // Create test user and get token
        const registerResponse = await request.post('/api/register').send({
            email: 'ai_test@example.com',
            password: 'testPass123',
            first_name: 'AI',
            last_name: 'Tester',
            role: 'patient'
        });
        
        userToken = registerResponse.body.token;
        userId = registerResponse.body.userId;
    });

    after(function() {
        db.close();
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    beforeEach(function() {
        // Clean assessments table before each test
        db.prepare('DELETE FROM assessments').run();
    });

    describe('Room Image Upload and Analysis', function() {
        it('should accept image upload for room analysis', async function() {
            this.timeout(15000);

            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .field('user_context', JSON.stringify({ 
                    mobility_concerns: true,
                    age_range: '65-75' 
                }))
                .expect(200);

            expect(response.body).to.have.property('success', true);
            expect(response.body).to.have.property('analysis_id');
            expect(response.body).to.have.property('room_type', 'bathroom');
            expect(response.body).to.have.property('hazards');
            expect(response.body).to.have.property('recommendations');
            expect(response.body).to.have.property('risk_score');

            // Verify analysis was saved to database
            const analysis = db.prepare('SELECT * FROM assessments WHERE id = ?').get(response.body.analysis_id);
            expect(analysis).to.exist;
            expect(analysis.user_id).to.equal(userId);
            expect(analysis.room_type).to.equal('bathroom');
        });

        it('should require authentication for room analysis', async function() {
            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            await request
                .post('/api/room-analysis')
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .expect(401);
        });

        it('should validate room type parameter', async function() {
            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'invalid_room')
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('room_type');
        });

        it('should require image file', async function() {
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .field('room_type', 'bathroom')
                .expect(400);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('image');
        });
    });

    describe('AI Analysis Results Validation', function() {
        it('should return structured hazard analysis', async function() {
            this.timeout(15000);

            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .expect(200);

            // Validate hazards structure
            expect(response.body.hazards).to.be.an('array');
            if (response.body.hazards.length > 0) {
                const hazard = response.body.hazards[0];
                expect(hazard).to.have.property('type');
                expect(hazard).to.have.property('description');
                expect(hazard).to.have.property('severity');
                expect(hazard).to.have.property('confidence');
                expect(hazard.severity).to.be.oneOf(['low', 'moderate', 'high', 'critical']);
                expect(hazard.confidence).to.be.a('number').within(0, 1);
            }

            // Validate recommendations structure
            expect(response.body.recommendations).to.be.an('array');
            if (response.body.recommendations.length > 0) {
                const recommendation = response.body.recommendations[0];
                expect(recommendation).to.have.property('action');
                expect(recommendation).to.have.property('priority');
                expect(recommendation.priority).to.be.oneOf(['immediate', 'short_term', 'long_term']);
            }

            // Validate risk score
            expect(response.body.risk_score).to.be.a('number').within(0, 100);
        });

        it('should handle different room types with appropriate analysis', async function() {
            this.timeout(20000);

            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            const roomTypes = ['bathroom', 'kitchen', 'bedroom', 'living_room'];

            for (const roomType of roomTypes) {
                const response = await request
                    .post('/api/room-analysis')
                    .set('Authorization', `Bearer ${userToken}`)
                    .attach('image', testImagePath)
                    .field('room_type', roomType)
                    .expect(200);

                expect(response.body.room_type).to.equal(roomType);
                expect(response.body.hazards).to.be.an('array');
                expect(response.body.recommendations).to.be.an('array');

                // Different room types may have different default hazards in mock mode
                if (!process.env.OPENAI_API_KEY) {
                    // In mock mode, verify room-specific hazards are returned
                    expect(response.body.hazards.length).to.be.greaterThan(0);
                }
            }
        });

        it('should include user context in analysis', async function() {
            this.timeout(15000);

            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            const userContext = {
                age_range: '75+',
                mobility_aids: ['walker'],
                fall_history: true,
                vision_impaired: true
            };
            
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .field('user_context', JSON.stringify(userContext))
                .expect(200);

            expect(response.body.user_context).to.deep.equal(userContext);

            // Verify analysis was personalized (should be reflected in database)
            const analysis = db.prepare('SELECT * FROM assessments WHERE id = ?').get(response.body.analysis_id);
            const aiAnalysisData = JSON.parse(analysis.ai_analysis);
            expect(aiAnalysisData.user_context).to.exist;
        });
    });

    describe('Analysis History and Retrieval', function() {
        beforeEach(async function() {
            // Create some test assessments
            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .expect(200);

            await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'kitchen')
                .expect(200);
        });

        it('should retrieve user assessment history', async function() {
            const response = await request
                .get(`/api/assessments/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.assessments).to.be.an('array');
            expect(response.body.assessments.length).to.equal(2);

            const assessment = response.body.assessments[0];
            expect(assessment).to.have.property('id');
            expect(assessment).to.have.property('room_type');
            expect(assessment).to.have.property('risk_score');
            expect(assessment).to.have.property('created_at');
        });

        it('should retrieve specific assessment details', async function() {
            // First get the assessment list
            const listResponse = await request
                .get(`/api/assessments/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            const assessmentId = listResponse.body.assessments[0].id;

            // Then get specific assessment
            const response = await request
                .get(`/api/assessments/detail/${assessmentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body.assessment).to.have.property('id', assessmentId);
            expect(response.body.assessment).to.have.property('hazards_detected');
            expect(response.body.assessment).to.have.property('ai_analysis');
        });

        it('should prevent access to other users assessments', async function() {
            // Create another user
            const otherUserResponse = await request.post('/api/register').send({
                email: 'other_user@example.com',
                password: 'testPass123',
                first_name: 'Other',
                last_name: 'User',
                role: 'patient'
            });

            const otherUserToken = otherUserResponse.body.token;

            // Try to access first user's assessments
            const response = await request
                .get(`/api/assessments/${userId}`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .expect(403);

            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('access');
        });
    });

    describe('AI Service Health and Fallback', function() {
        it('should provide service health status', async function() {
            const response = await request
                .get('/api/ai/health')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body).to.have.property('service', 'AI Analysis Service');
            expect(response.body).to.have.property('status');
            expect(response.body).to.have.property('timestamp');

            if (!process.env.OPENAI_API_KEY) {
                expect(response.body.status).to.equal('mock_mode');
                expect(response.body.openai_configured).to.be.false;
            }
        });

        it('should handle analysis when AI service is unavailable', async function() {
            this.timeout(15000);

            const testImagePath = path.join(TEST_IMAGES_DIR, 'bathroom_test.jpg');
            
            // This test will use mock mode if OpenAI is not configured
            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', testImagePath)
                .field('room_type', 'bathroom')
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('hazards');
            expect(response.body).to.have.property('recommendations');

            // In mock mode, should have fallback indicator
            if (!process.env.OPENAI_API_KEY) {
                expect(response.body.processed_by).to.equal('mock_analysis');
            }
        });
    });

    describe('Error Handling and Edge Cases', function() {
        it('should handle corrupted image files gracefully', async function() {
            const corruptedImagePath = path.join(TEST_IMAGES_DIR, 'corrupted.jpg');
            fs.writeFileSync(corruptedImagePath, 'not an image');

            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', corruptedImagePath)
                .field('room_type', 'bathroom')
                .expect(400);

            expect(response.body.success).to.be.false;

            // Clean up
            fs.unlinkSync(corruptedImagePath);
        });

        it('should handle large file sizes appropriately', async function() {
            this.timeout(10000);

            // Create a larger test file (still small for testing)
            const largeImagePath = path.join(TEST_IMAGES_DIR, 'large_test.jpg');
            const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
            fs.writeFileSync(largeImagePath, largeBuffer);

            const response = await request
                .post('/api/room-analysis')
                .set('Authorization', `Bearer ${userToken}`)
                .attach('image', largeImagePath)
                .field('room_type', 'bathroom');

            // Should either succeed or fail gracefully with clear error
            if (response.status === 413) {
                expect(response.body.error).to.include('large');
            } else {
                expect(response.status).to.equal(200);
            }

            // Clean up
            fs.unlinkSync(largeImagePath);
        });
    });
});