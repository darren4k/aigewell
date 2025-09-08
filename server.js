#!/usr/bin/env node

// Local development server for SafeAging app
// This provides the backend functionality that would normally run on Cloudflare Workers

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import AI analysis service
import aiAnalysisService from './src/services/ai-analysis.js';

// Import services
import AppointmentBookingService from './src/services/appointment-service.js';
import PaymentService from './src/services/payment-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET environment variable must be set and at least 32 characters long');
    console.error('Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

// Database setup with encryption support
const DB_PATH = process.env.DATABASE_PATH || 'healthcare.db';
const dbOptions = {
    fileMustExist: false,
    timeout: 5000,
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
};

// Production database encryption (HIPAA compliance)
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_ENCRYPTION_KEY) {
    console.log('Initializing encrypted database for production');
    dbOptions.pragma = {
        key: `'${process.env.DATABASE_ENCRYPTION_KEY}'`,
        journal_mode: 'WAL',
        synchronous: 'FULL',
        temp_store: 'MEMORY',
        mmap_size: 268435456 // 256MB
    };
} else {
    dbOptions.pragma = {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        temp_store: 'MEMORY'
    };
}

const db = new Database(DB_PATH, dbOptions);

// Initialize services after db is available
const appointmentService = new AppointmentBookingService(db);
const paymentService = new PaymentService(db);

// Complete any deferred service initialization
setTimeout(() => {
  appointmentService.completeInitialization();
}, 100);

// Role-based permissions helper
function getRolePermissions(role) {
    const permissions = {
        patient: ['view_own_data', 'schedule_appointments', 'take_assessments', 'view_equipment'],
        caregiver: ['view_patient_data', 'schedule_appointments', 'receive_alerts', 'view_equipment'],
        provider: ['view_all_patients', 'create_assessments', 'manage_schedule', 'generate_reports', 'prescribe_equipment']
    };
    return permissions[role] || [];
}

// Role-based authorization middleware
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;

            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}

// Permission-based authorization middleware
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// Security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
// Custom security middleware (replaces express-mongo-sanitize and xss-clean for compatibility)
import { xssProtection, sqlInjectionProtection, hipaaProtection, createSensitiveOperationLimiter } from './src/middleware/security.js';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'test' ? 10000 : 100),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for test environment
    return process.env.NODE_ENV === 'test';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Higher limit for testing
  message: { error: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true,
  skip: (req) => {
    // Skip rate limiting for test environment
    return process.env.NODE_ENV === 'test';
  }
});

// Enhanced rate limiter for sensitive operations (payments, etc.)
const sensitiveOperationLimiter = createSensitiveOperationLimiter();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.openai.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(limiter);
// Custom security middleware (HIPAA-compliant)
app.use(hipaaProtection);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(hpp());

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist'));

// Audit logging middleware
const auditLog = (action, resource) => {
  return (req, res, next) => {
    if (process.env.ENABLE_AUDIT_LOGGING === 'true') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        user_id: req.user?.id || 'anonymous',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        action,
        resource,
        request_id: crypto.randomUUID()
      };
      
      try {
        db.prepare(`
          INSERT INTO audit_logs (timestamp, user_id, ip_address, user_agent, action, resource, request_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          logEntry.timestamp,
          logEntry.user_id,
          logEntry.ip_address,
          logEntry.user_agent,
          logEntry.action,
          logEntry.resource,
          logEntry.request_id
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    }
    next();
  };
};

// File upload setup
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        // Attach permissions to user object if not already present
        if (!user.permissions && user.role) {
            user.permissions = getRolePermissions(user.role);
        }
        
        req.user = user;
        next();
    });
}

// Helper function to hash passwords
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Helper function to verify passwords  
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// ===== AUTHENTICATION ROUTES =====

// Register
app.post('/api/auth/register', authLimiter, auditLog('AUTH_REGISTER', 'users'), async (req, res) => {
    const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone,
        role = 'patient',
        providerType,
        licenseNumber,
        specialties 
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }

    try {
        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = db.prepare(`
            INSERT INTO users (
                email, password_hash, first_name, last_name, phone, 
                role, provider_type, license_number, specialties, 
                is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(
            email, 
            passwordHash, 
            firstName, 
            lastName, 
            phone || null,
            role,
            providerType || null,
            licenseNumber || null,
            specialties ? JSON.stringify(specialties) : null
        );

        // Get complete user record
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

        // Generate JWT token with configurable expiration (HIPAA compliance - max 24h)
        const sessionTimeout = process.env.SESSION_TIMEOUT_HOURS || '24';
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                iat: Math.floor(Date.now() / 1000),
                permissions: getRolePermissions(user.role)
            }, 
            JWT_SECRET, 
            { expiresIn: `${sessionTimeout}h` }
        );

        // Return user info (without password)
        res.json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: user.role,
                providerType: user.provider_type,
                licenseNumber: user.license_number,
                specialties: user.specialties ? JSON.parse(user.specialties) : []
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Login
app.post('/api/auth/login', authLimiter, auditLog('AUTH_LOGIN', 'users'), async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        // Get user by email
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token with configurable expiration (HIPAA compliance - max 24h)
        const sessionTimeout = process.env.SESSION_TIMEOUT_HOURS || '24';
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                iat: Math.floor(Date.now() / 1000),
                permissions: getRolePermissions(user.role)
            }, 
            JWT_SECRET, 
            { expiresIn: `${sessionTimeout}h` }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: user.role,
                providerType: user.provider_type,
                licenseNumber: user.license_number,
                specialties: user.specialties ? JSON.parse(user.specialties) : []
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, email, first_name, last_name, phone, role, 
                   provider_type, license_number, specialties, 
                   created_at, updated_at
            FROM users WHERE id = ?
        `).get(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: user.role,
                providerType: user.provider_type,
                licenseNumber: user.license_number,
                specialties: user.specialties ? JSON.parse(user.specialties) : [],
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

// ===== ASSESSMENT ROUTES =====

// Analyze room photo with real AI
app.post('/api/analyze-room', authenticateToken, auditLog('ROOM_ANALYSIS', 'assessments'), upload.single('image'), async (req, res) => {
    const { roomType } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
    }

    try {
        // Get user context for personalized analysis
        const userContext = {
            user_id: userId,
            role: userRole,
            room_type: roomType,
            timestamp: new Date().toISOString()
        };

        // Use real AI analysis service
        console.log(`Starting AI analysis for ${roomType} by user ${userId}`);
        const analysisResult = await aiAnalysisService.analyzeRoomImage(
            req.file.path,
            roomType,
            userContext
        );

        // Store comprehensive assessment in database
        const result = db.prepare(`
            INSERT INTO assessments (
                user_id, room_type, image_url, hazards_detected, 
                risk_score, ai_analysis, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            userId,
            roomType,
            req.file.path,
            JSON.stringify(analysisResult.hazards || []),
            analysisResult.risk_score || 50,
            JSON.stringify(analysisResult),
            analysisResult.success ? 'analyzed' : 'analysis_failed'
        );

        // Log analysis completion
        console.log(`AI analysis completed for assessment ${result.lastInsertRowid}: ${analysisResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Return comprehensive results
        res.json({
            success: analysisResult.success,
            assessmentId: result.lastInsertRowid,
            roomType,
            hazards: analysisResult.hazards || [],
            riskScore: analysisResult.risk_score || 50,
            recommendations: analysisResult.recommendations || [],
            analysis: {
                confidence: analysisResult.confidence_level,
                model_used: analysisResult.ai_model,
                processing_time: analysisResult.analysis_timestamp,
                analysis_id: analysisResult.analysis_id,
                is_fallback: analysisResult.is_fallback || false
            },
            imageUrl: req.file.path,
            message: analysisResult.success 
                ? 'Room analysis completed successfully using AI vision' 
                : 'Analysis completed using fallback method',
            error_details: analysisResult.error_details || null
        });

    } catch (error) {
        console.error('Room analysis error:', error);
        
        // Log error for monitoring
        try {
            db.prepare(`
                INSERT INTO assessments (
                    user_id, room_type, image_url, hazards_detected, 
                    risk_score, ai_analysis, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(
                userId,
                roomType,
                req.file.path,
                JSON.stringify([]),
                0,
                JSON.stringify({ error: error.message }),
                'analysis_error'
            );
        } catch (dbError) {
            console.error('Failed to log error to database:', dbError);
        }

        res.status(500).json({ 
            success: false,
            error: 'Failed to analyze room image',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            fallback_available: true
        });
    }
});

// Get user's assessments
app.get('/api/assessments/:userId', authenticateToken, (req, res) => {
    const userId = req.params.userId;
    
    try {
        const assessments = db.prepare(`
            SELECT * FROM assessments 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `).all(userId);

        res.json({ assessments });
    } catch (error) {
        console.error('Failed to fetch assessments:', error);
        res.status(500).json({ error: 'Failed to fetch assessments' });
    }
});

// Save clinical assessment
app.post('/api/clinical-assessments', authenticateToken, (req, res) => {
    const { assessmentType, responses, status, results } = req.body;
    const userId = req.user.userId;

    try {
        const result = db.prepare(`
            INSERT INTO clinical_assessments (
                user_id, assessment_type, responses, scores, 
                risk_level, recommendations, status, completed_at,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            userId,
            assessmentType,
            JSON.stringify(responses),
            results ? JSON.stringify(results) : null,
            results?.riskLevel || null,
            results?.recommendations ? JSON.stringify(results.recommendations) : null,
            status,
            status === 'completed' ? new Date().toISOString() : null
        );

        res.json({ 
            success: true, 
            assessmentId: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('Clinical assessment save error:', error);
        res.status(500).json({ error: 'Failed to save assessment' });
    }
});

// Get clinical assessments
app.get('/api/clinical-assessments/:userId', authenticateToken, (req, res) => {
    const userId = req.params.userId;

    try {
        const assessments = db.prepare(`
            SELECT * FROM clinical_assessments 
            WHERE user_id = ? 
            ORDER BY completed_at DESC, created_at DESC
        `).all(userId);

        res.json({ assessments });
    } catch (error) {
        console.error('Failed to fetch clinical assessments:', error);
        res.status(500).json({ error: 'Failed to fetch assessments' });
    }
});

// ===== APPOINTMENT ROUTES =====

// Search providers
app.get('/api/providers/search', authenticateToken, auditLog('PROVIDER_SEARCH', 'providers'), async (req, res) => {
    try {
        const searchCriteria = {
            specialty: req.query.specialty,
            location: req.query.location,
            date: req.query.date,
            time_preference: req.query.time_preference,
            insurance: req.query.insurance,
            max_distance: parseInt(req.query.max_distance) || 50
        };

        const providers = await appointmentService.searchProviders(searchCriteria);
        
        res.json({
            success: true,
            providers,
            search_criteria: searchCriteria,
            total_found: providers.length
        });
    } catch (error) {
        console.error('Provider search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to search providers' 
        });
    }
});

// Get provider availability
app.get('/api/providers/:providerId/availability', authenticateToken, async (req, res) => {
    try {
        const { providerId } = req.params;
        const days = parseInt(req.query.days) || 14;
        
        const availability = await appointmentService.getProviderAvailability(providerId, days);
        
        res.json({
            success: true,
            provider_id: providerId,
            availability,
            total_slots: availability.length
        });
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get availability' 
        });
    }
});

// Book appointment with real functionality
app.post('/api/appointments', authenticateToken, auditLog('APPOINTMENT_BOOKING', 'appointments'), async (req, res) => {
    const { 
        provider_id, 
        scheduled_at, 
        appointment_type, 
        duration = 60, 
        notes = '',
        insurance_info = null,
        contact_preference = 'phone'
    } = req.body;
    
    const user_id = req.user.userId;

    // Validate required fields
    if (!provider_id || !scheduled_at || !appointment_type) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields: provider_id, scheduled_at, appointment_type' 
        });
    }

    try {
        const bookingResult = await appointmentService.bookAppointment({
            user_id,
            provider_id,
            scheduled_at,
            appointment_type,
            duration,
            notes,
            insurance_info,
            contact_preference
        });

        res.status(bookingResult.success ? 201 : 400).json(bookingResult);
    } catch (error) {
        console.error('Appointment booking error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to book appointment',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user appointments with enhanced data
app.get('/api/appointments/:userId', authenticateToken, auditLog('GET_APPOINTMENTS', 'appointments'), (req, res) => {
    const userId = req.params.userId;
    const userRole = req.user.role;
    const status = req.query.status;

    // Ensure user can only access their own appointments (unless provider)
    if (userId !== req.user.userId.toString() && userRole !== 'provider') {
        return res.status(403).json({ 
            success: false,
            error: 'Access denied - can only view own appointments' 
        });
    }

    try {
        const appointments = appointmentService.getUserAppointments(userId, userRole, status);
        
        res.json({
            success: true,
            appointments,
            user_role: userRole,
            filtered_by_status: status || 'all',
            total_count: appointments.length
        });
    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch appointments' 
        });
    }
});

// Reschedule appointment
app.patch('/api/appointments/:appointmentId/reschedule', authenticateToken, auditLog('RESCHEDULE_APPOINTMENT', 'appointments'), async (req, res) => {
    const { appointmentId } = req.params;
    const { new_scheduled_at, reason = '' } = req.body;

    if (!new_scheduled_at) {
        return res.status(400).json({ 
            success: false,
            error: 'new_scheduled_at is required' 
        });
    }

    try {
        const result = await appointmentService.rescheduleAppointment(appointmentId, new_scheduled_at, reason);
        res.json(result);
    } catch (error) {
        console.error('Reschedule error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to reschedule appointment' 
        });
    }
});

// Cancel appointment
app.patch('/api/appointments/:appointmentId/cancel', authenticateToken, auditLog('CANCEL_APPOINTMENT', 'appointments'), async (req, res) => {
    const { appointmentId } = req.params;
    const { reason = '', cancelled_by = 'patient' } = req.body;

    try {
        const result = await appointmentService.cancelAppointment(appointmentId, reason, cancelled_by);
        res.json(result);
    } catch (error) {
        console.error('Cancellation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to cancel appointment' 
        });
    }
});

// Get all providers (legacy endpoint - use /api/providers/search for advanced search)
app.get('/api/providers', authenticateToken, async (req, res) => {
    try {
        const providers = await appointmentService.searchProviders({});
        res.json({ 
            success: true,
            providers,
            message: 'Use /api/providers/search for advanced filtering'
        });
    } catch (error) {
        console.error('Provider fetch error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch providers' 
        });
    }
});

// Legacy provider endpoint for backward compatibility
app.get('/api/providers/legacy', (req, res) => {
    try {
        const providers = db.prepare(`
            SELECT id, first_name, last_name, provider_type, 
                   license_number, specialties, created_at
            FROM users 
            WHERE role = 'provider' AND is_active = 1
        `).all();

        // Add demo providers if none exist
        const providersWithDemo = providers.length > 0 ? providers : getDemoProviders();
        
        res.json({ providers: providersWithDemo });
    } catch (error) {
        console.error('Failed to fetch providers:', error);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

// ===== PAYMENT ENDPOINTS =====

// Create payment intent for service
app.post('/api/payments/intent', authenticateToken, auditLog('PAYMENT_INTENT', 'payments'), async (req, res) => {
    const { service_type, service_id, metadata } = req.body;
    const user_id = req.user.userId;

    try {
        const paymentResult = await paymentService.createPaymentIntent({
            user_id,
            service_type,
            service_id,
            metadata
        });

        res.status(paymentResult.success ? 201 : 400).json(paymentResult);
    } catch (error) {
        console.error('Payment intent creation failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Payment processing failed' 
        });
    }
});

// Confirm payment
app.post('/api/payments/confirm', authenticateToken, auditLog('PAYMENT_CONFIRM', 'payments'), async (req, res) => {
    const { payment_intent_id, payment_method_id } = req.body;

    try {
        const confirmResult = await paymentService.confirmPayment(payment_intent_id, payment_method_id);
        res.json(confirmResult);
    } catch (error) {
        console.error('Payment confirmation failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Payment confirmation failed' 
        });
    }
});

// Create subscription
app.post('/api/subscriptions', authenticateToken, auditLog('SUBSCRIPTION_CREATE', 'subscriptions'), async (req, res) => {
    const { plan_type, payment_method_id } = req.body;
    const user_id = req.user.userId;

    try {
        const subscriptionResult = await paymentService.createSubscription({
            user_id,
            plan_type,
            payment_method_id
        });

        res.status(subscriptionResult.success ? 201 : 400).json(subscriptionResult);
    } catch (error) {
        console.error('Subscription creation failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Subscription creation failed' 
        });
    }
});

// Cancel subscription
app.post('/api/subscriptions/:subscriptionId/cancel', authenticateToken, auditLog('SUBSCRIPTION_CANCEL', 'subscriptions'), async (req, res) => {
    const { subscriptionId } = req.params;
    const { cancel_immediately = false } = req.body;

    try {
        const cancelResult = await paymentService.cancelSubscription(subscriptionId, cancel_immediately);
        res.json(cancelResult);
    } catch (error) {
        console.error('Subscription cancellation failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Subscription cancellation failed' 
        });
    }
});

// Process refund
app.post('/api/payments/:transactionId/refund', authenticateToken, auditLog('PAYMENT_REFUND', 'payments'), async (req, res) => {
    const { transactionId } = req.params;
    const { amount, reason } = req.body;

    try {
        const refundResult = await paymentService.processRefund(transactionId, amount, reason);
        res.json(refundResult);
    } catch (error) {
        console.error('Refund processing failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Refund processing failed' 
        });
    }
});

// Get payment history
app.get('/api/payments/history', authenticateToken, auditLog('PAYMENT_HISTORY', 'payments'), (req, res) => {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    try {
        const paymentHistory = paymentService.getPaymentHistory(userId, limit);
        res.json({
            success: true,
            ...paymentHistory
        });
    } catch (error) {
        console.error('Payment history fetch failed:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch payment history' 
        });
    }
});

// Payment service health check
app.get('/api/payments/health', authenticateToken, async (req, res) => {
    try {
        const healthStatus = await paymentService.healthCheck();
        res.json(healthStatus);
    } catch (error) {
        console.error('Payment health check failed:', error);
        res.status(500).json({ 
            service: 'Payment Service',
            status: 'error',
            error: error.message 
        });
    }
});

// ===== HELPER FUNCTIONS =====

function analyzeRoomHazards(roomType) {
    // Mock hazard detection - replace with real AI analysis
    const hazardsByRoom = {
        bathroom: [
            { type: 'slippery_surface', location: 'floor', severity: 'high', confidence: 0.85 },
            { type: 'missing_grab_bar', location: 'shower', severity: 'high', confidence: 0.92 },
            { type: 'poor_lighting', location: 'overall', severity: 'medium', confidence: 0.78 }
        ],
        bedroom: [
            { type: 'cluttered_pathway', location: 'floor', severity: 'medium', confidence: 0.81 },
            { type: 'loose_rug', location: 'bedside', severity: 'high', confidence: 0.88 },
            { type: 'inadequate_lighting', location: 'nightstand', severity: 'medium', confidence: 0.75 }
        ],
        kitchen: [
            { type: 'items_out_of_reach', location: 'upper_cabinets', severity: 'medium', confidence: 0.79 },
            { type: 'slippery_floor', location: 'sink_area', severity: 'medium', confidence: 0.76 },
            { type: 'sharp_corners', location: 'counter', severity: 'low', confidence: 0.72 }
        ],
        living_room: [
            { type: 'trip_hazard', location: 'cables', severity: 'medium', confidence: 0.84 },
            { type: 'unstable_furniture', location: 'coffee_table', severity: 'low', confidence: 0.71 },
            { type: 'poor_lighting', location: 'reading_area', severity: 'low', confidence: 0.73 }
        ],
        stairs: [
            { type: 'missing_handrail', location: 'left_side', severity: 'critical', confidence: 0.95 },
            { type: 'uneven_steps', location: 'middle', severity: 'high', confidence: 0.83 },
            { type: 'poor_visibility', location: 'bottom', severity: 'high', confidence: 0.87 }
        ]
    };

    return hazardsByRoom[roomType] || [];
}

function calculateRiskScore(hazards) {
    const severityScores = { critical: 10, high: 7, medium: 4, low: 2 };
    if (hazards.length === 0) return 1;
    
    const totalScore = hazards.reduce((sum, h) => 
        sum + (severityScores[h.severity] || 0) * h.confidence, 0
    );
    
    return Math.min(10, Math.round(totalScore / hazards.length));
}

function getRecommendations(hazards) {
    const recommendations = {
        slippery_surface: 'Install non-slip mats or apply anti-slip coating',
        missing_grab_bar: 'Install grab bars for support',
        poor_lighting: 'Add brighter LED lights or motion-activated lighting',
        cluttered_pathway: 'Clear walkways and organize items',
        loose_rug: 'Secure rug with non-slip backing or remove',
        inadequate_lighting: 'Add nightlights or bedside lamps',
        missing_handrail: 'Install sturdy handrails on both sides',
        uneven_steps: 'Mark step edges with high-contrast tape',
        items_out_of_reach: 'Reorganize frequently used items to lower shelves',
        trip_hazard: 'Secure cables with cord covers or reroute',
        unstable_furniture: 'Secure or replace unstable furniture',
        sharp_corners: 'Add corner guards or padding'
    };

    return hazards.map(h => ({
        hazard: h.type,
        recommendation: recommendations[h.type] || 'Consult with PT/OT for specific recommendations',
        priority: h.severity
    }));
}

function getDemoProviders() {
    return [
        {
            id: 1,
            first_name: 'Sarah',
            last_name: 'Johnson',
            provider_type: 'pt',
            license_number: 'PT12345',
            specialties: '["Geriatric Physical Therapy", "Fall Prevention", "Home Safety"]'
        },
        {
            id: 2,
            first_name: 'Michael', 
            last_name: 'Chen',
            provider_type: 'ot',
            license_number: 'OT67890',
            specialties: '["Home Modifications", "Adaptive Equipment", "Cognitive Assessment"]'
        },
        {
            id: 3,
            first_name: 'Dr. Emily',
            last_name: 'Rodriguez',
            provider_type: 'physician', 
            license_number: 'MD11111',
            specialties: '["Geriatric Medicine", "Fall Risk Assessment", "Medication Management"]'
        }
    ];
}

// Serve static files for the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SafeAging backend server running on http://localhost:${PORT}`);
    console.log(`📊 Database: healthcare.db`);
    console.log(`🔑 Test accounts:`);
    console.log(`   Patient: patient@test.com / test123`);
    console.log(`   Provider: provider@test.com / test123`);
    console.log(`   Caregiver: caregiver@test.com / test123`);
});

export default app;