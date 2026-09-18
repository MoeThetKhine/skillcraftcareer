# SkillCraft — ASP.NET Core Web API + SQL Server Specification

> Companion to the React frontend in this repository. The frontend currently talks to Lovable Cloud through a typed API service layer (`src/lib/api/*`). Every server function there maps 1:1 to a REST endpoint below, so the same UI can be pointed at this .NET backend by swapping the service layer.

Tagline: **Build Skills. Find Opportunities.**

---

## 1. Solution layout

```text
SkillCraft.sln
├── SkillCraft.Api/            ASP.NET Core 8 Web API (controllers, middleware, DI)
├── SkillCraft.Application/    Services, DTOs, validators, interfaces, AI matching service
├── SkillCraft.Domain/         Entities, enums
├── SkillCraft.Infrastructure/ EF Core DbContext, configurations, migrations, repositories, seeding
└── SkillCraft.Tests/          xUnit tests (services + matching)
```

Packages: `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `FluentValidation.AspNetCore`, `BCrypt.Net-Next`, `Swashbuckle.AspNetCore`.

---

## 2. Domain model (SQL Server)

All tables use `INT IDENTITY` primary keys, `DATETIME2` timestamps (UTC), and `IsActive`/`CreatedAt` where relevant. Skills are **never** stored as comma-separated strings — always via join tables.

| Table | Columns | Notes |
| --- | --- | --- |
| Users | Id, FullName, Email (unique), **PasswordHash**, IsActive, CreatedAt, UpdatedAt | PasswordHash is BCrypt; never serialized |
| Roles | Id, Name (unique) | Seed: JobSeeker, Employer, Admin |
| UserRoles | UserId FK, RoleId FK | composite PK (UserId, RoleId) |
| JobSeekerProfiles | Id, UserId FK (unique), Bio, Location, Education, Experience, ResumeUrl, UpdatedAt | 1:1 with Users |
| Companies | Id, Name, Description, Website, Location, LogoUrl, IsActive, CreatedAt | |
| EmployerProfiles | Id, UserId FK (unique), CompanyId FK, Position | 1:1 Users, N:1 Companies |
| Skills | Id, Name (unique), Category | |
| UserSkills | UserId FK, SkillId FK, Level (enum) | composite PK |
| Jobs | Id, CompanyId FK, CreatedByUserId FK, Title, Description, Responsibilities, Location, SalaryMin, SalaryMax, JobType (enum), ExperienceRequired, IsActive, CreatedAt, UpdatedAt | |
| JobSkills | JobId FK, SkillId FK, IsRequired | composite PK |
| Applications | Id, JobId FK, JobSeekerId FK (Users), CoverLetter, Status (enum), AppliedAt, UpdatedAt | **UNIQUE (JobId, JobSeekerId)** |
| SavedJobs | Id, UserId FK, JobId FK, SavedAt | UNIQUE (UserId, JobId) |
| ApplicationStatusHistory | Id, ApplicationId FK, OldStatus (nullable), NewStatus, ChangedByUserId FK, ChangedAt, Note | append-only |

Enums (stored as `NVARCHAR` via `HasConversion<string>()`):

- `SkillLevel`: Beginner, Intermediate, Advanced, Expert
- `JobType`: FullTime, PartTime, Internship, Contract, Remote
- `ApplicationStatus`: Applied, Shortlisted, Interview, Hired, Rejected

Indexes: `IX_Jobs_IsActive_CreatedAt`, `IX_Applications_JobSeekerId`, `IX_Applications_JobId_Status`, `IX_JobSkills_SkillId`.

### EF Core configuration highlights

```csharp
builder.Entity<Application>()
    .HasIndex(a => new { a.JobId, a.JobSeekerId }).IsUnique();

builder.Entity<UserSkill>().HasKey(us => new { us.UserId, us.SkillId });
builder.Entity<JobSkill>().HasKey(js => new { js.JobId, js.SkillId });

builder.Entity<Job>().Property(j => j.JobType).HasConversion<string>().HasMaxLength(20);
builder.Entity<Application>().Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
```

Cascade rules: deleting a Job cascades JobSkills, Applications, SavedJobs. Deleting a User cascades profiles, UserSkills, SavedJobs; Applications use `Restrict` (deactivate users instead).

---

## 3. Authentication & authorization

- Register: `POST /api/auth/register` → hash password with BCrypt (work factor 11), create User + UserRole (JobSeeker or Employer only — **Admin can never be self-registered**). Employers also create Company + EmployerProfile in the same transaction.
- Login: `POST /api/auth/login` → verify hash, issue JWT (HS256, 60 min) with claims `sub`, `email`, `name`, `role` (one per role). Refresh: `POST /api/auth/refresh` with a rotating refresh token stored hashed in `RefreshTokens` table (optional for MVP).
- `[Authorize(Roles = "Admin")]` on every `AdminController` action. `[Authorize(Roles = "Employer")]` for job management; `[Authorize(Roles = "JobSeeker")]` for applying.
- Ownership checks in services: an employer can only edit jobs whose `CompanyId` equals their `EmployerProfile.CompanyId`; an applicant can only read their own applications.
- Passwords are never returned; `UserDto` excludes `PasswordHash`.

---

## 4. REST API

Base URL `/api`. All responses JSON. Errors use one DTO:

```json
{ "status": 400, "error": "ValidationFailed", "message": "Title is required", "details": { "title": ["Title is required"] }, "traceId": "..." }
```

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| POST | /auth/register | public | Create seeker/employer |
| POST | /auth/login | public | JWT |
| GET | /auth/me | any | Current user, roles, profile summary |
| GET/PUT | /users/me | any | Basic account fields |
| GET/PUT | /profiles/job-seeker | JobSeeker | Own profile |
| GET/PUT | /profiles/employer | Employer | Own employer profile |
| GET | /skills | public | Skill catalog (`?q=`) |
| GET/PUT | /users/me/skills | JobSeeker | Replace own skill set `[{skillId, level}]` |
| GET | /companies, /companies/{id} | public | |
| POST/PUT | /companies | Employer | Create/update own company |
| GET | /jobs | public | Search: `keyword, location, jobType, skill, experience, salaryMin, page, pageSize` |
| GET | /jobs/{id} | public | Job + company + skills |
| POST | /jobs | Employer | Create with `skillIds[]` |
| PUT | /jobs/{id} | Employer | Update (skills replaced) |
| PATCH | /jobs/{id}/status | Employer/Admin | `{ isActive }` |
| GET | /jobs/mine | Employer | Own jobs + applicant counts |
| GET | /jobs/{id}/applicants | Employer | Applicants + skills + match + history |
| POST | /applications | JobSeeker | `{ jobId, coverLetter }` — 409 if duplicate, 400 if job inactive |
| GET | /applications/mine | JobSeeker | Own applications + status history |
| PATCH | /applications/{id}/status | Employer | `{ status, note }` → appends history |
| GET/POST/DELETE | /saved-jobs, /saved-jobs/{jobId} | JobSeeker | |
| GET | /ai/match/{jobId} | JobSeeker | Match breakdown for current user |
| GET | /ai/recommendations?top=5 | JobSeeker | Top-N active jobs by match |
| GET | /admin/dashboard | Admin | Counts |
| GET/PATCH | /admin/users, /admin/users/{id}/status | Admin | List / activate-deactivate |
| GET/PATCH | /admin/companies, /admin/companies/{id}/status | Admin | |
| GET/PATCH | /admin/jobs, /admin/jobs/{id}/status | Admin | |
| GET | /admin/applications | Admin | Cross-platform list |

Paging envelope: `{ items, page, pageSize, total }`.

### Key DTOs

```csharp
record JobDto(int Id, string Title, string Description, string? Responsibilities, string Location,
    decimal? SalaryMin, decimal? SalaryMax, string JobType, string? ExperienceRequired,
    bool IsActive, DateTime CreatedAt, CompanySummaryDto Company, IReadOnlyList<string> Skills);

record ApplicationDto(int Id, int JobId, string JobTitle, string Company, string Status,
    DateTime AppliedAt, IReadOnlyList<StatusHistoryDto> History);

record MatchResultDto(int JobId, int Percentage, IReadOnlyList<string> MatchingSkills,
    IReadOnlyList<string> MissingSkills, string Explanation);
```

---

## 5. AI matching (explainable, rule-based — no trained model)

Lives in `SkillCraft.Application/Ai/SkillMatchingService.cs`, separate from business services.

```csharp
public MatchResultDto Match(IReadOnlyCollection<int> userSkillIds, Job job)
{
    var required = job.JobSkills.Select(s => s.SkillId).ToHashSet();
    if (required.Count == 0) return new(job.Id, 0, [], [], "This job lists no required skills.");
    var matching = required.Intersect(userSkillIds).ToList();
    var pct = (int)Math.Round(100.0 * matching.Count / required.Count);
    ...
}
```

- `matchPercentage = matchingSkills / requiredSkills × 100` (rounded)
- Recommendations: compute match for every active job the user hasn't applied to, order by percentage desc then `CreatedAt` desc, take 5.
- Label bands: ≥80 Strong match, 50–79 Good match, 25–49 Partial, <25 Low. Always present as "skill-based matching", never as machine learning.

---

## 6. Cross-cutting

- **Validation**: FluentValidation validators per request DTO; `ValidationFilter` converts to the error DTO (400).
- **Global exception middleware**: maps `NotFoundException`→404, `ForbiddenException`→403, `ConflictException`→409, anything else→500 with `traceId`; logs with `ILogger`.
- **CORS**: named policy `Frontend` allowing the React origin(s) from `appsettings`.
- **Swagger** with JWT bearer auth in Development.
- **Transactions**: register-employer, create-job-with-skills, and status-change-with-history run in `IDbContextTransaction`.

---

## 7. Seed data (`DbSeeder.SeedAsync`)

Idempotent — runs at startup when tables are empty.

- Roles: JobSeeker, Employer, Admin
- Skills (30): C#, ASP.NET Core, Entity Framework, SQL Server, React, TypeScript, JavaScript, Node.js, Python, Java, Spring Boot, Angular, Azure, AWS, Docker, Kubernetes, REST APIs, Git, HTML, CSS, Tailwind CSS, PostgreSQL, MongoDB, Redis, Machine Learning, Data Analysis, Power BI, Cyber Security, Networking, Linux
- Companies: Tech Solutions, CloudNova, CyberSecure Labs, DataWorks, FinTech Systems
- Users (password for all: `SkillCraft123!`, hashed):
  - seeker@skillcraft.com (Priya Sharma), rahul@skillcraft.com (Rahul Verma), anita@skillcraft.com (Anita Desai) — JobSeeker, each with 4–6 UserSkills and a profile
  - employer@skillcraft.com (Arjun Mehta, Tech Solutions, Head of Engineering), hr@cloudnova.com (Employer, CloudNova)
  - admin@skillcraft.com — Admin
- Jobs (12) across the five companies with 3–6 JobSkills each (e.g. Backend Developer / .NET, React Frontend Engineer, Cloud Engineer, Security Analyst, Data Analyst, Full Stack Developer, DevOps Intern, …)
- Applications: a few sample rows with history (Applied → Shortlisted) for demo dashboards

---

## 8. Configuration

```json
"ConnectionStrings": { "Default": "Server=.;Database=SkillCraft;Trusted_Connection=True;TrustServerCertificate=True" },
"Jwt": { "Issuer": "SkillCraft", "Audience": "SkillCraft.Web", "Key": "<32+ char secret from user-secrets>", "ExpiresMinutes": 60 },
"Cors": { "Origins": ["http://localhost:5173"] }
```

Secrets via `dotnet user-secrets` locally and environment variables in production. Run: `dotnet ef database update` then `dotnet run --project SkillCraft.Api`.

---

## 9. Frontend contract mapping

| Frontend service (`src/lib/api`) | .NET endpoint |
| --- | --- |
| `getMe` | GET /auth/me |
| `searchJobs`, `getJob`, `getFeaturedJobs`, `listSkills` | GET /jobs, /jobs/{id}, /jobs?pageSize=6, /skills |
| `listMyJobs`, `getMyJob`, `createJob`, `updateJob`, `setJobStatus` | GET /jobs/mine, GET /jobs/{id}, POST /jobs, PUT /jobs/{id}, PATCH /jobs/{id}/status |
| `applyToJob`, `listMyApplications`, `listJobApplicants`, `updateApplicationStatus` | POST /applications, GET /applications/mine, GET /jobs/{id}/applicants, PATCH /applications/{id}/status |
| `getSeekerDashboard`, `getEmployerDashboard`, `saveCompany` | GET /profiles/job-seeker + /applications/mine, GET /jobs/mine, POST/PUT /companies |
| `getAdminDashboard`, `adminListJobs` | GET /admin/dashboard, GET /admin/jobs |
