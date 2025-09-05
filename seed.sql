-- Insert demo user
INSERT OR IGNORE INTO users (id, email, name, role, phone) VALUES 
  (1, 'demo@safeaging.com', 'Demo User', 'senior', '555-0100');

-- Insert sample caregiver
INSERT OR IGNORE INTO users (email, name, role, phone) VALUES 
  ('jane.doe@example.com', 'Jane Doe', 'caregiver', '555-0101');

-- Insert sample PT/OT provider
INSERT OR IGNORE INTO users (email, name, role, phone) VALUES 
  ('dr.smith@therapy.com', 'Dr. Smith', 'pt_ot', '555-0102');

-- Insert sample assessment
INSERT OR IGNORE INTO assessments (user_id, room_type, hazards_detected, risk_score, status) VALUES 
  (1, 'bathroom', '[{"type":"slippery_surface","location":"floor","severity":"high","confidence":0.85}]', 7, 'analyzed');

-- Insert sample alerts
INSERT OR IGNORE INTO alerts (user_id, type, severity, title, message) VALUES 
  (1, 'hazard', 'high', 'High Risk Detected', 'Bathroom assessment shows high fall risk. Consider immediate safety modifications.'),
  (1, 'appointment', 'medium', 'PT Assessment Available', 'Schedule your virtual PT assessment to review safety recommendations.');