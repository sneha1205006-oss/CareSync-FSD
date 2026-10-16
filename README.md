# CareSync: Hospital OPD Queuing & Bed Availability Tracker

> A modern, real-time hospital operations system designed to reduce waiting-room chaos by synchronizing Outpatient Department (OPD) queue dispatching with inpatient ward bed allocation.

---

## 🌟 Key Features

### 1. Module A: OPD Queue & Triage Management
- **Fast Patient Intake**: Register arriving patients with demographic details (name, age, gender, phone, department, optional doctor).
- **Sequential Daily Tokens**: Automatically generated per department per day (e.g., `CARD-001`, `ORTH-002`, `PEDI-003`).
- **Priority-Weighted Triage Engine**:
  - `EMERGENCY` (Weight: 3) &rarr; Instantly moves to the head of the waiting queue.
  - `PREGNANT` (Weight: 2) &rarr; Priority scheduling ahead of routine visits.
  - `SENIOR_CITIZEN` (Weight: 1) &rarr; Expedited access for elderly patients (60+).
  - `NORMAL` (Weight: 0) &rarr; Standard First-Come, First-Served (FCFS).
- **Dynamic Estimated Wait Times**: Dynamically computed using the formula:
  $$\text{Wait Time} = (\text{Patients Ahead} + \text{Active In-Consultation}) \times \text{Avg Consultation Mins} + \text{Doctor Break Buffer}$$
- **Doctor Consultation Station**:
  - Prominent **"Call Next Patient"** hero CTA.
  - Real-time active consultation card with elapsed timer and clinical notes/prescription input.
  - Quick action buttons: **Mark Completed**, **Ring Again (Chime)**, **Skip / No-Show**.
  - Doctor Availability Switcher: `AVAILABLE`, `ON_BREAK` (adds 15m buffer alert), `OFF_DUTY`.
- **Printable OPD Token Slips**: Modal with clear typography, UHID, department, room destination, and timestamp.

### 2. Module B: Inpatient Bed Availability & Sanitization Tracker
- **5 Specialized Hospital Wards**: Intensive Care Unit (ICU), Emergency & Trauma, General Inpatient Ward, Maternity Ward, and Pediatric Ward (38 realistic beds).
- **5 Distinct Bed States**:
  - 🟢 **Available**: Ready for immediate emergency or elective intake.
  - 🔴 **Occupied**: Admitted patient with name, age, UHID, diagnosis, and admitting physician.
  - 🟡 **Cleaning / Sanitizing**: Post-discharge disinfection cycle awaiting housekeeping clearance.
  - 🔵 **Reserved**: Bed held for incoming surgical transfer or critical emergency.
  - ⚪ **Out of Service**: Under maintenance or repair.
- **Critical Bed Shortage Alerts**: Automatic visual warning banner when any ward's available beds fall below its safety threshold (e.g. ICU < 2 beds).
- **Patient Admission & Discharge Workflow**:
  - Direct 1-click admission modal from any available bed.
  - Instant discharge that timestamps discharge time and automatically transitions the bed into the `CLEANING` cycle.
  - 1-click "Mark Cleaned" button to return sanitized beds to `AVAILABLE`.

### 3. Module C: Public Waiting-Hall Screen (`/display`)
- **No-Auth Public Screen**: High-contrast, dark-mode display optimized for large TVs and wall monitors.
- **Now Calling Spotlight**: Pulsing highlighted banner with large token numbers, patient name, department, doctor, and room destination.
- **Synthesized Melodic Chime & Voice Synthesis**:
  - Clean two-tone hospital chime synthesized with Web Audio API (D5 &rarr; A5 sinusoid).
  - Optional Web Speech API voice announcements: *"Token CARD-001, please proceed to Room 101"*.
- **Upcoming In-Line Queue**: Next 6 patients with real-time estimated wait times.
- **Live Bed Availability Sidebar**: Instant breakdown of available beds in ICU, Emergency, and General wards.

### 4. Module D: Analytics & Reporting
- **Executive KPIs**: Total patients registered today, average wait time in minutes, completed consultations, and hospital-wide bed occupancy percentage.
- **Interactive Visualizations (Recharts)**:
  - Department Patient Volume (Total vs. Completed).
  - Ward Bed Utilization breakdown (Donut / Pie chart).
  - Hourly patient arrival distribution.
- **One-Click CSV Export**: Downloads RFC-compliant CSV audit report containing all OPD visits and inpatient bed admissions.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO, Better-SQLite3, JSON Web Tokens (JWT), Bcrypt.js, Dotenv.
- **Database**: SQLite with ANSI SQL schema designed to be 100% portable to PostgreSQL.
- **Testing**: Built-in Node.js Test Runner (`node --test`), automated E2E workflow script.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher) and npm.

### Installation & Startup
```bash
# 1. Install all dependencies (root, backend, and frontend)
npm run install:all

# 2. Seed database with sample departments, doctors, wards, 38 beds, and patients
npm run seed

# 3. Launch both backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

The application will be available at:
- **Staff Operations & Login**: [http://localhost:5173](http://localhost:5173)
- **Public Waiting-Hall TV Screen**: [http://localhost:5173/display](http://localhost:5173/display)
- **Backend API Server**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔐 Demo User Credentials

The login screen includes **1-Click Demo Login Buttons** for instant role switching:

| Role | Username | Password | Default Area / Assigned Station |
|---|---|---|---|
| **Receptionist** | `reception` | `hospital123` | Sarah Jenkins &bull; Main OPD Intake Desk |
| **Doctor (Cardiology)** | `dr.sharma` | `hospital123` | Dr. Rajesh Sharma &bull; Room 101 (Cardiology) |
| **Doctor (Pediatrics)** | `dr.patel` | `hospital123` | Dr. Ananya Patel &bull; Room 104 (Pediatrics) |
| **Doctor (Orthopedics)**| `dr.khan` | `hospital123` | Dr. Tariq Khan &bull; Room 102 (Orthopedics) |
| **Ward Staff** | `wardadmin` | `hospital123` | Marcus Vance &bull; Inpatient Bed Management |
| **Hospital Administrator** | `admin` | `hospital123` | Director Clara Reed &bull; Analytics & CSV Export |
| **Public Hall Screen** | *No Login Needed* | *N/A* | Open directly at `/display` |

---

## 🧪 Running Automated Tests

Run the backend unit test suite:
```bash
npm test
```

Run the automated End-to-End workflow verification script:
```bash
node server/tests/e2eVerification.js
```

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Authenticate staff credentials, return JWT and doctor metadata.
- `GET /api/auth/me` - Retrieve authenticated user profile.
- `GET /api/auth/demo-users` - Retrieve list of demo accounts.

### OPD Queue (`/api/queue`)
- `POST /api/queue/register` - Register a patient and issue a daily sequential token (Role: `RECEPTIONIST`, `ADMIN`).
- `GET /api/queue/today` - Fetch today's queue list with priority sorting and dynamic wait times.
- `POST /api/queue/call-next` - Doctor calls the next waiting patient (Role: `DOCTOR`, `ADMIN`).
- `POST /api/queue/:id/recall` - Re-trigger chime announcement on the public screen.
- `PATCH /api/queue/:id/status` - Update status (`WAITING`, `IN_CONSULTATION`, `COMPLETED`, `SKIPPED`, `CANCELLED`).
- `GET /api/queue/public-summary` - Read-only live feed for waiting-room screens.

### Beds & Wards (`/api/beds`)
- `GET /api/beds/summary` - Live statistics per ward (total, occupied, available, cleaning, low alert flag).
- `GET /api/beds/grid` - Complete list of beds with current occupant details.
- `POST /api/beds/admit` - Admit a patient to an available bed (Role: `WARD_ADMIN`, `ADMIN`).
- `POST /api/beds/:id/discharge` - Discharge patient and transition bed to `CLEANING`.
- `PATCH /api/beds/:id/status` - Update bed status (`AVAILABLE`, `OCCUPIED`, `CLEANING`, `RESERVED`, `OUT_OF_SERVICE`).

### Doctors & Departments (`/api/doctors`, `/api/departments`)
- `GET /api/departments` - List all hospital departments with average consultation times.
- `GET /api/doctors` - List doctors with room numbers and live availability status.
- `PATCH /api/doctors/:id/status` - Toggle doctor status (`AVAILABLE`, `ON_BREAK`, `OFF_DUTY`).

### Analytics & Reports (`/api/reports`)
- `GET /api/reports/today-kpis` - Executive metrics (patient volume, average wait time, occupancy %).
- `GET /api/reports/charts` - Chart datasets for department volume and ward breakdown.
- `GET /api/reports/export-csv` - Download RFC-compliant CSV report of today's OPD visits and bed admissions.

---

## 🗄️ Database Schema

The database schema utilizes standard ANSI SQL types for seamless portability:

- **`users`**: `id`, `username`, `password_hash`, `full_name`, `role`, `created_at`
- **`departments`**: `id`, `name`, `code`, `avg_consultation_mins`, `icon`
- **`doctors`**: `id`, `user_id`, `department_id`, `room_number`, `specialization`, `status`
- **`patients`**: `id`, `uhid`, `name`, `age`, `gender`, `phone`, `created_at`
- **`opd_queue`**: `id`, `token_number`, `patient_id`, `department_id`, `doctor_id`, `visit_date`, `status`, `priority`, `priority_weight`, `called_at`, `consultation_started_at`, `consultation_completed_at`, `notes`, `created_at`
- **`wards`**: `id`, `name`, `code`, `floor`, `total_beds`, `low_bed_threshold`
- **`beds`**: `id`, `ward_id`, `bed_number`, `status`, `current_patient_id`, `notes`, `updated_at`
- **`bed_admissions`**: `id`, `bed_id`, `patient_id`, `admitted_at`, `discharged_at`, `admitting_doctor`, `diagnosis`, `notes`, `status`

---

## 📄 License
MIT License. Built for hospital waiting-room and bed management efficiency.
