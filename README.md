# DTB2 - Event Ticketing System

Overview
--------
DTB2 is an event ticketing application composed of a backend (Node.js + Express) and a frontend (Vite + React). The system supports event and session management, ticket booking, payments, user accounts, and reporting.

Key Features
------------
- Manage events and sessions (create / update / delete)
- Search and filter events (admin interface)
- Choose session and ticket quantity, proceed to payment
- User pages: My Events, My Tickets
- Reports and statistics for administrators

Architecture & Main Folders
---------------------------
- `backend/` — Node.js + Express server, controllers, routes, DB connection
- `frontend/` — React app (Vite), pages and components
- `Databae SQL/` — SQL scripts for schema and sample data

Backend (summary)
-----------------
- Main file: `backend/server.js`
- DB connection: `backend/db.js`
- Controllers: `backend/controllers/` (event, order, payment, report, session, user)
- Routes: `backend/routes/` (event.routes.js, order.routes.js, payment.routes.js, report.routes.js, session.routes.js, user.routes.js)

Frontend (summary)
------------------
- Entry: `frontend/src/main.jsx`
- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/`
- API client: `frontend/src/services/api.js`

Database
--------
SQL scripts are stored in the `Databae SQL/` folder.

ERD (Entity Relationship Diagram)
--------------------------------
![Image](https://github.com/user-attachments/assets/afdcde5e-5164-43d1-93c7-aa00934ba8b8)

Mapping (Entity -> Table Mapping)
---------------------------------
![Image](https://github.com/user-attachments/assets/5afc5493-dbe2-40e0-8334-196821970f64)

Installation & Running
----------------------
1) Backend

```powershell
cd backend
npm install
npm run start   # or `npm run dev` if available
```

2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Environment variables (example)
-------------------------------
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — database connection settings
- `PORT` — backend server port

Main API Endpoints (summary)
----------------------------
- Events: `/api/events` (list, create, update, delete)
- Sessions: `/api/sessions`
- Orders / Tickets: `/api/orders`
- Payments: `/api/payments`
- Reports: `/api/reports`
- Users / Auth: `/api/users`, `/api/sessions`

Testing
-------
Test scripts (if any) are defined in `backend/package.json` and `frontend/package.json`.


