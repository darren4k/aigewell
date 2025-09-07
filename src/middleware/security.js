/**
 * HIPAA-Compliant Security Middleware
 * Implements comprehensive security measures for healthcare data protection
 */

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Audit logging for HIPAA compliance
class AuditLogger {
  constructor(db) {
    this.db = db;
  }

  async log(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      user_id: event.userId || 'anonymous',
      ip_address: event.ip,
      action: event.action,
      resource: event.resource,
      result: event.result,
      metadata: JSON.stringify(event.metadata || {}),
      user_agent: event.userAgent,
      session_id: event.sessionId
    };

    try {
      await this.db.prepare(`
        INSERT INTO audit_logs (
          timestamp, user_id, ip_address, action, resource, 
          result, metadata, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        auditEntry.timestamp,
        auditEntry.user_id,
        auditEntry.ip_address,
        auditEntry.action,
        auditEntry.resource,
        auditEntry.result,
        auditEntry.metadata,
        auditEntry.user_agent,
        auditEntry.session_id
      ).run();
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Critical: Audit logging failure should be monitored
      // In production, this should trigger an alert
    }
  }

  async logPHIAccess(userId, patientId, dataType, action, ip) {
    await this.log({
      userId,
      ip,
      action: `PHI_${action}`,
      resource: `patient/${patientId}/${dataType}`,
      result: 'success',
      metadata: {
        patient_id: patientId,
        data_type: dataType,
        compliance: 'HIPAA'
      }
    });
  }
}

// Encryption utility for data at rest
class EncryptionService {
  constructor(key) {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(key, 'hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Rate limiting configurations for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiters for different operations
export const rateLimiters = {
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests, please try again later'
  ),
  
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 auth attempts
    'Too many authentication attempts, please try again later'
  ),
  
  upload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 uploads per hour
    'Upload limit exceeded, please try again later'
  ),
  
  aiAnalysis: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    20, // limit each IP to 20 AI analysis requests per hour
    'AI analysis limit exceeded, please try again later'
  )
};

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input validation and sanitization middleware
export const inputSanitization = [
  mongoSanitize(), // Prevent NoSQL injection
  xss(), // Clean user input from malicious HTML
  hpp() // Prevent HTTP Parameter Pollution
];

// Session security middleware
export const sessionSecurity = (req, res, next) => {
  // Set secure session cookies
  if (req.session) {
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.httpOnly = true;
    req.session.cookie.sameSite = 'strict';
    
    // Session timeout for HIPAA compliance (15 minutes of inactivity)
    const timeoutMs = (process.env.SESSION_TIMEOUT_MINUTES || 15) * 60 * 1000;
    
    if (req.session.lastActivity) {
      const elapsed = Date.now() - req.session.lastActivity;
      if (elapsed > timeoutMs) {
        req.session.destroy();
        return res.status(401).json({ error: 'Session expired' });
      }
    }
    
    req.session.lastActivity = Date.now();
  }
  
  next();
};

// CORS configuration for production
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://safeaginghome.com',
      'https://app.safeaginghome.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Request logging middleware for audit trail
export const requestLogger = (auditLogger) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Log the request
    const logEntry = {
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      action: `${req.method} ${req.path}`,
      resource: req.originalUrl,
      userAgent: req.get('user-agent'),
      sessionId: req.sessionID
    };
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      res.send = originalSend;
      
      // Log the response
      logEntry.result = res.statusCode < 400 ? 'success' : 'failure';
      logEntry.metadata = {
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime
      };
      
      // Async logging (don't block response)
      auditLogger.log(logEntry).catch(console.error);
      
      return res.send(data);
    };
    
    next();
  };
};

// Data encryption middleware for PHI
export const encryptPHI = (encryptionService) => {
  return (req, res, next) => {
    // Encrypt sensitive fields in request body
    const sensitiveFields = ['ssn', 'medical_record_number', 'diagnosis', 'medications'];
    
    if (req.body) {
      sensitiveFields.forEach(field => {
        if (req.body[field]) {
          req.body[`${field}_encrypted`] = encryptionService.encrypt(req.body[field]);
          delete req.body[field]; // Remove unencrypted version
        }
      });
    }
    
    next();
  };
};

// Integrity checking middleware
export const integrityCheck = (req, res, next) => {
  // Verify request integrity using HMAC
  const signature = req.get('X-Signature');
  
  if (signature && process.env.INTEGRITY_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.INTEGRITY_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid request signature' });
    }
  }
  
  next();
};

// Emergency access override for healthcare providers
export const emergencyAccess = (auditLogger) => {
  return async (req, res, next) => {
    const emergencyCode = req.get('X-Emergency-Override');
    
    if (emergencyCode) {
      // Verify emergency code
      const isValid = await verifyEmergencyCode(emergencyCode);
      
      if (isValid) {
        // Log emergency access
        await auditLogger.log({
          userId: req.user?.id || 'emergency',
          ip: req.ip,
          action: 'EMERGENCY_ACCESS',
          resource: req.originalUrl,
          result: 'granted',
          metadata: {
            emergency_code: emergencyCode,
            reason: req.get('X-Emergency-Reason')
          }
        });
        
        req.emergencyAccess = true;
      }
    }
    
    next();
  };
};

// Verify emergency access code
async function verifyEmergencyCode(code) {
  // In production, this would verify against a secure emergency access system
  // For now, we'll use a placeholder
  return code === process.env.EMERGENCY_ACCESS_CODE;
}

// Export initialized services
export const initializeSecurity = (db) => {
  const auditLogger = new AuditLogger(db);
  const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
  );
  
  return {
    auditLogger,
    encryptionService,
    middleware: {
      requestLogger: requestLogger(auditLogger),
      encryptPHI: encryptPHI(encryptionService),
      sessionSecurity,
      integrityCheck,
      emergencyAccess: emergencyAccess(auditLogger)
    }
  };
};