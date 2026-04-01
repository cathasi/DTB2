A simple web application for managing events, sessions, ticketing and payments. It includes a backend (Node.js + Express) and a frontend (React + Vite). Suitable as a demo, prototype, or foundation for further development.

Main Features

Event management: create, edit, delete, search, and list events.
Session management: multiple sessions per event.
Ticket selection, ordering, and payment processing.
User area: login, view tickets, order history.
Admin dashboard: manage events/sessions and view statistics.
Architecture & Technologies

Backend: Node.js, Express, REST API.
Frontend: React with Vite, Context for authentication.
Database: SQL (schema and sample data included).
See package.json files for third-party libraries and versions.
Repository Structure (overview)

backend/: server code, controllers, routes, utilities
frontend/: React app (components, pages, services)
Databae SQL/: SQL schema, sample data, and procedures
Requirements

Node.js >= 16
A SQL database (Postgres/MySQL or compatible)
npm or yarn
Local Setup & Run

Backend:
Install dependencies:
Configure environment variables (examples): PORT, DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET
Start server:
Frontend:
Install dependencies:
Configure environment variables if needed (e.g. VITE_API_URL)
Start dev server:
Database

Run the schema and sample data SQL files in the Databae SQL/ folder to create tables and sample data.
If stored procedures are present, run the corresponding SQL files as well.
Environment Variables (examples)

PORT — backend port
DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
JWT_SECRET — JWT signing key for authentication
VITE_API_URL — API base URL used by frontend
API & Frontend Integration

Backend exposes REST endpoints for events, sessions, orders, payments, and users.
Frontend consumes these endpoints to display events, create orders, and handle payments.
Check the backend controllers/ and routes/ for exact endpoint paths.
Testing

Run any available unit or integration tests (see package.json test scripts).
Manual test flow: login → choose event → select session → select tickets → place order → payment.
Deployment Notes

Build frontend for production:

cd frontend
npm run build

Serve the generated static files with a static host or CDN.
Deploy backend to a VPS or PaaS, configure environment variables and database.
Use a reverse proxy (nginx) and enable HTTPS in production.

