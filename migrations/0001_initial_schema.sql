-- Users table for seniors and caregivers
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'senior', -- senior, caregiver, pt_ot, admin
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Home assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_type TEXT NOT NULL, -- bedroom, bathroom, kitchen, stairs, living_room
  image_url TEXT,
  hazards_detected TEXT, -- JSON array of detected hazards
  risk_score INTEGER, -- 1-10 risk level
  ai_analysis TEXT, -- Full AI analysis JSON
  pt_review TEXT, -- PT/OT professional review notes
  status TEXT DEFAULT 'pending', -- pending, analyzed, reviewed, completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Safety plans table
CREATE TABLE IF NOT EXISTS safety_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  assessment_id INTEGER,
  phase INTEGER NOT NULL, -- 1, 2, or 3
  title TEXT NOT NULL,
  tasks TEXT NOT NULL, -- JSON array of tasks
  progress INTEGER DEFAULT 0, -- percentage complete
  status TEXT DEFAULT 'active', -- active, completed, paused
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

-- Equipment recommendations table
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- grab_bar, lighting, sensor, medical_alert, mobility_aid
  description TEXT,
  price DECIMAL(10, 2),
  link TEXT,
  priority TEXT, -- essential, recommended, optional
  purchased BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES safety_plans(id)
);

-- Caregiver relationships table
CREATE TABLE IF NOT EXISTS caregivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senior_id INTEGER NOT NULL,
  caregiver_id INTEGER NOT NULL,
  relationship TEXT, -- spouse, child, friend, professional
  alert_preferences TEXT, -- JSON of notification settings
  access_level TEXT DEFAULT 'view', -- view, edit, admin
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (caregiver_id) REFERENCES users(id)
);

-- Alerts and notifications table
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- hazard, appointment, task, health, emergency
  severity TEXT NOT NULL, -- low, medium, high, critical
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- PT/OT appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider_id INTEGER,
  assessment_id INTEGER,
  scheduled_at DATETIME NOT NULL,
  duration INTEGER DEFAULT 30, -- minutes
  type TEXT DEFAULT 'video', -- video, in_person, async
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES users(id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_plans_user_id ON safety_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_caregivers_senior_id ON caregivers(senior_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);