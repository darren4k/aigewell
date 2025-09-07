-- Standardized Home Safety Assessment Tools

-- Home Falls and Accidents Screening Tool (Home FAST)
CREATE TABLE IF NOT EXISTS home_fast_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Floors (4 items)
  walkways_clear BOOLEAN,
  floor_coverings_secure BOOLEAN,
  mats_secure BOOLEAN,
  floor_surfaces_nonslip BOOLEAN,
  
  -- Furniture (3 items)
  furniture_stable BOOLEAN,
  furniture_appropriate_height BOOLEAN,
  bed_appropriate_height BOOLEAN,
  
  -- Lighting (4 items)
  adequate_lighting_indoors BOOLEAN,
  adequate_lighting_outdoors BOOLEAN,
  accessible_switches BOOLEAN,
  night_lights_available BOOLEAN,
  
  -- Bathroom (4 items)
  toilet_appropriate_height BOOLEAN,
  grab_rails_toilet BOOLEAN,
  grab_rails_shower BOOLEAN,
  nonslip_shower_surface BOOLEAN,
  
  -- Storage (2 items)
  items_reachable BOOLEAN,
  step_ladder_available BOOLEAN,
  
  -- Stairways/Steps (4 items)
  indoor_stairs_rails BOOLEAN,
  outdoor_stairs_rails BOOLEAN,
  stairs_edges_visible BOOLEAN,
  stairs_in_good_repair BOOLEAN,
  
  -- Mobility (4 items)
  mobility_aids_appropriate BOOLEAN,
  mobility_aids_good_repair BOOLEAN,
  pet_hazards_managed BOOLEAN,
  footwear_appropriate BOOLEAN,
  
  total_score INTEGER, -- 0-25, higher = safer
  risk_level TEXT, -- low: 20-25, moderate: 15-19, high: <15
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Home Safety Self-Assessment Tool (HSSAT)
CREATE TABLE IF NOT EXISTS hssat_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Entrance (10 items)
  entrance_well_lit BOOLEAN,
  doorway_clear BOOLEAN,
  doorbell_accessible BOOLEAN,
  door_locks_easy BOOLEAN,
  threshold_level BOOLEAN,
  entrance_covered BOOLEAN,
  entrance_steps_good_repair BOOLEAN,
  entrance_handrail BOOLEAN,
  entrance_nonslip BOOLEAN,
  entrance_contrast_marking BOOLEAN,
  
  -- Interior Stairs (8 items)
  stairs_well_lit BOOLEAN,
  stairs_clear BOOLEAN,
  stairs_handrails_both BOOLEAN,
  stairs_handrails_secure BOOLEAN,
  stairs_consistent_height BOOLEAN,
  stairs_edges_marked BOOLEAN,
  stairs_carpet_secure BOOLEAN,
  stairs_nonslip BOOLEAN,
  
  -- Living/Dining Room (7 items)
  living_pathways_clear BOOLEAN,
  living_rugs_secure BOOLEAN,
  living_furniture_stable BOOLEAN,
  living_electrical_safe BOOLEAN,
  living_lighting_adequate BOOLEAN,
  living_phone_accessible BOOLEAN,
  living_smoke_detector BOOLEAN,
  
  -- Kitchen (12 items)
  kitchen_lighting_adequate BOOLEAN,
  kitchen_floor_nonslip BOOLEAN,
  kitchen_items_reachable BOOLEAN,
  kitchen_stepstool_stable BOOLEAN,
  kitchen_counters_clear BOOLEAN,
  kitchen_appliances_safe BOOLEAN,
  kitchen_ventilation BOOLEAN,
  kitchen_fire_extinguisher BOOLEAN,
  kitchen_emergency_numbers BOOLEAN,
  kitchen_knives_stored BOOLEAN,
  kitchen_pot_handles_inward BOOLEAN,
  kitchen_cleaning_products_labeled BOOLEAN,
  
  -- Bedroom (8 items)
  bedroom_lighting_adequate BOOLEAN,
  bedroom_path_clear BOOLEAN,
  bedroom_bed_height_appropriate BOOLEAN,
  bedroom_nightlight BOOLEAN,
  bedroom_phone_reachable BOOLEAN,
  bedroom_flashlight BOOLEAN,
  bedroom_smoke_alarm BOOLEAN,
  bedroom_clothing_accessible BOOLEAN,
  
  -- Bathroom (14 items)
  bathroom_door_opens_out BOOLEAN,
  bathroom_lock_emergency BOOLEAN,
  bathroom_lighting_adequate BOOLEAN,
  bathroom_nightlight BOOLEAN,
  bathroom_floor_nonslip BOOLEAN,
  bathroom_rugs_secure BOOLEAN,
  bathroom_tub_nonslip BOOLEAN,
  bathroom_grab_bars_tub BOOLEAN,
  bathroom_grab_bars_toilet BOOLEAN,
  bathroom_toilet_height BOOLEAN,
  bathroom_shower_seat BOOLEAN,
  bathroom_water_temperature BOOLEAN,
  bathroom_medications_labeled BOOLEAN,
  bathroom_electrical_safe BOOLEAN,
  
  -- General Safety (6 items)
  emergency_plan BOOLEAN,
  emergency_contacts BOOLEAN,
  medications_organized BOOLEAN,
  carbon_monoxide_detector BOOLEAN,
  home_security BOOLEAN,
  regular_maintenance BOOLEAN,
  
  total_score INTEGER, -- 0-65, higher = safer
  percentage_safe DECIMAL(5,2),
  priority_hazards TEXT, -- JSON array of critical items
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CDC STEADI Fall Risk Assessment
CREATE TABLE IF NOT EXISTS steadi_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Stay Independent Questionnaire (12 items, Yes=2, Sometimes=1, No=0)
  fallen_past_year INTEGER, -- 0-2
  feel_unsteady INTEGER, -- 0-2
  worry_about_falling INTEGER, -- 0-2
  need_hands_to_stand INTEGER, -- 0-2
  use_mobility_aid INTEGER, -- 0-2
  steady_walking INTEGER, -- 0-2
  need_rail_stairs INTEGER, -- 0-2
  rush_to_toilet INTEGER, -- 0-2
  lost_feeling_feet INTEGER, -- 0-2
  take_medication_dizzy INTEGER, -- 0-2
  take_sleep_medication INTEGER, -- 0-2
  feel_sad_depressed INTEGER, -- 0-2
  
  total_score INTEGER, -- 0-24
  risk_category TEXT, -- low: 0-3, moderate: 4-7, high: ≥8
  
  -- Additional Clinical Measures
  orthostatic_hypotension BOOLEAN,
  visual_acuity_tested BOOLEAN,
  feet_examined BOOLEAN,
  cognitive_screen_completed BOOLEAN,
  medication_review_completed BOOLEAN,
  vitamin_d_recommended BOOLEAN,
  
  -- Functional Assessments
  tug_test_seconds DECIMAL(5,2),
  chair_stand_test_count INTEGER,
  four_stage_balance_score INTEGER,
  
  -- Interventions Recommended
  exercise_program BOOLEAN,
  medication_adjustment BOOLEAN,
  vision_correction BOOLEAN,
  home_modification BOOLEAN,
  
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  follow_up_date DATETIME,
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Morse Fall Scale
CREATE TABLE IF NOT EXISTS morse_fall_scale (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Risk Factors with scores
  history_of_falling INTEGER, -- No=0, Yes=25
  secondary_diagnosis INTEGER, -- No=0, Yes=15
  ambulatory_aid INTEGER, -- None/Bedrest/Wheelchair=0, Crutches/Cane/Walker=15, Furniture=30
  iv_therapy INTEGER, -- No=0, Yes=20
  gait_transferring INTEGER, -- Normal/Bedrest/Immobile=0, Weak=10, Impaired=20
  mental_status INTEGER, -- Oriented=0, Forgets limitations=15
  
  total_score INTEGER, -- 0-125
  risk_level TEXT, -- low: 0-24, moderate: 25-44, high: ≥45
  
  interventions_implemented TEXT, -- JSON array
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reassessment_due DATETIME,
  
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Professional Export Tracking
CREATE TABLE IF NOT EXISTS export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  export_type TEXT, -- PDF, CSV, HL7, FHIR
  export_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  exported_by INTEGER,
  file_name TEXT,
  metadata TEXT, -- JSON with additional info
  FOREIGN KEY (evaluation_id) REFERENCES professional_evaluations(id),
  FOREIGN KEY (exported_by) REFERENCES users(id)
);

-- Multi-Caregiver Permission System
CREATE TABLE IF NOT EXISTS caregiver_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caregiver_id INTEGER NOT NULL,
  senior_id INTEGER NOT NULL,
  permission_level TEXT, -- view_only, edit_assessments, manage_care, admin
  can_view_medical BOOLEAN DEFAULT TRUE,
  can_edit_plans BOOLEAN DEFAULT FALSE,
  can_schedule_appointments BOOLEAN DEFAULT FALSE,
  can_manage_equipment BOOLEAN DEFAULT FALSE,
  can_export_data BOOLEAN DEFAULT FALSE,
  can_add_caregivers BOOLEAN DEFAULT FALSE,
  invitation_status TEXT, -- pending, accepted, declined
  invitation_sent DATETIME,
  invitation_accepted DATETIME,
  last_active DATETIME,
  FOREIGN KEY (caregiver_id) REFERENCES users(id),
  FOREIGN KEY (senior_id) REFERENCES users(id)
);

-- Caregiver Communication Log
CREATE TABLE IF NOT EXISTS caregiver_communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senior_id INTEGER NOT NULL,
  caregiver_id INTEGER NOT NULL,
  message_type TEXT, -- note, alert, update, question
  subject TEXT,
  message TEXT,
  attachments TEXT, -- JSON array of file references
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (caregiver_id) REFERENCES users(id)
);

-- Analytics Tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT, -- assessment_completed, plan_updated, equipment_viewed, etc.
  event_category TEXT, -- engagement, safety, compliance
  event_data TEXT, -- JSON with event-specific data
  session_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- HIPAA Compliance Audit Log
CREATE TABLE IF NOT EXISTS hipaa_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT, -- view, create, update, delete, export
  resource_type TEXT, -- assessment, medical_record, personal_info
  resource_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_home_fast_user ON home_fast_assessment(user_id);
CREATE INDEX IF NOT EXISTS idx_hssat_user ON hssat_assessment(user_id);
CREATE INDEX IF NOT EXISTS idx_steadi_user ON steadi_assessment(user_id);
CREATE INDEX IF NOT EXISTS idx_morse_user ON morse_fall_scale(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_caregiver ON caregiver_permissions(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_permissions_senior ON caregiver_permissions(senior_id);
CREATE INDEX IF NOT EXISTS idx_communications_senior ON caregiver_communications(senior_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_user ON hipaa_audit_log(user_id);

-- Insert assessment template data
INSERT OR IGNORE INTO assessment_templates (name, category, description, max_score, min_score, risk_thresholds, cpt_codes, time_estimate) VALUES
('Home FAST', 'home_safety', 'Home Falls and Accidents Screening Tool - 25 items', 25, 0, '{"low": "20-25", "moderate": "15-19", "high": "<15"}', '["97542", "97750", "99509"]', 30),
('HSSAT', 'home_safety', 'Home Safety Self-Assessment Tool - 65 items comprehensive', 65, 0, '{"safe": ">52", "moderate": "39-52", "unsafe": "<39"}', '["97542", "97750", "99509"]', 45),
('CDC STEADI', 'fall_risk', 'CDC Stopping Elderly Accidents, Deaths & Injuries assessment', 24, 0, '{"low": "0-3", "moderate": "4-7", "high": "≥8"}', '["99385", "99386", "99387", "G0438", "G0439"]', 20),
('Morse Fall Scale', 'fall_risk', 'Morse Fall Risk Assessment in home and clinical settings', 125, 0, '{"low": "0-24", "moderate": "25-44", "high": "≥45"}', '["97161", "97162", "97163"]', 15);