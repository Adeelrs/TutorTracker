# TutorTrack

TutorTrack is a full-stack tutoring platform built to support role-based tutoring management, session reporting, and communication.

The system is designed around one clear idea:

- managers control relationships and approvals ,they can do anything tutors and they can update any person's details 
- tutors handle students and session outcomes
- parents request support and follow their child's learning
- students read their own learning record

The final version is intentionally simplified so the strongest end-to-end workflows are stable, easy to explain, and realistic for academic assessment.

## Purpose of the system

TutorTrack solves the problem of tutoring information being spread across disconnected tools. Instead of storing bookings, reports, assignments, and communication in separate places, the platform keeps them in one system with role-based access.

The strongest workflow in the project is:

`manager setup -> parent booking request -> tutor action -> session report -> parent/student visibility`

## User roles

### Manager

The manager is the control role. They can:

- approve or reject tutors
- assign students to tutors
- link parents to students
- create student accounts
- edit user details
- open any user's detail/dashboard-style page
- message tutors, parents, and students

### Tutor

The tutor works mainly from one dashboard. They can:

- search assigned students
- open tutor-facing student detail pages
- review requested sessions
- view upcoming confirmed sessions
- create and edit session reports
- message parents, students, and manager

### Parent

The parent uses the dashboard to:

- request bookings for linked children
- switch between linked child cards
- view bookings for the selected child
- view the selected child's learning overview
- open session reports in read-only mode
- message tutors and manager

### Student

The student has the simplest portal. They can:

- view their own dashboard
- see linked guardians
- see subject areas and recorded sessions
- open session reports in read-only mode
- message tutors and manager

## Key features by role

## Manager features

- control-centre dashboard
- tutor approval queue
- tutor-student assignment tools
- parent-student linking tools
- platform users search/filter
- manager user-detail page with manager-only controls

## Tutor features

- students section with search/filter
- requested sessions
- upcoming sessions
- previous sessions and report tasks
- tutor-facing student detail page
- report creation and editing

## Parent features

- booking request form
- linked child cards
- bookings for selected child
- child learning overview
- report viewing and tutor follow-up messaging

## Student features

- personal learning overview
- guardian summary
- subject filtering
- session list with report buttons
- read-only report access

## Shared features

- role-based authentication
- shared session report page
- role-specific messaging pages built on one shared message UI
- dark/light theme toggle in the avatar dropdown

## Tech stack

- Frontend: Vue 3, Vite, Vue Router, Axios
- Backend: Node.js, Express
- Database: MySQL using `mysql2/promise`
- Authentication: bcrypt password hashing with bearer tokens stored in MySQL

## Project structure

```text
TutorTrack/
├─ frontend/
│  ├─ src/
│  │  ├─ layouts/
│  │  ├─ router/
│  │  ├─ services/
│  │  ├─ components/
│  │  └─ views/
│  └─ package.json
├─ backend/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ middleware/
│  │  └─ utils/
│  ├─ sql/
│  │  ├─ schema.sql
│  │  └─ seed.sql
│  └─ package.json
└─ README.md
```

## Frontend overview

The frontend is a Vue single-page app with:

- one shared `AppShell`
- protected routes by role
- role-specific dashboards
- reusable components for messaging, bookings, approvals, and student overviews
- one shared session report page used by all roles

## Backend overview

The backend uses a layered Express structure:

- routes define endpoints
- controllers stay thin
- services hold business logic
- `db.js` handles database access and transactions

The main backend areas are:

- auth
- users/profile management
- students
- tutors
- parents
- relationships
- bookings
- sessions
- messages
- manager approval tools

## Database overview

The database is centred on one shared `users` table plus role-specific tables:

- `tutors`
- `students`
- `parents`
- `managers`

Two relationship tables control access:

- `tutor_students`
- `parent_students`

The tutoring lifecycle uses:

- `bookings` for planned/requested sessions
- `sessions` for recorded reports

Messaging uses:

- `conversations`
- `messages`

## Shared report flow and permissions

There is one shared session report page used by every role.

Permissions are:

- Tutor: view and edit
- Manager: view and edit
- Parent: view only
- Student: view only

This is one of the main design decisions in the project because it creates one source of truth for tutoring evidence.

## Setup instructions

## 1. Prerequisites

Make sure you have:

- Node.js
- npm
- MySQL

## 2. Create the database

Create a MySQL database called:

- `tutortrack`

## 3. Backend environment

Create a file:

- `backend/.env`

Suggested contents:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tutortrack
PORT=4000
FRONTEND_URL=http://localhost:5173
```
You can also see the backend backend/.env.example file for reference
## 4. Frontend environment

The frontend works without a custom environment file if the API is running on:

- `http://localhost:4000`

If needed, you can create:

- `frontend/.env`

with:

```env
VITE_API_URL=http://localhost:4000/api
```
You can also see the backend frontend/.env.example file for reference
## 5. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## 6. Reset / set up the database

Run these files in order:

1. `backend/sql/schema.sql`
2. `backend/sql/seed.sql`

This gives you the final database structure and demo-ready sample data.

## Database reset note

The top of `schema.sql` contains `DROP TABLE IF EXISTS ...` statements.

That means running the schema file will:

- delete the current TutorTrack tables if they already exist
- recreate them from scratch

This is useful for:

- development resets
- demo resets
- marking/testing from a clean state

Do not run it if you want to keep existing data.

## 7. Run the backend

```bash
cd backend
npm run dev
```

If you prefer not to use nodemon:

```bash
npm start
```

The backend runs on:

- `http://localhost:4000`

## 8. Run the frontend

```bash
cd frontend
npm run dev
```

The frontend runs on:

- `http://localhost:5173`

## 9. Test the API quickly

You can open:

- `http://localhost:4000/api/health`

Expected result: a success JSON message.

## Seeded test accounts

All seeded users use:

- `Password123!`

### Manager

- `manager@tutortrack.local`

### Tutors

- Approved tutor: `tutor.aisha@tutortrack.local`
- Pending tutor: `tutor.daniel@tutortrack.local`
- Pending tutor: `tutor.sophie@tutortrack.local`
- Pending tutor: `tutor.tom@tutortrack.local`

### Parents

- `parent.sana@tutortrack.local`
- `parent.michael@tutortrack.local`
- `parent.rachel@tutortrack.local`

### Students

- `student.amira@tutortrack.local`
- `student.yusuf@tutortrack.local`
- `student.mariam@tutortrack.local`
- `student.hana@tutortrack.local`
- `student.noah@tutortrack.local`
- `student.leah@tutortrack.local`

## Suggested demo accounts

If you want the smoothest demo flow:

- Manager: `manager@tutortrack.local`
- Tutor: `tutor.aisha@tutortrack.local`
- Parent: `parent.sana@tutortrack.local`
- Student: `student.amira@tutortrack.local`

## Important simplifications in the final version

The final project was intentionally simplified for stability and presentation quality.

### Included in the final version

- role-based dashboards
- relationship management
- booking requests
- tutor approval
- shared session reporting
- messaging


## Best end-to-end flow to demonstrate

The strongest presentation story is:

1. Manager approves a tutor
2. Manager assigns a student to that tutor
3. Parent creates a booking request
4. Tutor accepts it
5. Tutor creates a session report
6. Parent and student view that report in read-only mode

## Additional features available in the system

The system also supports additional functionality beyond the core workflow:

- Creating new users (parents, tutors, students)
- Approving or rejecting tutors as a manager
- Assigning students to tutors and parents
- Messaging between all roles (manager, tutor, parent, student)
- Creating and managing session bookings
- Editing user profile information (manager-level control)
- Tutors creating and editing session reports
- Managers creating reports for sessions if needed
- Students and parents viewing reports in read-only mode
- Demonstrating data persistence (e.g., updating profile details and verifying changes)
- Light and dark mode support


## Known limitations

This project is a functional prototype and intentionally simplifies certain areas to maintain clarity and reliability:

- messaging is REST-based rather than real-time
- there is no file upload or document storage
- report editing is centralised in a shared report page rather than distributed across multiple views
- some administrative operations are embedded within dashboards instead of being separated into many standalone pages

These decisions were made to prioritise a stable, explainable system within the scope of the assignment.

## Why this version is suitable for assessment

This implementation demonstrates key concepts expected in a full-stack university project:

- full-stack architecture (Vue + Node + MySQL)
- relational database design
- role-based access control
- reusable frontend structure
- clear end-to-end workflows
- well-scoped design decisions

The system prioritises clarity, stability, and explainability over unnecessary complexity, making it easier to demonstrate and justify in an assessment context.
