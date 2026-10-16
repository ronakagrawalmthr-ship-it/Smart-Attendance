# 🎓 Smart Attendance & Campus Governance Platform

An enterprise-grade, institutional academic attendance ecosystem engineered with **AI Biometrics**, **10-Second Rotating Dynamic QR Codes**, **Role-Based Portals**, **Real-Time Telemetry**, and a **Cross-Platform Mobile App**.

Designed for colleges, universities, and institutions adhering to AICTE, UGC, and Vidyalaya ERP standards.

---

## 🏛️ System Architecture

```text
                                  ┌────────────────────────────────────────┐
                                  │      CENTRAL REST BACKEND ENGINE       │
                                  │   (FastAPI • Python 3.11 • Port 8000)  │
                                  │    • 128-d Biometrics • SQLite (WAL)   │
                                  │    • JWT Auth • Resend • Gemini AI     │
                                  └──────────────────┬─────────────────────┘
                                                     │
         ┌───────────────────┬───────────────────────┼───────────────────────┬───────────────────┐
         ▼                   ▼                       ▼                       ▼                   ▼
┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
│  Admin Portal   │ │   HOD Command   │     │ Teacher Console │     │ Student Portal  │ │ Teacher Mobile  │
│   (Port 3001)   │ │   (Port 3003)   │     │   (Port 3000)   │     │   (Port 3002)   │ │  (React Native) │
│ • Setup Wizard  │ │ • Dept Overview │     │ • 10s Dynamic QR│     │ • Live Attendance││ • Walk-up Face  │
│ • College KPIs  │ │ • Timetable CRUD│     │ • Manual Roster │     │ • Face ID Enroll│ │   Recognition   │
│ • Directory     │ │ • Excel Export  │     │ • Projector Kiosk│    │ • AI Copilot    │ │ • Dynamic Island│
│ • Factory Reset │ │ • Grievance Desk│     │ • Subject Alloc │     │ • Grievance Log │ │ • Offline Queue │
└─────────────────┘ └─────────────────┘     └─────────────────┘     └─────────────────┘ └─────────────────┘
```

---

## 🚀 Quick Launch (Windows)

The platform includes automated master batch scripts and individual launchers for zero-configuration startup:

### Interactive Control Center (Recommended)
Double-click `launch_menu.bat` or run:
```cmd
launch_menu.bat
```
Choose to start any individual portal, mobile app, backend, or all services simultaneously from a clean CLI menu!

### Standalone Individual Launchers
To avoid opening all terminal windows at once and prevent confusion, you can launch each service individually:
- `start_backend.bat` — Central FastAPI Backend & AI Biometrics (Port 8000)
- `start_web_frontend.bat` — Web Showcase & Teacher Console (Port 3000)
- `start_admin_portal.bat` — Institutional Admin Portal (Port 3001)
- `start_student_portal.bat` — Student Academic Portal (Port 3002)
- `start_hod_portal.bat` — HOD Departmental Command Deck (Port 3003)
- `start_mobile_app.bat` — Teacher Mobile App Expo Metro Bundler
- `start_ngrok.bat` — Ngrok Cloud Tunnel (Port 8000)

### Start All Services (7-in-1 Master Launcher)
Double-click `start_all.bat` or run:
```cmd
start_all.bat
```
This automatically boots:
1. **Central FastAPI Backend** (`http://localhost:8000`)
2. **Ngrok Cloud Tunnel** (Public HTTPS URL for mobile access)
3. **Web Showcase & Teacher Console** (`http://localhost:3000`)
4. **Admin Institutional Portal** (`http://localhost:3001`)
5. **Student Academic Portal** (`http://localhost:3002`)
6. **HOD Departmental Command Hub** (`http://localhost:3003`)
7. **Teacher Mobile App** (Launches Expo Metro bundler with interactive QR code in terminal)

### Safe Shutdown
Double-click `stop_all.bat` or run:
```cmd
stop_all.bat
```
Releases ports `8000`, `8081`, `3000`, `3001`, `3002`, `3003`, kills Ngrok processes, and cleanly closes all active terminal windows.

---

## 🌐 Portal Endpoints & Default Roles

| Component | Port / URL | Target User | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **API Engine & Docs** | `http://localhost:8000/docs` | Developers / IT | Interactive Swagger documentation for 45+ endpoints |
| **Admin Portal** | `http://localhost:3001` | Chancellor / Registrar | Day-0 Setup Wizard, college-wide KPIs, department management |
| **HOD Command Hub** | `http://localhost:3003` | Department Heads | Timetable engine, defaulters (<75%) list, CSV export, grievance desk |
| **Main & Teacher Web** | `http://localhost:3000/teacher` | Faculty Members | 10-second rotating cryptographic QR projector, live check-in counter |
| **Student Portal** | `http://localhost:3002` | Students | Face ID enrollment, attendance metrics, AI Campus Copilot, dispute filing |
| **Teacher Mobile App** | Expo Terminal QR | Teachers / Security | Walk-up facial recognition, liveness checks, Apple dynamic island alerts |

---

## 🛠️ Fresh Institutional Setup (Day-0)

When first launched with a clean database:
1. Navigate to **[http://localhost:3001](http://localhost:3001)**.
2. The platform automatically launches the **Institutional Setup Wizard (`/setup`)**.
3. Enter your institution/university name, master administrator name, email, and password.
4. Complete setup to establish your governance suite.
5. Create academic departments, assign faculty, and invite students to enroll their Face ID biometrics at `http://localhost:3002/enroll`.

---

## 🛡️ Anti-Proxy & Security Architecture

* **10-Second Cryptographic QR Rotation**: The QR token rotates every 10 seconds via signed JWTs; screenshots sent over WhatsApp/Discord expire immediately.
* **Academic Isolation**: Cross-branch, cross-semester, and cross-section proxies are strictly validated and blocked with HTTP 400.
* **Biometric Liveness Verification**: 128-dimensional structural skin-tone and Sobel gradient vectors prevent photo replay attacks.
* **Dynamic Network Resolution**: All portals resolve URLs dynamically via `window.location.hostname`, eliminating hardcoded `localhost` limitations.

---

## ☁️ Cloud & Docker Deployment

### Docker Deployment
The backend includes a production multi-stage `Dockerfile`:
```bash
cd backend
docker build -t smart-attendance-backend .
docker run -p 8000:8000 smart-attendance-backend
```

### Production PostgreSQL Switch
In `backend/.env`, simply set:
```env
DATABASE_URL=postgresql://user:password@db-host:5432/smart_attendance
```
SQLAlchemy automatically switches from local SQLite (WAL) to production PostgreSQL with connection pooling.

### Render.com Deployment
The root directory includes a tested `render.yaml` blueprint for 1-click cloud deployment.

---

## 📜 License & Engineering
Engineered by **Ronak Agrawal**. Licensed under MIT.
