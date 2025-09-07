-- Clinical Assessment System for PT/OT Providers
-- Based on HSSAT, Home FAST, CDC STEADI, Berg Balance, TUG

-- Standardized assessment templates
CREATE TABLE IF NOT EXISTS clinical_assessment_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    max_score INTEGER,
    min_score INTEGER DEFAULT 0,
    risk_thresholds TEXT, -- JSON with risk level cutoffs
    cpt_codes TEXT, -- JSON array of applicable CPT codes
    time_estimate INTEGER, -- minutes
    evidence_citations TEXT, -- JSON array of research citations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clinical evaluations (main record)
CREATE TABLE IF NOT EXISTS clinical_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    patient_dob DATE,
    assessor_name TEXT NOT NULL,
    assessor_license TEXT,
    evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    location TEXT,
    total_risk_score INTEGER DEFAULT 0,
    risk_category TEXT, -- low, moderate, high, critical
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Functional mobility test results
CREATE TABLE IF NOT EXISTS functional_mobility_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    result_value REAL,
    result_unit TEXT,
    risk_level TEXT, -- normal, at_risk, high_risk
    notes TEXT,
    FOREIGN KEY (evaluation_id) REFERENCES clinical_evaluations (id)
);

-- Home hazards checklist
CREATE TABLE IF NOT EXISTS home_hazards_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    room_type TEXT NOT NULL,
    hazard_item TEXT NOT NULL,
    is_present BOOLEAN NOT NULL, -- TRUE if hazard exists
    priority_level TEXT, -- critical, high, medium, low
    recommendation TEXT,
    cost_estimate REAL,
    FOREIGN KEY (evaluation_id) REFERENCES clinical_evaluations (id)
);

-- Environmental and assistive devices assessment
CREATE TABLE IF NOT EXISTS environmental_assessment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    device_category TEXT NOT NULL,
    device_name TEXT NOT NULL,
    status TEXT NOT NULL, -- safe, needs_modification, not_applicable
    recommendation TEXT,
    cpt_code TEXT,
    FOREIGN KEY (evaluation_id) REFERENCES clinical_evaluations (id)
);

-- Clinical recommendations generated from assessments
CREATE TABLE IF NOT EXISTS clinical_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    priority_level TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    rationale TEXT,
    timeframe TEXT, -- immediate, 1_week, 30_days, 90_days
    cost_estimate REAL,
    cpt_code TEXT,
    evidence_citation TEXT,
    FOREIGN KEY (evaluation_id) REFERENCES clinical_evaluations (id)
);

-- Insert standardized assessment templates
INSERT OR IGNORE INTO clinical_assessment_templates (name, category, description, max_score, min_score, risk_thresholds, cpt_codes, time_estimate, evidence_citations) VALUES
('Home FAST', 'home_safety', 'Home Falls and Accidents Screening Tool - 25 items', 25, 0, '{"low": "0-3", "moderate": "4-7", "high": "8-11", "critical": "12+"}', '["97542", "97750"]', 30, '["Mackenzie et al. 2000", "Clemson et al. 2008"]'),
('HSSAT', 'home_safety', 'Home Safety Self-Assessment Tool - Comprehensive 65 items', 65, 0, '{"safe": "0-3", "moderate": "4-8", "high": "9-15", "critical": "16+"}', '["97542", "97161"]', 45, '["Tomita et al. 2009", "Stark et al. 2011"]'),
('CDC STEADI', 'fall_risk', 'CDC Stopping Elderly Accidents, Deaths & Injuries', 24, 0, '{"low": "0-3", "moderate": "4-7", "high": "8-11", "critical": "12+"}', '["99401", "97161"]', 25, '["CDC STEADI Initiative 2017"]'),
('Berg Balance Scale', 'functional', 'Gold standard balance assessment - 14 items', 56, 0, '{"high_risk": "0-20", "moderate_risk": "21-40", "low_risk": "41-56"}', '["97750", "97161"]', 20, '["Berg et al. 1992", "Downs et al. 2013"]'),
('Timed Up and Go', 'functional', 'Quick mobility and fall risk screening', NULL, NULL, '{"normal": "<10", "mild_risk": "10-13.5", "high_risk": ">13.5"}', '["97750"]', 5, '["Podsiadlo & Richardson 1991"]'),
('Morse Fall Scale', 'fall_risk', 'Fall risk assessment for home and clinical settings', 125, 0, '{"low": "0-24", "moderate": "25-50", "high": "51+"}', '["97750", "99401"]', 15, '["Morse et al. 1989"]');

-- Insert common home hazards checklist items
INSERT OR IGNORE INTO clinical_assessment_templates (name, category, description, max_score, min_score, risk_thresholds, cpt_codes, time_estimate) VALUES
('General Home Hazards', 'hazards', 'Room-by-room hazard identification', NULL, NULL, '{"safe": "0-2", "moderate": "3-5", "high": "6-8", "critical": "9+"}', '["97542"]', 20),
('Environmental Devices', 'assistive', 'Assistive device and modification assessment', NULL, NULL, '{"adequate": "0-1", "needs_attention": "2-4", "urgent": "5+"}', '["97542", "97161"]', 15);