-- SafeAging Healthcare Database Schema
-- Complete schema for authentication, assessments, appointments, and healthcare workflows

-- Audit logs table for HIPAA compliance
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    request_id TEXT,
    result TEXT DEFAULT 'success',
    metadata TEXT, -- JSON for additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table with healthcare roles
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'provider')) DEFAULT 'patient',
    provider_type TEXT CHECK (provider_type IN ('pt', 'ot', 'physician', 'nurse')),
    license_number TEXT,
    specialties TEXT, -- JSON array of specialties
    stripe_customer_id TEXT, -- Stripe customer ID for payment processing
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Caregiver relationships
DROP TABLE IF EXISTS caregiver_relationships;
CREATE TABLE caregiver_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    caregiver_id INTEGER NOT NULL,
    relationship TEXT NOT NULL, -- spouse, child, friend, professional
    permissions TEXT, -- JSON object with permissions
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (caregiver_id) REFERENCES users(id),
    UNIQUE(patient_id, caregiver_id)
);

-- Room assessments
DROP TABLE IF EXISTS assessments;
CREATE TABLE assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_type TEXT NOT NULL,
    image_url TEXT,
    hazards_detected TEXT, -- JSON array of hazards
    risk_score INTEGER NOT NULL DEFAULT 0,
    ai_analysis TEXT, -- JSON object with full analysis
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'reviewed', 'approved')),
    assessment_type TEXT DEFAULT 'room_safety' CHECK (assessment_type IN ('room_safety', 'clinical', 'standardized')),
    assessment_data TEXT, -- JSON object with assessment responses
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Clinical assessments (Home FAST, Berg Balance, etc.)
DROP TABLE IF EXISTS clinical_assessments;
CREATE TABLE clinical_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assessment_type TEXT NOT NULL, -- 'home_fast', 'berg_balance', 'tug', 'cdc_steadi'
    responses TEXT NOT NULL, -- JSON object with all responses
    scores TEXT, -- JSON object with calculated scores
    risk_level TEXT, -- low, moderate, high, critical
    recommendations TEXT, -- JSON array of recommendations
    provider_notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'reviewed')),
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER, -- provider user ID
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Safety plans generated from assessments
DROP TABLE IF EXISTS safety_plans;
CREATE TABLE safety_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phase INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tasks TEXT NOT NULL, -- JSON array of tasks
    progress INTEGER DEFAULT 0, -- percentage complete
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    target_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- PT/OT appointments
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider_id INTEGER, -- provider user ID
    assessment_id INTEGER,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    type TEXT DEFAULT 'video' CHECK (type IN ('video', 'phone', 'in_person')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    meeting_link TEXT,
    reminder_sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES users(id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

-- Equipment recommendations and purchases
DROP TABLE IF EXISTS equipment;
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    vendor TEXT,
    product_url TEXT,
    image_url TEXT,
    safety_rating TEXT, -- 'excellent', 'good', 'fair'
    medicare_covered BOOLEAN DEFAULT 0,
    cpt_codes TEXT, -- JSON array of applicable CPT codes
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User equipment recommendations and cart
DROP TABLE IF EXISTS user_equipment;
CREATE TABLE user_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    assessment_id INTEGER, -- which assessment generated this recommendation
    status TEXT DEFAULT 'recommended' CHECK (status IN ('recommended', 'in_cart', 'ordered', 'delivered', 'installed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    ordered_at DATETIME,
    delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

-- Alerts and notifications
DROP TABLE IF EXISTS alerts;
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'assessment', 'appointment', 'safety', 'equipment'
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Provider availability schedules
DROP TABLE IF EXISTS provider_schedules;
CREATE TABLE provider_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT 1,
    break_start_time TIME,
    break_end_time TIME,
    max_appointments INTEGER DEFAULT 8,
    -- Additional columns for appointment service compatibility
    available_days TEXT, -- JSON array of available days
    slot_duration INTEGER DEFAULT 30, -- Duration in minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Equipment catalog seed data
INSERT INTO equipment (name, category, description, price, vendor, safety_rating, medicare_covered, cpt_codes) VALUES
('Adjustable Grab Bar Set', 'grab_bar', 'Professional-grade suction cup grab bars for bathroom safety', 49.99, 'SafetyFirst Medical', 'excellent', 1, '["E0241", "E0242"]'),
('Motion Sensor Night Lights (4-pack)', 'lighting', 'Automatic LED lights for hallways and bathrooms with adjustable sensitivity', 29.99, 'HomeSafe Solutions', 'excellent', 0, '[]'),
('Medical Alert System with Fall Detection', 'medical_alert', '24/7 monitoring with automatic fall detection and GPS tracking', 39.99, 'LifeAlert Pro', 'excellent', 1, '["A9279"]'),
('Non-Slip Bath Mat - Extra Long', 'bathroom', 'Medical-grade anti-slip mat with drainage holes and suction cups', 24.99, 'AquaSafe', 'good', 1, '["E0241"]'),
('Raised Toilet Seat with Handles', 'bathroom', 'Ergonomic raised seat with padded armrests for easier transfers', 79.99, 'ComfortCare Medical', 'excellent', 1, '["E0244"]'),
('Bedside Commode Chair', 'mobility', 'Heavy-duty commode with padded seat and splash guard', 89.99, 'MedEquip Plus', 'excellent', 1, '["E0163"]'),
('Shower Chair with Back Support', 'bathroom', 'Adjustable height shower chair with backrest and armrests', 64.99, 'BathSafe Medical', 'excellent', 1, '["E0245"]'),
('LED Motion Sensor Toilet Light', 'lighting', 'Soft nightlight that activates automatically for nighttime bathroom visits', 19.99, 'NightGuide', 'good', 0, '[]'),
('Reacher/Grabber Tool - 32 inch', 'mobility', 'Lightweight reacher with rotating jaw and magnetic tip', 19.99, 'EasyReach', 'good', 1, '["E0190"]'),
('Bed Rail Safety Handle', 'bedroom', 'Adjustable bed rail that provides support getting in and out of bed', 59.99, 'StableSupport', 'excellent', 1, '["E0305"]');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);
CREATE INDEX idx_clinical_assessments_user_id ON clinical_assessments(user_id);
CREATE INDEX idx_clinical_assessments_type ON clinical_assessments(assessment_type);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_caregiver_relationships_patient_id ON caregiver_relationships(patient_id);
CREATE INDEX idx_caregiver_relationships_caregiver_id ON caregiver_relationships(caregiver_id);

-- Payment subscriptions and billing
DROP TABLE IF EXISTS payment_subscriptions;
CREATE TABLE payment_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing')),
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    trial_end DATETIME,
    cancel_at_period_end BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payment transactions and history
DROP TABLE IF EXISTS payment_transactions;
CREATE TABLE payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    subscription_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
    payment_method TEXT, -- 'card', 'ach', 'bank_transfer'
    description TEXT,
    metadata TEXT, -- JSON for additional transaction details
    stripe_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    failure_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES payment_subscriptions(id)
);

-- Payment methods stored for users
DROP TABLE IF EXISTS payment_methods;
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'card', 'bank_account', 'ach_debit'
    brand TEXT, -- 'visa', 'mastercard', etc.
    last4 TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Billing addresses
DROP TABLE IF EXISTS billing_addresses;
CREATE TABLE billing_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'US',
    is_primary BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Equipment orders and fulfillment
DROP TABLE IF EXISTS equipment_orders;
CREATE TABLE equipment_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_id INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address TEXT, -- JSON object with address
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    tracking_number TEXT,
    shipping_carrier TEXT,
    estimated_delivery DATE,
    delivered_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id)
);

-- Order items
DROP TABLE IF EXISTS equipment_order_items;
CREATE TABLE equipment_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES equipment_orders(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- Create payment-related indexes
CREATE INDEX idx_payment_subscriptions_user_id ON payment_subscriptions(user_id);
CREATE INDEX idx_payment_subscriptions_status ON payment_subscriptions(status);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_equipment_orders_user_id ON equipment_orders(user_id);
CREATE INDEX idx_equipment_orders_status ON equipment_orders(status);