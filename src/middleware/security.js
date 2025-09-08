/**
 * Custom Security Middleware for SafeAging Healthcare Application
 * Provides XSS protection and input sanitization compatible with current Node.js
 */

/**
 * Custom XSS protection middleware
 * Sanitizes request body, query, and params for potential XSS attacks
 */
export function xssProtection(req, res, next) {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query parameters (Express 5.x compatible)
        if (req.query && typeof req.query === 'object') {
            const sanitizedQuery = sanitizeObject(req.query);
            // Only modify if sanitization changed anything
            if (JSON.stringify(sanitizedQuery) !== JSON.stringify(req.query)) {
                Object.keys(req.query).forEach(key => delete req.query[key]);
                Object.assign(req.query, sanitizedQuery);
            }
        }

        // Sanitize URL parameters (Express 5.x compatible)  
        if (req.params && typeof req.params === 'object') {
            const sanitizedParams = sanitizeObject(req.params);
            // Only modify if sanitization changed anything
            if (JSON.stringify(sanitizedParams) !== JSON.stringify(req.params)) {
                Object.keys(req.params).forEach(key => delete req.params[key]);
                Object.assign(req.params, sanitizedParams);
            }
        }

        next();
    } catch (error) {
        console.error('XSS protection error:', error);
        next(); // Continue even if sanitization fails
    }
}

/**
 * Custom NoSQL injection protection middleware
 * For SQLite applications, focuses on preventing SQL injection patterns
 */
export function sqlInjectionProtection(req, res, next) {
    try {
        // Check for common SQL injection patterns
        const sqlInjectionPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            /('|(\\')|(;)|(\\;)|(--)|(\|)|(%7C))/gi,
            /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(%3B)|(;))/gi,
            /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi
        ];

        const checkForSQLInjection = (obj) => {
            if (typeof obj === 'string') {
                for (const pattern of sqlInjectionPatterns) {
                    if (pattern.test(obj)) {
                        console.warn('Potential SQL injection attempt detected:', obj.substring(0, 100));
                        return '[FILTERED]';
                    }
                }
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(checkForSQLInjection);
            }
            
            if (obj && typeof obj === 'object') {
                const sanitized = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        sanitized[key] = checkForSQLInjection(obj[key]);
                    }
                }
                return sanitized;
            }
            
            return obj;
        };

        // Sanitize request body
        if (req.body) {
            req.body = checkForSQLInjection(req.body);
        }

        // Sanitize query parameters (Express 5.x compatible)
        if (req.query) {
            const sanitizedQuery = checkForSQLInjection(req.query);
            if (JSON.stringify(sanitizedQuery) !== JSON.stringify(req.query)) {
                Object.keys(req.query).forEach(key => delete req.query[key]);
                Object.assign(req.query, sanitizedQuery);
            }
        }

        next();
    } catch (error) {
        console.error('SQL injection protection error:', error);
        next(); // Continue even if sanitization fails
    }
}

/**
 * HIPAA-compliant request sanitization
 * Removes or masks potential PHI (Protected Health Information) from logs
 */
export function hipaaProtection(req, res, next) {
    try {
        // Define PHI patterns (common formats)
        const phiPatterns = [
            /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN
            /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email (in some contexts)
        ];

        // Sanitize sensitive data for logging purposes
        const sanitizeForLogging = (data) => {
            if (typeof data === 'string') {
                let sanitized = data;
                phiPatterns.forEach(pattern => {
                    sanitized = sanitized.replace(pattern, '[REDACTED]');
                });
                return sanitized;
            }
            return data;
        };

        // Add a method to get sanitized request for logging
        req.sanitizedForLogging = {
            method: req.method,
            url: req.url,
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type']
                // Exclude Authorization and other sensitive headers
            },
            body: sanitizeForLogging(JSON.stringify(req.body || {})),
            query: sanitizeForLogging(JSON.stringify(req.query || {}))
        };

        next();
    } catch (error) {
        console.error('HIPAA protection error:', error);
        next(); // Continue even if sanitization fails
    }
}

/**
 * Helper function to sanitize objects recursively
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    
    return obj;
}

/**
 * Helper function to sanitize individual strings
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    // Basic XSS prevention - escape dangerous characters
    return str
        .replace(/[<>]/g, (match) => {
            return match === '<' ? '&lt;' : '&gt;';
        })
        .replace(/["']/g, (match) => {
            return match === '"' ? '&quot;' : '&#x27;';
        })
        .replace(/javascript:/gi, 'javascript-blocked:')
        .replace(/on\w+\s*=/gi, 'on-event-blocked=');
}

/**
 * Rate limiting helper for sensitive operations
 */
export function createSensitiveOperationLimiter(windowMs = 15 * 60 * 1000, max = 5) {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        
        // Clean old entries
        for (const [clientKey, data] of attempts) {
            if (now - data.firstAttempt > windowMs) {
                attempts.delete(clientKey);
            }
        }
        
        // Check current client
        const clientData = attempts.get(key);
        if (!clientData) {
            attempts.set(key, { count: 1, firstAttempt: now });
            next();
        } else if (clientData.count >= max) {
            res.status(429).json({ 
                error: 'Too many sensitive operation attempts. Please try again later.',
                retryAfter: Math.ceil((clientData.firstAttempt + windowMs - now) / 1000)
            });
        } else {
            clientData.count++;
            next();
        }
    };
}

export default {
    xssProtection,
    sqlInjectionProtection,
    hipaaProtection,
    createSensitiveOperationLimiter
};