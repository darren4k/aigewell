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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Database setup
const db = new Database('healthcare.db');

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
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: { error: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(limiter);
app.use(mongoSanitize());
app.use(xss());
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

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
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

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
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

// Analyze room photo
app.post('/api/analyze-room', authenticateToken, upload.single('image'), (req, res) => {
    const { roomType } = req.body;
    const userId = req.user.userId;

    if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
    }

    try {
        // Mock AI analysis (replace with real AI service)
        const hazards = analyzeRoomHazards(roomType);
        const riskScore = calculateRiskScore(hazards);
        const recommendations = getRecommendations(hazards);

        // Store assessment in database
        const result = db.prepare(`
            INSERT INTO assessments (
                user_id, room_type, image_url, hazards_detected, 
                risk_score, ai_analysis, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'analyzed', datetime('now'), datetime('now'))
        `).run(
            userId,
            roomType,
            req.file.path,
            JSON.stringify(hazards),
            riskScore,
            JSON.stringify({ hazards, recommendations })
        );

        res.json({
            assessmentId: result.lastInsertRowid,
            roomType,
            hazards,
            riskScore,
            recommendations,
            imageUrl: req.file.path
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
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

// Book appointment
app.post('/api/appointments', authenticateToken, (req, res) => {
    const { providerId, scheduledAt, type, duration = 60, notes } = req.body;
    const userId = req.user.userId;

    try {
        const result = db.prepare(`
            INSERT INTO appointments (
                user_id, provider_id, scheduled_at, duration_minutes,
                type, status, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'scheduled', ?, datetime('now'), datetime('now'))
        `).run(userId, providerId, scheduledAt, duration, type, notes);

        res.json({ 
            success: true, 
            appointmentId: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('Appointment booking error:', error);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// Get user appointments
app.get('/api/appointments/:userId', authenticateToken, (req, res) => {
    const userId = req.params.userId;

    try {
        const appointments = db.prepare(`
            SELECT * FROM appointments 
            WHERE user_id = ? 
            ORDER BY scheduled_at ASC
        `).all(userId);

        res.json({ appointments });
    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Get providers
app.get('/api/providers', (req, res) => {
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