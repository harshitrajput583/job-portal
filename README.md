\# Job Portal Application



A full-stack job portal built with Node.js, Express.js, PostgreSQL, and React.



\## Features



\- User registration and login

\- Role-based access for job seekers and recruiters

\- Job seeker profiles and skills management

\- Company and job management

\- Job applications and application status tracking

\- Saved jobs and notifications

\- Recruiter-job seeker messaging

\- JWT authentication and password hashing



\## Tech Stack



\*\*Backend:\*\* Node.js, Express.js  

\*\*Database:\*\* PostgreSQL  

\*\*Authentication:\*\* JWT, bcrypt  

\*\*Frontend:\*\* React, Vite



\## Project Structure



\- `src/` — Backend application

\- `database/schema.sql` — Database schema

\- `job-portal-frontend/` — React frontend



\## Setup



1\. Install Node.js and PostgreSQL.

2\. Clone this repository.

3\. Run `npm install` in the root folder.

4\. Create a `.env` file using the environment variable names required by the backend configuration.

5\. Create the PostgreSQL database and apply `database/schema.sql`.

6\. Start the backend using `npm run dev`.

7\. In another terminal, open `job-portal-frontend/`, run `npm install`, then `npm run dev`.



Never commit `.env` files, passwords, or authentication secrets.

