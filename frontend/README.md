# FORGR Frontend MVP

Role-based frontend for FORGR with dedicated dashboards for Student, Admin, and Parent.

## Stack

- React + TypeScript + Vite
- React Router for role-based routing and route guards
- Recharts for dashboard data visualizations

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment Variables

- `VITE_API_BASE_URL`: FastAPI backend base URL. Default in code is `http://127.0.0.1:8000`.

## Route Map

- `/login`: Role login page
- `/student`: Student dashboard (protected, student only)
- `/admin`: Admin dashboard (protected, admin only)
- `/parent`: Parent dashboard (protected, parent only)
- `/unauthorized`: Unauthorized access page

## Role Model

- Admin: editor of institutional data
- Student: editor of their own growth data
- Parent: read-only analytics viewer

## Login Credentials (Current Backend)

- Admin:
  - Email/ID: `admin@forgr.app`
  - Password: any value with at least 4 characters
- Student:
  - Email/ID: existing student email or student ID from backend DB
  - Password: any value with at least 4 characters
- Parent:
  - Email/ID: existing student email or student ID from backend DB
  - Password: any value with at least 4 characters

Sample student record in current DB:

- Student ID: `STU001`
- Email: `satyam@gmail.com`

## Role Access Matrix

| Role | Allowed Route | Dashboard Focus |
| --- | --- | --- |
| Student | `/student` | Self-growth editing, personal academics, skills, attendance, placement, risk suggestions |
| Admin | `/admin` | Institutional data editing, cohort KPIs, risk distribution, filters, student table |
| Parent | `/parent` | Read-only analytics, child progress, risk alerts, recommendations, announcements |

## Component Inventory

- `AppLayout`: Sidebar + top-level shell
- `ProtectedRoute`: Authentication + role guard
- `StatCard`: Reusable KPI card
- `SectionCard`: Reusable content section wrapper

## Data Strategy

The app uses a mixed real + mock approach:

- Real API:
  - `GET /students` via `src/services/studentsApi.ts`
- Mock adapters:
  - Student dashboard summary and charts
  - Admin risk/KPI blocks
  - Parent summary/announcements
  - Located in `src/services/dashboardApi.ts`

## Mock-to-Live Migration Notes

1. Keep UI components and page layouts unchanged.
2. Replace methods in `dashboardApi.ts` with backend endpoint calls.
3. Preserve return types from `src/types/domain.ts`.
4. Use loading/error states already implemented in each dashboard page.

## Current MVP Scope

- Login with role selector and persisted session
- Route-level access control
- Student, admin, and parent dashboard entry points
- Student list from backend integration
- Responsive layout and accessible controls
