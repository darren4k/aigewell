// Database setup script for local development
// Run with: node setup-database.js

import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

async function setupDatabase() {
    // Create database connection
    const db = new Database('healthcare.db');

    // Read schema file
    const schema = fs.readFileSync('schema.sql', 'utf8');

    // Split schema into individual statements
    const statements = schema.split(';').filter(statement => statement.trim());

    console.log('Setting up SafeAging healthcare database...');
    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    statements.forEach((statement, index) => {
        const trimmed = statement.trim();
        if (trimmed) {
            try {
                db.exec(trimmed);
                console.log(`✓ Statement ${index + 1} executed successfully`);
            } catch (error) {
                console.error(`✗ Error executing statement ${index + 1}:`, error.message);
                console.error(`Statement: ${trimmed.substring(0, 100)}...`);
            }
        }
    });

    // Verify tables were created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\nDatabase tables created:');
    tables.forEach(table => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        console.log(`  - ${table.name}: ${count.count} records`);
    });

    // Create a test user for development
    try {
        const hashedPassword = await bcrypt.hash('test123', 10);
    
    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (
            email, password_hash, first_name, last_name, 
            role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);
    
    // Test patient
    insertUser.run('patient@test.com', hashedPassword, 'Test', 'Patient', 'patient');
    console.log('\n✓ Test patient created: patient@test.com / test123');
    
    // Test caregiver
    insertUser.run('caregiver@test.com', hashedPassword, 'Test', 'Caregiver', 'caregiver');
    console.log('✓ Test caregiver created: caregiver@test.com / test123');
    
    // Test provider
    const insertProvider = db.prepare(`
        INSERT OR IGNORE INTO users (
            email, password_hash, first_name, last_name, 
            role, provider_type, license_number, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);
    insertProvider.run('provider@test.com', hashedPassword, 'Test', 'Provider', 'provider', 'pt', 'PT123456');
    console.log('✓ Test provider created: provider@test.com / test123');
    
    } catch (error) {
        console.error('Error creating test users:', error.message);
    }

    db.close();
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nTo test the authentication system:');
    console.log('1. Start your development server');
    console.log('2. Visit http://localhost:8787');
    console.log('3. Use any of the test accounts created above');
}

// Run the setup
setupDatabase().catch(console.error);