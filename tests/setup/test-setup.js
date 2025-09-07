/**
 * Test Setup Configuration
 * Global test setup for Mocha tests
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster bcrypt for tests

// Disable console logging during tests unless DEBUG is set
if (!process.env.DEBUG) {
    console.log = function() {};
    console.info = function() {};
    console.warn = function() {};
}

// Global test timeout
export const mochaHooks = {
    beforeAll() {
        // Global setup before all tests
        console.error('🧪 Starting SafeAging Test Suite');
        
        // Ensure test directories exist
        const testDirs = [
            path.join(__dirname, '..', 'fixtures'),
            path.join(__dirname, '..', 'fixtures', 'images'),
            path.join(__dirname, '..', 'temp')
        ];
        
        testDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    },
    
    afterAll() {
        // Global cleanup after all tests
        console.error('✅ SafeAging Test Suite Complete');
        
        // Clean up test database files
        const testFiles = [
            path.join(__dirname, '..', '..', 'test_healthcare.db'),
            path.join(__dirname, '..', '..', 'test_healthcare.db-shm'),
            path.join(__dirname, '..', '..', 'test_healthcare.db-wal')
        ];
        
        testFiles.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        });
        
        // Clean up test temp files
        const tempDir = path.join(__dirname, '..', 'temp');
        if (fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
};