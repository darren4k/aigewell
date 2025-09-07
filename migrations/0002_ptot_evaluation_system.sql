-- PT/OT Professional Evaluation System Tables

-- Standardized assessment templates
CREATE TABLE IF NOT EXISTS assessment_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- balance, mobility, cognitive, ADL, home_safety
  description TEXT,
  max_score INTEGER,
  min_score INTEGER,
  risk_thresholds TEXT, -- JSON: {low: ">24", medium: "19-24", high: "<19"}
  cpt_codes TEXT, -- JSON array of applicable CPT codes for billing
  time_estimate INTEGER, -- minutes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professional evaluations conducted by PT/OT
CREATE TABLE IF NOT EXISTS professional_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  provider_id INTEGER NOT NULL,
  evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  evaluation_type TEXT, -- initial, follow_up, discharge
  chief_complaint TEXT,
  medical_history TEXT,
  medications TEXT, -- JSON array
  living_situation TEXT, -- alone, with_spouse, with_family, assisted_living
  home_environment TEXT, -- JSON: stairs, bathroom_type, etc.
  overall_risk_level TEXT, -- low, moderate, high, critical
  clinical_notes TEXT,
  recommendations TEXT, -- JSON array of recommendations
  follow_up_date DATETIME,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, reviewed
  signature_provider TEXT, -- Digital signature data
  signature_date DATETIME,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Individual assessment scores
CREATE TABLE IF NOT EXISTS assessment_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  assessment_name TEXT NOT NULL,
  raw_score DECIMAL(10,2),
  normalized_score INTEGER, -- 0-100 scale
  risk_category TEXT, -- low, moderate, high
  assessment_data TEXT, -- JSON with detailed item scores
  notes TEXT,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (template_id) REFERENCES assessment_templates(id)
);

-- Berg Balance Scale items
CREATE TABLE IF NOT EXISTS berg_balance_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  sitting_to_standing INTEGER, -- 0-4
  standing_unsupported INTEGER, -- 0-4
  sitting_unsupported INTEGER, -- 0-4
  standing_to_sitting INTEGER, -- 0-4
  transfers INTEGER, -- 0-4
  standing_eyes_closed INTEGER, -- 0-4
  standing_feet_together INTEGER, -- 0-4
  reaching_forward INTEGER, -- 0-4
  picking_up_object INTEGER, -- 0-4
  turning_look_behind INTEGER, -- 0-4
  turning_360 INTEGER, -- 0-4
  placing_foot_on_stool INTEGER, -- 0-4
  standing_one_foot_front INTEGER, -- 0-4
  standing_on_one_leg INTEGER, -- 0-4
  total_score INTEGER, -- 0-56
  fall_risk TEXT, -- low: 41-56, medium: 21-40, high: 0-20
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Timed Up and Go (TUG) Test
CREATE TABLE IF NOT EXISTS tug_test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  trial1_time DECIMAL(5,2), -- seconds
  trial2_time DECIMAL(5,2),
  trial3_time DECIMAL(5,2),
  average_time DECIMAL(5,2),
  assistive_device TEXT, -- none, cane, walker, wheelchair
  fall_risk TEXT, -- low: <10s, moderate: 10-14s, high: >14s
  notes TEXT,
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Tinetti Assessment (Gait and Balance)
CREATE TABLE IF NOT EXISTS tinetti_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  -- Balance Section (16 points)
  sitting_balance INTEGER, -- 0-1
  rises_from_chair INTEGER, -- 0-2
  attempts_to_rise INTEGER, -- 0-2
  immediate_standing_balance INTEGER, -- 0-2
  standing_balance INTEGER, -- 0-2
  nudged INTEGER, -- 0-2
  eyes_closed_balance INTEGER, -- 0-1
  turning_360_balance INTEGER, -- 0-2
  sitting_down INTEGER, -- 0-2
  balance_score INTEGER, -- 0-16
  
  -- Gait Section (12 points)
  initiation_of_gait INTEGER, -- 0-1
  step_length_right INTEGER, -- 0-1
  step_height_right INTEGER, -- 0-1
  step_length_left INTEGER, -- 0-1
  step_height_left INTEGER, -- 0-1
  step_symmetry INTEGER, -- 0-1
  step_continuity INTEGER, -- 0-1
  path INTEGER, -- 0-2
  trunk INTEGER, -- 0-1
  walking_stance INTEGER, -- 0-1
  gait_score INTEGER, -- 0-12
  
  total_score INTEGER, -- 0-28
  fall_risk TEXT, -- low: 24-28, moderate: 19-23, high: <19
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Activities of Daily Living (ADL) Assessment
CREATE TABLE IF NOT EXISTS adl_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  bathing INTEGER, -- 0-2: 0=dependent, 1=assistance, 2=independent
  dressing INTEGER, -- 0-2
  toileting INTEGER, -- 0-2
  transferring INTEGER, -- 0-2
  continence INTEGER, -- 0-2
  feeding INTEGER, -- 0-2
  walking INTEGER, -- 0-2
  stairs INTEGER, -- 0-2
  medication_management INTEGER, -- 0-2
  shopping INTEGER, -- 0-2
  meal_preparation INTEGER, -- 0-2
  housekeeping INTEGER, -- 0-2
  laundry INTEGER, -- 0-2
  transportation INTEGER, -- 0-2
  telephone_use INTEGER, -- 0-2
  finance_management INTEGER, -- 0-2
  total_score INTEGER,
  independence_level TEXT, -- independent, modified_independent, supervised, limited_assist, extensive_assist, dependent
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Home Safety Checklist
CREATE TABLE IF NOT EXISTS home_safety_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  -- Entrance/Exit
  entrance_lighting TEXT, -- adequate, inadequate, needs_improvement
  entrance_steps_condition TEXT,
  entrance_handrails TEXT,
  doorway_width TEXT,
  threshold_height TEXT,
  
  -- Living Areas
  pathway_clearance TEXT,
  rug_security TEXT,
  furniture_arrangement TEXT,
  lighting_overall TEXT,
  electrical_cords TEXT,
  
  -- Bathroom
  grab_bars_toilet TEXT,
  grab_bars_shower TEXT,
  toilet_height TEXT,
  shower_accessibility TEXT,
  non_slip_surfaces TEXT,
  bathroom_lighting TEXT,
  
  -- Bedroom
  bed_height TEXT,
  nightlight_present TEXT,
  path_to_bathroom TEXT,
  phone_accessibility TEXT,
  
  -- Kitchen
  commonly_used_items_reach TEXT,
  step_stool_availability TEXT,
  kitchen_lighting TEXT,
  
  -- Stairs
  stair_lighting TEXT,
  handrails_both_sides TEXT,
  step_marking TEXT,
  stair_condition TEXT,
  
  total_hazards INTEGER,
  priority_modifications TEXT, -- JSON array
  estimated_modification_cost DECIMAL(10,2),
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Clinical recommendations based on assessments
CREATE TABLE IF NOT EXISTS clinical_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  category TEXT, -- equipment, exercise, medical, environmental, education
  priority TEXT, -- critical, high, medium, low
  recommendation TEXT,
  rationale TEXT,
  evidence_base TEXT, -- Reference to clinical guidelines
  icd10_codes TEXT, -- JSON array of applicable diagnosis codes
  cpt_codes TEXT, -- JSON array of applicable procedure codes
  estimated_cost DECIMAL(10,2),
  insurance_coverage_likely BOOLEAN,
  implementation_timeline TEXT, -- immediate, 1_week, 1_month, 3_months
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id)
);

-- Provider credentials and specializations
CREATE TABLE IF NOT EXISTS provider_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL,
  license_number TEXT,
  license_state TEXT,
  license_expiry DATE,
  npi_number TEXT,
  specializations TEXT, -- JSON array
  certifications TEXT, -- JSON array
  years_experience INTEGER,
  FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evaluations_patient ON professional_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_provider ON professional_evaluations(provider_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_evaluation ON assessment_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_evaluation ON clinical_recommendations(evaluation_id);

-- Insert standard assessment templates
INSERT OR IGNORE INTO assessment_templates (name, category, description, max_score, min_score, risk_thresholds, cpt_codes, time_estimate) VALUES
('Berg Balance Scale', 'balance', 'Gold standard balance assessment', 56, 0, '{"low": ">40", "medium": "21-40", "high": "<21"}', '["97161", "97162", "97163"]', 20),
('Timed Up and Go', 'mobility', 'Quick mobility and fall risk screening', NULL, NULL, '{"low": "<10", "medium": "10-14", "high": ">14"}', '["97161", "97162"]', 10),
('Tinetti Assessment', 'balance', 'Comprehensive gait and balance evaluation', 28, 0, '{"low": "24-28", "medium": "19-23", "high": "<19"}', '["97162", "97163"]', 25),
('Activities of Daily Living', 'ADL', 'Functional independence assessment', 32, 0, '{"independent": ">28", "supervised": "20-28", "assisted": "<20"}', '["97165", "97166"]', 30),
('Home Safety Evaluation', 'home_safety', 'Environmental hazard assessment', NULL, NULL, '{"safe": "<3", "moderate": "3-5", "unsafe": ">5"}', '["97542", "97750"]', 45),
('30-Second Chair Stand', 'strength', 'Lower body strength assessment', NULL, NULL, '{"normal": ">12", "below_average": "8-12", "poor": "<8"}', '["97161"]', 5),
('4-Stage Balance Test', 'balance', 'Progressive balance positions', 4, 0, '{"low_risk": "4", "moderate_risk": "2-3", "high_risk": "<2"}', '["97161"]', 10),
('Functional Reach Test', 'balance', 'Dynamic balance assessment', NULL, NULL, '{"normal": ">10", "moderate": "6-10", "high": "<6"}', '["97161"]', 5);