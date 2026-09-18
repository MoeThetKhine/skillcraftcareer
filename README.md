# SkillCraft Connect

# Build SkillCraft — AI-Powered Full-Stack Job Portal

Build a modern, responsive, **real-world full-stack job portal** called **SkillCraft**.

SkillCraft connects:

* **Job Seekers** → Find jobs, analyze skills, get AI recommendations, and apply.
* **Employers** → Create companies, post jobs, manage applicants, and update application status.
* **Admins** → Manage users, jobs, companies, applications, and platform activity.

The system must use a real backend architecture and a relational SQL Server database. Do **not** build this as a static frontend-only project.

# 1. Project Concept

SkillCraft is an AI-powered job discovery and recruitment platform.

The main flow is:

```text
Job Seeker
    ↓
Create Profile
    ↓
Add Skills
    ↓
Search Jobs
    ↓
View Job Details
    ↓
AI Skill Matching
    ↓
Get Recommendations
    ↓
Apply
    ↓
Track Application
```

Employer flow:

```text
Employer
    ↓
Create Company Profile
    ↓
Create Job
    ↓
Receive Applications
    ↓
Review Candidates
    ↓
Shortlist / Interview / Hire / Reject
```

Admin flow:

```text
Admin
    ↓
Dashboard
    ↓
Manage Users
Manage Companies
Manage Jobs
Manage Applications
    ↓
Monitor Platform
```

The project should feel like a real recruitment platform rather than a static UI demo.

---

# 2. Technology Stack

## Frontend

Use:

* React
* JavaScript
* React Router
* Modern CSS
* Axios or Fetch API
* Responsive design
* Reusable components

Frontend structure should separate:

```text
Pages
Components
Layouts
Services/API
Hooks
Context/State
Utils
```

---

# 3. Backend

The backend must be designed for:

```text
ASP.NET Core Web API
.NET 8 or later
Entity Framework Core
SQL Server
REST API
JWT Authentication
Role-Based Authorization
```

Use a clean and maintainable backend structure.

Recommended architecture:

```text
SkillCraft.API
│
├── Controllers
│
├── Services
│
├── Interfaces
│
├── DTOs
│
├── Entities
│
├── Data
│
├── Repositories / Data Access
│
├── Middleware
│
├── Authentication
│
├── AI
│
└── Common
```

Keep business logic out of controllers.

Use:

```text
Controller
    ↓
Service
    ↓
Data Access / EF Core
    ↓
SQL Server
```

---

# 4. Three User Roles

The system must support exactly three main roles:

```text
1. Job Seeker
2. Employer
3. Admin
```

Use role-based authorization.

---

# 5. Authentication

Implement a real authentication flow.

## Register

User selects:

```text
Job Seeker
Employer
```

Admin accounts should not be publicly registered.

Registration fields:

```text
Name
Email
Password
Role
```

Employer registration can additionally collect:

```text
Company Name
Company Description
Company Website
Company Location
```

## Login

```text
Email
Password
```

After login:

```text
Authentication
      ↓
Validate User
      ↓
Generate JWT
      ↓
Return Token + User Information + Role
      ↓
Frontend Stores Authentication State
```

Use JWT authentication.

Protect APIs according to role.

Example:

```text
[Authorize]
[Authorize(Roles = "JobSeeker")]
[Authorize(Roles = "Employer")]
[Authorize(Roles = "Admin")]
```

---

# 6. Role-Based Access

## Job Seeker can:

* Register
* Login
* Manage profile
* Add/remove skills
* Upload/store resume URL
* Search jobs
* Filter jobs
* View job details
* Calculate AI match
* View recommendations
* Save jobs
* Apply for jobs
* View applications
* Track application status

## Employer can:

* Register
* Login
* Manage company profile
* Create jobs
* Edit jobs
* Delete/deactivate jobs
* View posted jobs
* View applicants
* View applicant profiles
* See applicant skills
* See AI match percentage
* Shortlist applicants
* Move applicants to interview
* Mark applicants as hired
* Reject applications

## Admin can:

* Login
* View dashboard
* View users
* Activate/deactivate users
* View employers
* View companies
* View jobs
* Activate/deactivate jobs
* View applications
* Monitor platform statistics

---

# 7. Database Design

Use **SQL Server** with a properly normalized relational database.

Do NOT store all skills as one comma-separated string.

Use relationships between tables.

Recommended database:

```text
Users
Roles
UserRoles
JobSeekerProfiles
EmployerProfiles
Companies
Skills
UserSkills
Jobs
JobSkills
Applications
SavedJobs
ApplicationStatusHistory
```

---

# 8. Users Table

```text
Users
-----------------------
Id                  PK
Name
Email               UNIQUE
PasswordHash
IsActive
CreatedAt
UpdatedAt
```

Do not store plain-text passwords.

---

# 9. Roles Table

```text
Roles
-----------------------
Id                  PK
Name                UNIQUE
```

Seed:

```text
1 - JobSeeker
2 - Employer
3 - Admin
```

---

# 10. UserRoles Table

```text
UserRoles
-----------------------
UserId              FK
RoleId              FK
```

Relationship:

```text
Users
  ↓
UserRoles
  ↓
Roles
```

---

# 11. JobSeekerProfiles Table

```text
JobSeekerProfiles
-----------------------
Id                  PK
UserId              FK
Education
Experience
ResumeUrl
Bio
Location
ProfileImageUrl
CreatedAt
UpdatedAt
```

One user can have one job seeker profile.

---

# 12. EmployerProfiles Table

```text
EmployerProfiles
-----------------------
Id                  PK
UserId              FK
CompanyId            FK
Position
CreatedAt
UpdatedAt
```

---

# 13. Companies Table

```text
Companies
-----------------------
Id                  PK
Name
Description
Website
Location
LogoUrl
IsActive
CreatedAt
UpdatedAt
```

Relationship:

```text
Employer
    ↓
Company
    ↓
Jobs
```

---

# 14. Skills Table

Create a centralized skills table.

```text
Skills
-----------------------
Id                  PK
Name                UNIQUE
```

Example:

```text
C#
.NET
ASP.NET Core
React
JavaScript
Python
Java
SQL
Docker
AWS
Azure
Cyber Security
Machine Learning
```

---

# 15. UserSkills Table

Many-to-many relationship between users and skills.

```text
UserSkills
-----------------------
UserId              FK
SkillId             FK
SkillLevel
```

SkillLevel:

```text
Beginner
Intermediate
Advanced
Expert
```

Relationship:

```text
User
 ↓
UserSkills
 ↓
Skills
```

---

# 16. Jobs Table

```text
Jobs
-----------------------
Id                  PK
CompanyId            FK
CreatedBy            FK
Title
Description
Responsibilities
Location
SalaryMin
SalaryMax
JobType
ExperienceRequired
IsActive
CreatedAt
UpdatedAt
```

JobType:

```text
FullTime
PartTime
Internship
Contract
Remote
```

---

# 17. JobSkills Table

Many-to-many relationship between jobs and skills.

```text
JobSkills
-----------------------
JobId               FK
SkillId             FK
IsRequired
```

This allows the AI matching system to compare:

```text
UserSkills
     ↓
JobSkills
```

---

# 18. Applications Table

```text
Applications
-----------------------
Id                  PK
JobId               FK
JobSeekerId         FK
CoverLetter
ResumeUrl
Status
AppliedAt
UpdatedAt
```

Status:

```text
Applied
Shortlisted
Interview
Hired
Rejected
```

Add a unique constraint:

```text
(JobId, JobSeekerId)
```

This prevents duplicate applications.

---

# 19. SavedJobs Table

```text
SavedJobs
-----------------------
Id                  PK
UserId              FK
JobId               FK
SavedAt
```

Prevent duplicate saved jobs.

---

# 20. ApplicationStatusHistory

Track application status changes.

```text
ApplicationStatusHistory
-----------------------
Id                  PK
ApplicationId       FK
OldStatus
NewStatus
ChangedBy            FK
ChangedAt
```

Example:

```text
Applied
   ↓
Shortlisted
   ↓
Interview
   ↓
Hired
```

This makes the application system more realistic.

---

# 21. Database Relationships

Implement relationships similar to:

```text
Users
 │
 ├──────── UserRoles ──────── Roles
 │
 ├──────── JobSeekerProfiles
 │                │
 │                └──── UserSkills ──── Skills
 │
 └──────── EmployerProfiles
                   │
                   └──── Companies
                           │
                           └──── Jobs
                                  │
                                  ├──── JobSkills ──── Skills
                                  │
                                  └──── Applications
                                           │
                                           └──── ApplicationStatusHistory
```

---

# 22. Job Seeker Dashboard

After login, Job Seeker sees:

```text
Welcome back!

Profile Completion
████████░░ 80%

My Skills
C# | .NET | SQL | React | JavaScript

AI Recommended Jobs
5

Applied Jobs
3

Interview
1

Saved Jobs
4
```

Dashboard sections:

```text
Profile
My Skills
Recommended Jobs
Applications
Saved Jobs
```

---

# 23. Employer Dashboard

Employer dashboard:

```text
Welcome!

Total Jobs
8

Active Jobs
5

Total Applicants
42

Shortlisted
12

Interviews
6

Hired
2
```

Show:

```text
My Jobs
Applicants
Company Profile
```

Employer should be able to:

```text
Create Job
Edit Job
Deactivate Job
View Applicants
Update Application Status
```

---

# 24. Admin Dashboard

Admin dashboard should show:

```text
Total Users
Total Job Seekers
Total Employers
Total Companies
Total Jobs
Active Jobs
Total Applications
```

Example:

```text
Users: 250

Job Seekers: 210

Employers: 35

Companies: 30

Active Jobs: 85

Applications: 630
```

Admin pages:

```text
Users
Employers
Companies
Jobs
Applications
```

Keep the admin dashboard simple.

Do NOT create unnecessary complicated admin features.

---

# 25. Home Page

Hero:

# SkillCraft

## Build Skills. Find Opportunities.

Subtitle:

```text
Discover jobs that match your skills with intelligent job recommendations.
```

Include:

```text
Search Jobs
Location
Find Jobs
```

Also show:

```text
Popular Skills
Featured Jobs
Popular Job Categories
```

---

# 26. Job Search

Search by:

```text
Keyword
Location
Skill
Job Type
Experience
Salary
```

Keyword should search:

```text
Job Title
Company
Skills
Description
Location
```

Example:

```text
React
```

returns:

```text
React Developer
Frontend Developer
Full Stack Developer
```

---

# 27. Job Details

Display:

```text
Job Title
Company
Location
Salary
Job Type
Experience
Description
Responsibilities
Required Skills
Posted Date
```

For logged-in Job Seekers:

```text
AI Match Score
Matching Skills
Missing Skills
```

Buttons:

```text
Apply Now
Save Job
```

Employers should not see the Apply button.

---

# 28. AI Skill Matching

Create an explainable matching system.

Do not create complicated machine learning.

Algorithm:

```text
Get Job Seeker Skills
        ↓
Get Job Required Skills
        ↓
Compare Skills
        ↓
Find Matching Skills
        ↓
Find Missing Skills
        ↓
Calculate Percentage
```

Formula:

```text
Match Percentage =
Matching Skills / Required Skills × 100
```

Example:

User:

```text
C#
.NET
SQL
React
```

Job:

```text
C#
.NET
SQL
Python
```

Result:

```text
75%
```

Response:

```json
{
  "matchPercentage": 75,
  "matchingSkills": [
    "C#",
    ".NET",
    "SQL"
  ],
  "missingSkills": [
    "Python"
  ]
}
```

---

# 29. AI Recommendation System

Create an API that recommends jobs based on the user's skills.

Logic:

```text
User Skills
      ↓
Get Active Jobs
      ↓
Compare User Skills with Job Skills
      ↓
Calculate Match Score
      ↓
Sort by Match Percentage
      ↓
Return Top 5 Jobs
```

Example:

```text
Backend Developer
90%

.NET Developer
87%

Full Stack Developer
75%

React Developer
70%
```

Do not claim this is a trained machine-learning model.

Present it as:

**AI-powered skill matching and recommendation.**

The MVP should prioritize an explainable algorithm.

---

# 30. Application Flow

When a Job Seeker clicks:

```text
Apply Now
```

Backend:

```text
Authenticate User
        ↓
Check Role = JobSeeker
        ↓
Check Job Exists
        ↓
Check Job Is Active
        ↓
Check User Exists
        ↓
Check Existing Application
        ↓
Create Application
        ↓
Status = Applied
        ↓
Save to SQL Server
```

If already applied:

```text
You have already applied for this job.
```

---

# 31. Employer Application Flow

Employer opens:

```text
My Jobs
    ↓
Select Job
    ↓
View Applicants
```

Applicant card:

```text
John Doe

Skills:
C#
.NET
SQL
React

AI Match:
87%

Application:
Applied
```

Employer can change:

```text
Applied
↓
Shortlisted
↓
Interview
↓
Hired
```

or:

```text
Rejected
```

Every status change should be stored in:

```text
ApplicationStatusHistory
```

---

# 32. REST API Design

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

---

## User APIs

```http
GET /api/users/me
GET /api/users/{id}
PUT /api/users/{id}
```

---

## Job Seeker Profile APIs

```http
GET /api/jobseekers/profile
PUT /api/jobseekers/profile
GET /api/jobseekers/skills
POST /api/jobseekers/skills
DELETE /api/jobseekers/skills/{skillId}
```

---

## Skill APIs

```http
GET /api/skills
GET /api/skills/search?keyword=react
```

---

## Company APIs

```http
GET /api/companies/{id}
POST /api/companies
PUT /api/companies/{id}
```

---

## Job APIs

```http
GET /api/jobs
GET /api/jobs/{id}
GET /api/jobs/search
POST /api/jobs
PUT /api/jobs/{id}
DELETE /api/jobs/{id}
PATCH /api/jobs/{id}/status
```

Search example:

```http
GET /api/jobs?keyword=react&location=Bangalore&jobType=FullTime
```

---

## Application APIs

```http
POST /api/applications
GET /api/applications/my
GET /api/applications/{id}
PATCH /api/applications/{id}/status
```

Employer:

```http
GET /api/employer/jobs/{jobId}/applications
```

---

## Saved Job APIs

```http
POST /api/saved-jobs/{jobId}
DELETE /api/saved-jobs/{jobId}
GET /api/saved-jobs
```

---

# 33. AI APIs

```http
GET /api/ai/match/{jobId}
GET /api/ai/recommendations
```

The backend should obtain the authenticated user's ID from the JWT rather than trusting a user ID supplied by the frontend.

Example:

```http
GET /api/ai/match/25
```

Response:

```json
{
  "jobId": 25,
  "matchPercentage": 85,
  "matchingSkills": [
    "C#",
    ".NET",
    "SQL"
  ],
  "missingSkills": [
    "Docker"
  ]
}
```

---

# 34. Admin APIs

```http
GET /api/admin/dashboard
GET /api/admin/users
PATCH /api/admin/users/{id}/status
GET /api/admin/jobs
PATCH /api/admin/jobs/{id}/status
GET /api/admin/companies
GET /api/admin/applications
```

All admin endpoints must require:

```text
Role = Admin
```

---

# 35. Backend Validation

Implement server-side validation.

Examples:

```text
Email must be valid
Email must be unique
Password must meet minimum requirements
Job title is required
Job description is required
Salary must be valid
Job must contain required skills
User cannot apply twice
Inactive jobs cannot receive applications
Employer can only modify their own jobs
Job Seeker cannot create jobs
Job Seeker cannot modify another user's profile
Employer cannot access another employer's private job management
Admin has platform-level management permissions
```

Never trust frontend validation alone.

---

# 36. Security

Implement basic real-world security:

```text
JWT Authentication
Password Hashing
Role-Based Authorization
Input Validation
Authorization Checks
CORS
Global Exception Handling
```

Never store:

```text
Plain Password
```

Do not expose:

```text
PasswordHash
```

through APIs.

---

# 37. Error Handling

Backend should return consistent responses.

Example:

```json
{
  "success": false,
  "message": "You have already applied for this job."
}
```

Handle:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

Frontend should display user-friendly messages.

---

# 38. Frontend API Integration

Do not hardcode job/application data inside React components.

Use an API service layer.

Example:

```text
src/
│
├── api/
│   ├── authApi.js
│   ├── jobApi.js
│   ├── userApi.js
│   ├── applicationApi.js
│   ├── companyApi.js
│   └── aiApi.js
│
├── components/
├── pages/
├── layouts/
├── hooks/
├── context/
└── utils/
```

Frontend flow:

```text
React Page
    ↓
API Service
    ↓
ASP.NET Core API
    ↓
Service Layer
    ↓
EF Core
    ↓
SQL Server
```

---

# 39. Protected Routes

Create role-based frontend routes.

Example:

```text
/public
    /
    /jobs
    /jobs/:id

/job-seeker
    /dashboard
    /profile
    /recommendations
    /applications
    /saved-jobs

/employer
    /dashboard
    /company
    /jobs
    /jobs/create
    /jobs/:id/edit
    /jobs/:id/applicants

/admin
    /dashboard
    /users
    /companies
    /jobs
    /applications
```

Unauthenticated users should be redirected to login when accessing protected pages.

---

# 40. Sample Data

Create realistic seed data.

At minimum:

### Job Seekers

Create 3–5 demo job seekers.

### Employers

Create 2–3 demo employers.

### Companies

Create companies such as:

```text
Tech Solutions
CloudNova
CyberSecure Labs
DataWorks
FinTech Systems
```

### Jobs

Create at least 10 realistic jobs:

```text
Software Engineer
Backend Developer
Frontend Developer
Full Stack Developer
.NET Developer
React Developer
Data Analyst
Cyber Security Analyst
Python Developer
AI/ML Intern
```

Each job should have realistic:

```text
Description
Responsibilities
Location
Salary
Experience
Job Type
Required Skills
Company
```

---

# 41. Demo Accounts

Create development/demo accounts.

Example:

```text
Job Seeker

Email:
seeker@skillcraft.com

Role:
JobSeeker
```

```text
Employer

Email:
employer@skillcraft.com

Role:
Employer
```

```text
Admin

Email:
admin@skillcraft.com

Role:
Admin
```

Use development-safe demo passwords and clearly document them.

---

# 42. Main Navigation

Public:

```text
SkillCraft

Home
Jobs
Login
Register
```

Job Seeker:

```text
SkillCraft

Home
Jobs
AI Recommendations
Applications
Saved Jobs
Profile
Logout
```

Employer:

```text
SkillCraft

Dashboard
My Jobs
Applicants
Company
Logout
```

Admin:

```text
SkillCraft

Dashboard
Users
Companies
Jobs
Applications
Logout
```

---

# 43. UI/UX

Create an original technology/career platform identity.

Brand:

**SkillCraft**

Tagline:

**Build Skills. Find Opportunities.**

Design:

```text
Modern
Clean
Professional
Minimal
Technology-focused
Responsive
```

Use:

```text
Cards
Skill badges
Status badges
Progress indicators
Match percentage
Tables
Dashboard statistics
Forms
Modal dialogs where useful
Loading states
Empty states
Error states
```

Do not copy JobNet's exact branding, layout, colors, or UI.

Create an original SkillCraft design.

---

# 44. Important Job Seeker Demo Flow

```text
Register
 ↓
Login
 ↓
Create Profile
 ↓
Add Skills
 ↓
Home
 ↓
Search "React"
 ↓
Job Listings
 ↓
Open Job
 ↓
AI Skill Match
 ↓
90% Match
 ↓
Matching Skills
 ↓
Missing Skills
 ↓
Apply
 ↓
Application Created
 ↓
Applications
 ↓
Status = Applied
```

---

# 45. Important Employer Demo Flow

```text
Register as Employer
 ↓
Create Company
 ↓
Employer Dashboard
 ↓
Create Job
 ↓
Add Required Skills
 ↓
Publish Job
 ↓
Job Appears in Job Listings
 ↓
Job Seeker Applies
 ↓
Employer Opens Applicants
 ↓
View Candidate
 ↓
View Skills
 ↓
View AI Match
 ↓
Shortlist
 ↓
Interview
 ↓
Hire
```

---

# 46. Important Admin Demo Flow

```text
Admin Login
 ↓
Admin Dashboard
 ↓
View Users
 ↓
View Employers
 ↓
View Companies
 ↓
View Jobs
 ↓
Activate / Deactivate Jobs
 ↓
View Applications
 ↓
Monitor Platform Statistics
```

---

# 47. Dashboard Statistics

Job Seeker:

```text
Applied Jobs
Saved Jobs
Recommended Jobs
Profile Completion
```

Employer:

```text
Active Jobs
Total Applicants
Shortlisted
Interviews
Hired
```

Admin:

```text
Total Users
Job Seekers
Employers
Companies
Jobs
Applications
```

Statistics should come from backend APIs/database, not hardcoded values.

---

# 48. Important Architecture Rule

This is NOT a static frontend project.

The application should follow:

```text
React
   ↓
REST API
   ↓
ASP.NET Core
   ↓
Business Logic
   ↓
Entity Framework Core
   ↓
SQL Server
```

All important operations should be persisted in SQL Server.

For example:

```text
Register User
      ↓
SQL Server

Create Job
      ↓
SQL Server

Add Skill
      ↓
SQL Server

Apply Job
      ↓
SQL Server

Change Application Status
      ↓
SQL Server
```

After refreshing the page, data must still exist.

---

# 49. Important Backend Business Logic

Implement actual backend logic for:

```text
Registration
Login
JWT generation
Role authorization
Profile management
Skill management
Company management
Job creation
Job editing
Job activation/deactivation
Job search
Job filtering
Job applications
Duplicate application prevention
Saved jobs
Application status updates
Application history
AI skill matching
AI recommendations
Dashboard statistics
```

Do not implement these only on the frontend.

---

# 50. AI Architecture

Keep AI logic separated from normal business logic.

Example:

```text
AIController
      ↓
AIRecommendationService
      ↓
SkillMatchingService
      ↓
UserSkills + JobSkills
      ↓
Match Calculation
```

This allows a future version to replace the rule-based matching algorithm with:

```text
Machine Learning
LLM
Embedding Search
Vector Database
```

without redesigning the entire application.

For the MVP, use the explainable skill matching algorithm.

---

# 51. API Response Design

Use DTOs rather than exposing database entities directly.

Example Job DTO:

```json
{
  "id": 10,
  "title": "Backend Developer",
  "company": "Tech Solutions",
  "location": "Bangalore",
  "salaryMin": 600000,
  "salaryMax": 1000000,
  "jobType": "FullTime",
  "skills": [
    "C#",
    ".NET",
    "SQL",
    "REST API"
  ]
}
```

---

# 52. Loading and Empty States

Add proper UI states.

Loading:

```text
Loading jobs...
```

No jobs:

```text
No jobs found.
Try changing your search or filters.
```

No applications:

```text
You haven't applied for any jobs yet.
```

No recommendations:

```text
Add more skills to your profile to receive better recommendations.
```

---

# 53. Responsive Design

The website must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

Ensure:

```text
Navbar
Job Cards
Dashboard
Tables
Forms
Filters
```

are responsive.

---

# 54. Final MVP Priority

Prioritize these features first:

### Priority 1 — Core

```text
Authentication
3 Roles
Job Search
Job Details
Job Creation
Applications
Application Status
SQL Server
REST APIs
```

### Priority 2 — Differentiator

```text
Skill Management
AI Match Percentage
AI Recommendations
```

### Priority 3 — Management

```text
Employer Dashboard
Admin Dashboard
Saved Jobs
Application History
```

Do NOT spend time on:

```text
Chat
Payments
Social Networking
Complex Microservices
Email Notifications
Video Interviews
Advanced ML
Complex Recommendation Models
Complicated Analytics
```

---

# 55. Final Project Goal

The final application should demonstrate a genuine full-stack recruitment platform:

```text
                 SKILLCRAFT
                     │
       ┌─────────────┼─────────────┐
       │             │             │
   JOB SEEKER     EMPLOYER       ADMIN
       │             │             │
       ↓             ↓             ↓
   Find Jobs      Post Jobs     Manage Platform
       │             │
       ↓             ↓
   Add Skills     Applicants
       │             │
       ↓             ↓
   AI Matching    AI Candidate Match
       │             │
       ↓             ↓
    Apply       Update Status
       │             │
       └───────┬─────┘
               ↓
          SQL SERVER
```

The most important differentiator is:

**SkillCraft doesn't only show jobs — it compares a candidate's skills with job requirements and explains why the job matches.**

Build the application as a real full-stack MVP with:

```text
React
+
ASP.NET Core Web API
+
Entity Framework Core
+
SQL Server
+
JWT Authentication
+
Role-Based Authorization
+
AI Skill Matching
```

Make the code modular, maintainable, and easy to extend.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://skillcraftcareer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a55610b3-cb2b-5673-b7cf-59f692a6d435).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
