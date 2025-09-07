#!/usr/bin/env node

/**
 * SafeAging Security Analysis Tool
 * Comprehensive security audit for HIPAA compliance and app store requirements
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAnalyzer {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.hipaaCompliance = {
      encryption: false,
      auditLogging: false,
      accessControls: false,
      dataRetention: false,
      integrityControls: false
    };
  }

  analyzeFile(filePath, content) {
    // Check for hardcoded secrets
    this.checkHardcodedSecrets(filePath, content);
    
    // Check for SQL injection vulnerabilities
    this.checkSQLInjection(filePath, content);
    
    // Check for XSS vulnerabilities
    this.checkXSS(filePath, content);
    
    // Check for insecure random number generation
    this.checkInsecureRandom(filePath, content);
    
    // Check for missing input validation
    this.checkInputValidation(filePath, content);
    
    // Check for HIPAA compliance issues
    this.checkHIPAACompliance(filePath, content);
    
    // Check for insecure data transmission
    this.checkInsecureTransmission(filePath, content);
    
    // Check for missing rate limiting
    this.checkRateLimiting(filePath, content);
  }

  checkHardcodedSecrets(file, content) {
    const patterns = [
      /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
      /secret\s*[:=]\s*["'][^"']+["']/gi,
      /password\s*[:=]\s*["'][^"']+["']/gi,
      /token\s*[:=]\s*["'][^"']+["']/gi,
      /private[_-]?key\s*[:=]\s*["'][^"']+["']/gi
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Skip test credentials
          if (!match.includes('test') && !match.includes('demo') && !match.includes('example')) {
            this.issues.critical.push({
              file,
              type: 'Hardcoded Secret',
              line: this.getLineNumber(content, match),
              code: match,
              recommendation: 'Move to environment variables or secure vault'
            });
          }
        });
      }
    });
  }

  checkSQLInjection(file, content) {
    const vulnerablePatterns = [
      /query\s*\(\s*['"`].*?\$\{.*?\}.*?['"`]\s*\)/g,
      /query\s*\(\s*['"`].*?\+.*?['"`]\s*\)/g,
      /exec\s*\(\s*['"`].*?\$\{.*?\}.*?['"`]\s*\)/g
    ];

    vulnerablePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.issues.critical.push({
            file,
            type: 'SQL Injection Risk',
            line: this.getLineNumber(content, match),
            code: match,
            recommendation: 'Use parameterized queries or prepared statements'
          });
        });
      }
    });
  }

  checkXSS(file, content) {
    const xssPatterns = [
      /innerHTML\s*=\s*[^'"`]/g,
      /document\.write\s*\(/g,
      /eval\s*\(/g,
      /setTimeout\s*\(\s*['"`]/g,
      /setInterval\s*\(\s*['"`]/g
    ];

    xssPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.issues.high.push({
            file,
            type: 'XSS Vulnerability',
            line: this.getLineNumber(content, match),
            code: match,
            recommendation: 'Sanitize user input and use textContent instead of innerHTML'
          });
        });
      }
    });
  }

  checkInsecureRandom(file, content) {
    if (content.includes('Math.random()') && 
        (content.includes('token') || content.includes('session') || content.includes('password'))) {
      this.issues.high.push({
        file,
        type: 'Insecure Random Generation',
        line: this.getLineNumber(content, 'Math.random()'),
        code: 'Math.random() used for security-sensitive operations',
        recommendation: 'Use crypto.randomBytes() for cryptographic operations'
      });
    }
  }

  checkInputValidation(file, content) {
    const routePatterns = [
      /app\.(get|post|put|delete|patch)\s*\([^)]+\)/g
    ];

    routePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Check if route has validation
          const routeBlock = this.getRouteBlock(content, match);
          if (!routeBlock.includes('validate') && !routeBlock.includes('sanitize')) {
            this.issues.medium.push({
              file,
              type: 'Missing Input Validation',
              line: this.getLineNumber(content, match),
              code: match,
              recommendation: 'Add input validation middleware'
            });
          }
        });
      }
    });
  }

  checkHIPAACompliance(file, content) {
    // Check for audit logging
    if (content.includes('INSERT INTO') || content.includes('UPDATE') || content.includes('DELETE')) {
      if (!content.includes('audit_log') && !content.includes('activity_log')) {
        this.issues.critical.push({
          file,
          type: 'HIPAA: Missing Audit Logging',
          line: 'Multiple',
          code: 'Database operations without audit trail',
          recommendation: 'Implement comprehensive audit logging for all PHI access'
        });
      }
    }

    // Check for encryption at rest
    if (content.includes('createWriteStream') || content.includes('writeFile')) {
      if (!content.includes('crypto') && !content.includes('encrypt')) {
        this.issues.high.push({
          file,
          type: 'HIPAA: Unencrypted Data at Rest',
          line: this.getLineNumber(content, 'writeFile'),
          code: 'File operations without encryption',
          recommendation: 'Encrypt all PHI before storage'
        });
      }
    }

    // Check for data retention policies
    if (!content.includes('retention') && !content.includes('purge') && !content.includes('archive')) {
      if (file.includes('server') || file.includes('database')) {
        this.issues.medium.push({
          file,
          type: 'HIPAA: No Data Retention Policy',
          line: 'N/A',
          code: 'Missing data retention implementation',
          recommendation: 'Implement data retention and purging policies'
        });
      }
    }
  }

  checkInsecureTransmission(file, content) {
    if (content.includes('http://') && !content.includes('localhost')) {
      this.issues.high.push({
        file,
        type: 'Insecure Data Transmission',
        line: this.getLineNumber(content, 'http://'),
        code: 'HTTP used instead of HTTPS',
        recommendation: 'Use HTTPS for all external communications'
      });
    }
  }

  checkRateLimiting(file, content) {
    if (content.includes('app.post') && !content.includes('rateLimit')) {
      this.issues.medium.push({
        file,
        type: 'Missing Rate Limiting',
        line: this.getLineNumber(content, 'app.post'),
        code: 'API endpoints without rate limiting',
        recommendation: 'Implement rate limiting to prevent abuse'
      });
    }
  }

  getLineNumber(content, searchStr) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchStr)) {
        return i + 1;
      }
    }
    return 'Unknown';
  }

  getRouteBlock(content, routeMatch) {
    const startIdx = content.indexOf(routeMatch);
    let braceCount = 0;
    let inBlock = false;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inBlock = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0 && inBlock) {
          endIdx = i;
          break;
        }
      }
    }

    return content.substring(startIdx, endIdx + 1);
  }

  analyzeDirectory(dir) {
    const files = this.getAllFiles(dir);
    
    files.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(file, 'utf8');
        this.analyzeFile(file, content);
      }
    });
  }

  getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git')) {
          this.getAllFiles(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  generateReport() {
    const report = {
      summary: {
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        total: this.issues.critical.length + this.issues.high.length + 
               this.issues.medium.length + this.issues.low.length
      },
      hipaaCompliance: this.hipaaCompliance,
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    return {
      immediate: [
        'Implement comprehensive audit logging for all PHI access',
        'Add encryption for data at rest and in transit',
        'Replace hardcoded credentials with environment variables',
        'Implement input validation on all API endpoints',
        'Add rate limiting to prevent API abuse'
      ],
      shortTerm: [
        'Implement automated security testing in CI/CD pipeline',
        'Add SAST (Static Application Security Testing) tools',
        'Configure CSP (Content Security Policy) headers',
        'Implement session timeout and secure cookie flags',
        'Add intrusion detection and monitoring'
      ],
      longTerm: [
        'Obtain HIPAA compliance certification',
        'Implement zero-trust architecture',
        'Add end-to-end encryption for all communications',
        'Implement comprehensive disaster recovery plan',
        'Regular third-party security audits'
      ]
    };
  }
}

// Run the analysis
const analyzer = new SecurityAnalyzer();
console.log('Starting security analysis...');

// Analyze source files
analyzer.analyzeDirectory('./src');
analyzer.analyzeDirectory('./public');

// Check server file specifically
if (fs.existsSync('./server.js')) {
  const serverContent = fs.readFileSync('./server.js', 'utf8');
  analyzer.analyzeFile('./server.js', serverContent);
}

// Generate and save report
const report = analyzer.generateReport();
fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));

console.log('\n=== SECURITY ANALYSIS REPORT ===\n');
console.log(`Critical Issues: ${report.summary.critical}`);
console.log(`High Issues: ${report.summary.high}`);
console.log(`Medium Issues: ${report.summary.medium}`);
console.log(`Low Issues: ${report.summary.low}`);
console.log(`Total Issues: ${report.summary.total}`);

if (report.summary.critical > 0) {
  console.log('\n⚠️  CRITICAL SECURITY ISSUES FOUND:');
  report.issues.critical.forEach(issue => {
    console.log(`\n  File: ${issue.file}`);
    console.log(`  Type: ${issue.type}`);
    console.log(`  Line: ${issue.line}`);
    console.log(`  Recommendation: ${issue.recommendation}`);
  });
}

console.log('\n✅ Security analysis complete. Report saved to security-report.json');