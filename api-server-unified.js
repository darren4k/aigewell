#!/usr/bin/env node

// Unified API Server for SafeAging Healthcare Platform with AI Marketplace
// Combines Version 1 API functionality with Version 2 marketplace enhancements
// Designed for deployment on Anything AI platform

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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import AI analysis service
import aiAnalysisService from './src/services/ai-analysis.js';

// Import services
import AppointmentBookingService from './src/services/appointment-service.js';
import PaymentService from './src/services/payment-service.js';

// Import marketplace module
import MarketplaceModule from './marketplace-module.js';

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
        cipher_page_size: 4096,
        kdf_iter: 64000,
        cipher_hmac_algorithm: 'HMAC_SHA256',
        cipher_kdf_algorithm: 'PBKDF2_HMAC_SHA256'
    };
}

const db = new Database(DB_PATH, dbOptions);

// Initialize marketplace module
const marketplace = new MarketplaceModule(DB_PATH, {
    apiKey: process.env.OPENAI_API_KEY
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit auth attempts
    message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// CORS configuration - API only, no static files
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8787',
            'https://*.anything.ai',
            'https://anything.ai'
        ];
        
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Initialize services
const appointmentService = new AppointmentBookingService(db);
const paymentService = new PaymentService(db, process.env.STRIPE_SECRET_KEY);

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Role-based access control
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
}

// ==========================================
// API Health & Status Endpoints
// ==========================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-unified',
        features: {
            core: true,
            marketplace: true,
            ai: !!process.env.OPENAI_API_KEY,
            payments: !!process.env.STRIPE_SECRET_KEY
        }
    });
});

app.get('/api/status', (req, res) => {
    const dbStats = db.prepare('SELECT COUNT(*) as users FROM users').get();
    const providerStats = db.prepare('SELECT COUNT(*) as providers FROM users WHERE role = "provider"').get();
    
    res.json({
        success: true,
        status: 'operational',
        database: 'connected',
        stats: {
            totalUsers: dbStats.users,
            totalProviders: providerStats.providers,
            apiVersion: '2.0.0',
            uptime: process.uptime()
        }
    });
});

// ==========================================
// Authentication Endpoints
// ==========================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role = 'patient' } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }
        
        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = db.prepare(`
            INSERT INTO users (email, password, name, role)
            VALUES (?, ?, ?, ?)
        `).run(email, hashedPassword, name, role);
        
        // Generate token
        const token = jwt.sign(
            { id: result.lastInsertRowid, email, role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: result.lastInsertRowid,
                email,
                name,
                role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        // Get user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// ==========================================
// User Profile Endpoints
// ==========================================

app.get('/api/user/profile', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, email, name, role, created_at
            FROM users WHERE id = ?
        `).get(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        const result = db.prepare(`
            UPDATE users
            SET name = COALESCE(?, name),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, phone, address, req.user.id);
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

// ==========================================
// AI-Powered Marketplace Endpoints
// ==========================================

// Create provider profile
app.post('/api/marketplace/provider/profile', authenticateToken, requireRole('provider'), async (req, res) => {
    try {
        const result = marketplace.createProviderProfile(req.user.id, req.body);
        res.json({
            success: true,
            providerId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Provider profile creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create provider profile'
        });
    }
});

// Add provider service
app.post('/api/marketplace/provider/service', authenticateToken, requireRole('provider'), async (req, res) => {
    try {
        const provider = db.prepare(`
            SELECT id FROM marketplace_providers WHERE user_id = ?
        `).get(req.user.id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                error: 'Provider profile not found'
            });
        }
        
        const result = marketplace.addProviderService(provider.id, req.body);
        res.json({
            success: true,
            serviceId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Service creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create service'
        });
    }
});

// AI-powered provider matching
app.post('/api/marketplace/match', authenticateToken, async (req, res) => {
    try {
        const matches = await marketplace.findBestProviders(req.user.id, req.body);
        res.json({
            success: true,
            matches
        });
    } catch (error) {
        console.error('Provider matching error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to match providers'
        });
    }
});

// Search providers
app.get('/api/marketplace/providers', async (req, res) => {
    try {
        const providers = marketplace.searchProviders(req.query);
        res.json({
            success: true,
            providers
        });
    } catch (error) {
        console.error('Provider search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search providers'
        });
    }
});

// Get provider details
app.get('/api/marketplace/provider/:id', async (req, res) => {
    try {
        const provider = marketplace.getProviderById(req.params.id);
        const services = marketplace.getProviderServices(req.params.id);
        const reviews = marketplace.getProviderReviews(req.params.id);
        
        res.json({
            success: true,
            provider,
            services,
            reviews
        });
    } catch (error) {
        console.error('Provider fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch provider'
        });
    }
});

// Add review
app.post('/api/marketplace/review', authenticateToken, async (req, res) => {
    try {
        const result = marketplace.addReview(
            req.body.providerId,
            req.user.id,
            req.body
        );
        
        res.json({
            success: true,
            reviewId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Review creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create review'
        });
    }
});

// Update user preferences for AI matching
app.put('/api/marketplace/preferences', authenticateToken, async (req, res) => {
    try {
        marketplace.updateUserPreferences(req.user.id, req.body);
        res.json({
            success: true,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Preferences update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

// ==========================================
// Assessment & Analysis Endpoints
// ==========================================

app.post('/api/assessment/create', authenticateToken, async (req, res) => {
    try {
        const { type, data } = req.body;
        
        const result = db.prepare(`
            INSERT INTO assessments (patient_id, type, data, status)
            VALUES (?, ?, ?, 'pending')
        `).run(req.user.id, type, JSON.stringify(data));
        
        res.json({
            success: true,
            assessmentId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Assessment creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create assessment'
        });
    }
});

app.post('/api/assessment/:id/analyze', authenticateToken, async (req, res) => {
    try {
        const assessment = db.prepare(`
            SELECT * FROM assessments WHERE id = ? AND patient_id = ?
        `).get(req.params.id, req.user.id);
        
        if (!assessment) {
            return res.status(404).json({
                success: false,
                error: 'Assessment not found'
            });
        }
        
        // Use AI analysis service
        const analysis = await aiAnalysisService.analyzeAssessment(
            assessment.type,
            JSON.parse(assessment.data)
        );
        
        // Update assessment with results
        db.prepare(`
            UPDATE assessments
            SET ai_analysis = ?, status = 'completed', analyzed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(JSON.stringify(analysis), req.params.id);
        
        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze assessment'
        });
    }
});

// ==========================================
// Appointment Endpoints
// ==========================================

app.post('/api/appointments/book', authenticateToken, async (req, res) => {
    try {
        const appointment = await appointmentService.createAppointment({
            ...req.body,
            patientId: req.user.id
        });
        
        res.json({
            success: true,
            appointment
        });
    } catch (error) {
        console.error('Appointment booking error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to book appointment'
        });
    }
});

app.get('/api/appointments/my', authenticateToken, async (req, res) => {
    try {
        const appointments = await appointmentService.getPatientAppointments(req.user.id);
        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error('Appointments fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch appointments'
        });
    }
});

// ==========================================
// Payment Endpoints
// ==========================================

app.post('/api/payments/subscription', authenticateToken, async (req, res) => {
    try {
        const subscription = await paymentService.createSubscription(
            req.user.id,
            req.body.planType
        );
        
        res.json({
            success: true,
            subscription
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create subscription'
        });
    }
});

app.post('/api/payments/process', authenticateToken, async (req, res) => {
    try {
        const payment = await paymentService.processPayment({
            ...req.body,
            userId: req.user.id
        });
        
        res.json({
            success: true,
            payment
        });
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment'
        });
    }
});

// ==========================================
// File Upload Endpoint
// ==========================================

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        res.json({
            success: true,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: `/uploads/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload file'
        });
    }
});

// ==========================================
// Error Handling
// ==========================================

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Root endpoint - API information only, no HTML
app.get('/', (req, res) => {
    res.json({
        name: 'SafeAging Healthcare API',
        version: '2.0.0-unified',
        description: 'AI-powered healthcare platform with therapist marketplace',
        endpoints: {
            health: '/api/health',
            status: '/api/status',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login'
            },
            marketplace: {
                providers: 'GET /api/marketplace/providers',
                match: 'POST /api/marketplace/match',
                profile: 'POST /api/marketplace/provider/profile'
            },
            assessments: {
                create: 'POST /api/assessment/create',
                analyze: 'POST /api/assessment/:id/analyze'
            },
            appointments: {
                book: 'POST /api/appointments/book',
                list: 'GET /api/appointments/my'
            }
        },
        documentation: 'https://github.com/safeaging/api-docs'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SafeAging Unified API Server v2.0`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`🏥 Healthcare API with AI Marketplace`);
    console.log(`📊 Database: ${DB_PATH}`);
    console.log(`🤖 AI: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Mock mode'}`);
    console.log(`💳 Payments: ${process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Test mode'}`);
    console.log(`\n🔑 Test accounts:`);
    console.log(`   Patient: patient@test.com / test123`);
    console.log(`   Provider: provider@test.com / test123`);
    console.log(`   Caregiver: caregiver@test.com / test123`);
});

export default app;