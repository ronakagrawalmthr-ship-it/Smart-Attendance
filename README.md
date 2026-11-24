# Smart Attendance & Academic Analytics System

> **A comprehensive, enterprise-grade AI-powered attendance, timetable governance, and academic analytics platform.**  
> *Designed & Developed by **Ronak Agrawal***

---

## 🌟 Executive Overview

**Smart Attendance System** is an end-to-end, multi-tier academic management platform built for universities and higher-education institutions. It eliminates manual paper roll-calls, buddy-punching, and proxy attendance by integrating **dynamic rotating QR codes**, **AI facial recognition with anti-spoofing liveness verification**, and **real-time administrative telemetry**.

The platform is designed with a **micro-frontend architecture**, hosting four dedicated, role-isolated portals alongside a centralized high-performance Python FastAPI engine and a cross-platform React Native mobile kiosk application.

---

## 🏛️ Ecosystem Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client Applications    │
                                  └──────────────┬──────────────┘
                                                 │
         ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
         │ (Port 3000)       │ (Port 3002)       │ (Port 3003)       │ (Port 3001)       │ (Metro 8081)
         ▼                   ▼                   ▼                   ▼                   ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Teacher &    │    │ Student      │    │ Department   │    │ Institutional│    │ React Native │
  │ Showcase     │    │ Academic     │    │ HOD Command  │    │ Admin Gov.   │    │ Mobile App   │
  │ Portal       │    │ Portal       │    │ Hub          │    │ Portal       │    │ (Expo Go)    │
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │                   │                   │
         └───────────────────┴───────────────────┼───────────────────┴───────────────────┘
                                                 │ HTTPS / JSON Web Tokens / CORS
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   Central FastAPI Engine    │
                                  │         (Port 8000)         │
                                  └──────────────┬──────────────┘
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
             ┌────────────────────────┐                     ┌────────────────────────┐
             │ SQLite (Dev / Edge WAL)│                     │ PostgreSQL (Production)│
             │     `sql_app.db`       │                     │    Supabase Pooled     │
             └────────────────────────┘                     └────────────────────────┘
```

---

## 🚀 Live Production Deployments & Ports

| Portal / Service | Port | Live Production URL | Primary Target Audience |
| :--- | :--- | :--- | :--- |
| **Central Backend & API Engine** | `8000` | `https://monika-monohydroxy-jimmy.ngrok-free.dev` | REST API, Swagger `/docs`, OpenAPI |
| **Teacher Web & Showcase** | `3000` | [web-frontend-five-gray.vercel.app](https://web-frontend-five-gray.vercel.app) | Faculty, Classroom QR Broadcaster, Roster |
| **Institutional Admin Portal** | `3001` | [admin-portal-eta-lilac.vercel.app](https://admin-portal-eta-lilac.vercel.app) | University Registrar, Deans, Governance |
| **Student Academic Portal** | `3002` | [student-portal-one-ruby.vercel.app](https://student-portal-one-ruby.vercel.app) | Students, Timetable, Grievance, Scans |
| **HOD Department Command Hub** | `3003` | [hod-portal.vercel.app](https://hod-portal.vercel.app) | Heads of Department, Faculty Substitutions |
| **Mobile Kiosk Application** | `8081` | Expo Metro Bundler | Classroom Tablets & Kiosk Stations |

---

## 🎯 Core Features & Capabilities

### 1. 📱 Dynamic Rotating QR Attendance
- **Anti-Screenshot & Dynamic Rotation:** Teacher broadcasts a 10-second rotating cryptographic QR token.
- **Extended Real-World Grace Margin:** Backend validates JWTs with an expiration window of 180 seconds (3 minutes) to ensure students with camera focus or cellular latency are never locked out.
- **Dual-Scan Deep-Linking:** QR codes encode direct portal URLs (`/scan?token=...`). Students can scan using their native phone camera (iOS Camera / Google Lens) or the built-in in-app scanner.

### 2. 👤 AI Facial Recognition & Anti-Spoofing
- **OpenCV Liveness Verification:** Analyzes webcam frames in real-time to prevent photo and screen-playback spoofing.
- **Privacy-Preserving Embeddings:** Mathematical facial vectors are stored in SQLite/PostgreSQL; zero raw selfie photos are permanently retained.

### 3. 🕒 Indian Standard Time (IST / Asia/Kolkata) Native
- All class schedules, timestamps, attendance logs, and date selectors run natively on `Asia/Kolkata` (UTC+05:30), preventing late-night UTC date roll-back glitches.

### 4. 📊 Academic Governance & Analytics
- **Live Classroom Roster:** Real-time check-in stream updates on the faculty console within 2 seconds of scanning.
- **Same-Day Grace Corrections Desk:** Teachers can adjust late arrivals or resolve genuine issues on the same academic day before sessions lock.
- **HOD Oversight & Condonation:** Departmental drill-downs, faculty substitution management, duty leaves, and condonations for medical absences.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, Pydantic, Uvicorn, Jose JWT, OpenCV, Passlib (Argon2 / BCrypt).
- **Frontend Portals:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Html5-Qrcode.
- **Database:** SQLite (with WAL mode, NORMAL sync, busy timeout) for local development and edge deployments; PostgreSQL with connection pooling for institutional scale.
- **Cloud Tunneling:** Ngrok dedicated custom domain for secure remote mobile-to-localhost bridging.

---

## ⚡ Quick Start Guide (Windows)

### 1-Click Master Launch (All Services)
Double-click `start_all.bat` in the root folder. This automatically boots:
1. Central FastAPI Backend (Port 8000)
2. Dedicated Ngrok Tunnel
3. Teacher & Showcase Portal (Port 3000)
4. Admin Governance Portal (Port 3001)
5. Student Academic Portal (Port 3002)
6. HOD Department Hub (Port 3003)
7. Mobile Expo Terminal (Port 8081)

### Safe Shutdown
To terminate all background server processes safely, run:
```cmd
stop_all.bat
```

### Manual Individual Commands

#### Central Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API Documentation: `http://localhost:8000/docs`

#### Any Frontend Portal (`web-frontend`, `student-portal`, `admin-portal`, `hod-portal`):
```bash
cd <portal-directory>
npm install
npm run dev -- -p <port>
```

---

## 🔐 Default Demo Credentials

| Role | Email / Identifier | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Student** | `ronakagrawalmthr@gmail.com` *(or Roll: `2500650100111`)* | `student123` | Computer Science, Sem 3, Sec C |
| **Teacher** | `teacher@gmail.com` | `teacher123` | CSE Department Faculty |
| **HOD** | `hodcse@gmail.com` | `admin123` | Head of Computer Science |
| **Administrator** | `spideronak@gmail.com` | `admin123` | University Registrar & Governance |

---

## 📄 License & Attribution

Developed with ❤️ by **Ronak Agrawal**.  
All rights reserved © 2026.
