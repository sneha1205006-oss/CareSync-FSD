-- Hospital OPD Queuing & Bed Availability Database Schema
-- Compatible with SQLite and portable to PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('RECEPTIONIST', 'DOCTOR', 'WARD_ADMIN', 'ADMIN')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    avg_consultation_mins INTEGER DEFAULT 15,
    icon TEXT DEFAULT 'Activity',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    room_number TEXT NOT NULL,
    specialization TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'ON_BREAK', 'OFF_DUTY')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uhid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opd_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_number TEXT NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    doctor_id INTEGER REFERENCES doctors(id),
    visit_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK(status IN ('WAITING', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL', 'PREGNANT', 'SENIOR_CITIZEN', 'EMERGENCY')),
    priority_weight INTEGER NOT NULL DEFAULT 0,
    called_at DATETIME,
    consultation_started_at DATETIME,
    consultation_completed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    floor TEXT NOT NULL,
    total_beds INTEGER NOT NULL,
    low_bed_threshold INTEGER NOT NULL DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    bed_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'RESERVED', 'OUT_OF_SERVICE')),
    current_patient_id INTEGER REFERENCES patients(id),
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bed_admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_id INTEGER NOT NULL REFERENCES beds(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    admitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    discharged_at DATETIME,
    admitting_doctor TEXT,
    diagnosis TEXT,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DISCHARGED'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_opd_queue_dept_date ON opd_queue(department_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_opd_queue_status ON opd_queue(status);
CREATE INDEX IF NOT EXISTS idx_opd_queue_priority ON opd_queue(priority_weight DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_admissions_active ON bed_admissions(status);
