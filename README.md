# Job Portal — Full-Stack Web Application

A full-stack job portal that connects job seekers with recruiters through role-based access, job listings, applications, and recruiter–candidate communication.

## Features

- **Authentication & Authorization:** User registration, login, JWT authentication, and role-based access.
- **Job Seeker Profiles:** Manage profile information and skills.
- **Recruiter & Company Management:** Company profiles and recruiter job management.
- **Job Listings:** Browse jobs and view job details.
- **Job Applications:** Apply for jobs and track application status.
- **Recruiter Dashboard:** Manage job listings and review applications.
- **Saved Jobs:** Save jobs for later.
- **Notifications:** Application-related notifications.
- **Messaging:** Communication between recruiters and job seekers.
- **Protected Routes:** Access control for authenticated users.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| API Testing | Postman |
| Version Control | Git, GitHub |

## Project Structure

```text
job-portal/
├── database/
│   └── schema.sql
├── src/
│   ├── config/
│   ├── middleware/
│   ├── app.js
│   └── server.js
├── job-portal-frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/harshitrajput583/job-portal.git
cd job-portal
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using the variable names expected by `src/config/db.js` and the backend authentication code.

Use your own PostgreSQL credentials and JWT secret. Never commit real credentials or secrets to GitHub.

### 4. Set up PostgreSQL

Create a database, then execute `database/schema.sql` against that database. Configure your `.env` file to match your database setup.

### 5. Start the backend

```bash
npm run dev
```

### 6. Start the frontend

Open a second terminal:

```bash
cd job-portal-frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Security

- Password hashing with bcrypt.
- JWT-based authentication.
- Role-based access control.
- Protected API routes and ownership checks.
- Environment variables for sensitive configuration.

## Future Improvements

- Deploy the frontend and backend.
- Add automated tests and continuous integration.
- Improve monitoring, logging, and API documentation.

## Author

**Harshit Rajput**

GitHub: [harshitrajput583](https://github.com/harshitrajput583)

## License

No license has been specified for this project yet.


