-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('job_seeker', 'employer', 'admin');
CREATE TYPE public.skill_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Expert');
CREATE TYPE public.job_type AS ENUM ('FullTime', 'PartTime', 'Internship', 'Contract', 'Remote');
CREATE TYPE public.application_status AS ENUM ('Applied', 'Shortlisted', 'Interview', 'Hired', 'Rejected');

-- ===== Profiles (Users) =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== Companies =====
CREATE TABLE public.companies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  location TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ===== Employer profiles =====
CREATE TABLE public.employer_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.employer_profiles TO authenticated;
GRANT ALL ON public.employer_profiles TO service_role;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.employer_company_id(_user_id UUID)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.employer_profiles WHERE user_id = _user_id
$$;

-- ===== Job seeker profiles =====
CREATE TABLE public.job_seeker_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  education TEXT,
  experience TEXT,
  resume_url TEXT,
  bio TEXT,
  location TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.job_seeker_profiles TO authenticated;
GRANT ALL ON public.job_seeker_profiles TO service_role;
ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;

-- ===== Skills =====
CREATE TABLE public.skills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_skills (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  skill_level public.skill_level NOT NULL DEFAULT 'Intermediate',
  PRIMARY KEY (user_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills TO authenticated;
GRANT ALL ON public.user_skills TO service_role;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- ===== Jobs =====
CREATE TABLE public.jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibilities TEXT,
  location TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  job_type public.job_type NOT NULL DEFAULT 'FullTime',
  experience_required TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX jobs_company_idx ON public.jobs(company_id);
CREATE INDEX jobs_active_idx ON public.jobs(is_active, created_at DESC);

CREATE TABLE public.job_skills (
  job_id BIGINT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (job_id, skill_id)
);
GRANT SELECT ON public.job_skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_skills TO authenticated;
GRANT ALL ON public.job_skills TO service_role;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_job_owner(_user_id UUID, _job_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.employer_profiles ep ON ep.company_id = j.company_id
    WHERE j.id = _job_id AND ep.user_id = _user_id
  )
$$;

-- ===== Applications =====
CREATE TABLE public.applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_seeker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  resume_url TEXT,
  status public.application_status NOT NULL DEFAULT 'Applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, job_seeker_id)
);
GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX applications_job_idx ON public.applications(job_id);
CREATE INDEX applications_seeker_idx ON public.applications(job_seeker_id);

CREATE OR REPLACE FUNCTION public.is_applicant_to_my_jobs(_employer_id UUID, _seeker_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.employer_profiles ep ON ep.company_id = j.company_id
    WHERE a.job_seeker_id = _seeker_id AND ep.user_id = _employer_id
  )
$$;

CREATE TABLE public.application_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status public.application_status,
  new_status public.application_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- ===== Saved jobs =====
CREATE TABLE public.saved_jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jsp_updated BEFORE UPDATE ON public.job_seeker_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ep_updated BEFORE UPDATE ON public.employer_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== RLS Policies =====
-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employers read applicant profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_applicant_to_my_jobs(auth.uid(), id));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users self-assign non-admin role once" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin' AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));

-- companies
CREATE POLICY "Anyone reads active companies" ON public.companies FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Employers read own company" ON public.companies FOR SELECT TO authenticated USING (id = public.employer_company_id(auth.uid()));
CREATE POLICY "Admins read all companies" ON public.companies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employers create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'employer'));
CREATE POLICY "Employers update own company" ON public.companies FOR UPDATE TO authenticated USING (id = public.employer_company_id(auth.uid()));
CREATE POLICY "Admins update companies" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- employer_profiles
CREATE POLICY "Employer reads own employer profile" ON public.employer_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employer inserts own employer profile" ON public.employer_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'employer'));
CREATE POLICY "Employer updates own employer profile" ON public.employer_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- job_seeker_profiles
CREATE POLICY "Seeker reads own profile" ON public.job_seeker_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_applicant_to_my_jobs(auth.uid(), user_id));
CREATE POLICY "Seeker inserts own profile" ON public.job_seeker_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'job_seeker'));
CREATE POLICY "Seeker updates own profile" ON public.job_seeker_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- skills
CREATE POLICY "Anyone reads skills" ON public.skills FOR SELECT TO anon, authenticated USING (true);

-- user_skills
CREATE POLICY "Users read own skills" ON public.user_skills FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_applicant_to_my_jobs(auth.uid(), user_id));
CREATE POLICY "Users manage own skills insert" ON public.user_skills FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own skills update" ON public.user_skills FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own skills delete" ON public.user_skills FOR DELETE TO authenticated USING (user_id = auth.uid());

-- jobs
CREATE POLICY "Anyone reads active jobs" ON public.jobs FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Employers read own company jobs" ON public.jobs FOR SELECT TO authenticated USING (company_id = public.employer_company_id(auth.uid()));
CREATE POLICY "Admins read all jobs" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employers create jobs for own company" ON public.jobs FOR INSERT TO authenticated WITH CHECK (company_id = public.employer_company_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Employers update own company jobs" ON public.jobs FOR UPDATE TO authenticated USING (company_id = public.employer_company_id(auth.uid()));
CREATE POLICY "Employers delete own company jobs" ON public.jobs FOR DELETE TO authenticated USING (company_id = public.employer_company_id(auth.uid()));
CREATE POLICY "Admins update jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- job_skills
CREATE POLICY "Anyone reads job skills" ON public.job_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Employers insert job skills" ON public.job_skills FOR INSERT TO authenticated WITH CHECK (public.is_job_owner(auth.uid(), job_id));
CREATE POLICY "Employers delete job skills" ON public.job_skills FOR DELETE TO authenticated USING (public.is_job_owner(auth.uid(), job_id));

-- applications
CREATE POLICY "Seekers read own applications" ON public.applications FOR SELECT TO authenticated USING (job_seeker_id = auth.uid());
CREATE POLICY "Employers read applications to own jobs" ON public.applications FOR SELECT TO authenticated USING (public.is_job_owner(auth.uid(), job_id));
CREATE POLICY "Admins read all applications" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Seekers apply to active jobs" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid() AND public.has_role(auth.uid(), 'job_seeker') AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.is_active));
CREATE POLICY "Employers update applications to own jobs" ON public.applications FOR UPDATE TO authenticated USING (public.is_job_owner(auth.uid(), job_id));

-- application_status_history
CREATE POLICY "Read history of visible applications" ON public.application_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND (a.job_seeker_id = auth.uid() OR public.is_job_owner(auth.uid(), a.job_id))) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employers insert history" ON public.application_status_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid() AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND public.is_job_owner(auth.uid(), a.job_id)));

-- saved_jobs
CREATE POLICY "Users read own saved jobs" ON public.saved_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users save jobs" ON public.saved_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unsave jobs" ON public.saved_jobs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Seed: skills =====
INSERT INTO public.skills (name) VALUES
('C#'),('.NET'),('ASP.NET Core'),('Entity Framework Core'),('React'),('JavaScript'),('TypeScript'),('Python'),('Java'),('SQL'),('SQL Server'),('PostgreSQL'),('Docker'),('Kubernetes'),('AWS'),('Azure'),('Cyber Security'),('Machine Learning'),('REST API'),('Node.js'),('HTML'),('CSS'),('Git'),('Linux'),('Data Analysis'),('Power BI'),('Excel'),('TensorFlow'),('Pandas'),('Network Security'),('Penetration Testing'),('Django'),('Spring Boot'),('Redux'),('CI/CD');

-- ===== Seed: companies =====
INSERT INTO public.companies (name, description, website, location) VALUES
('Tech Solutions', 'Enterprise software consultancy building .NET and cloud platforms for finance and retail clients.', 'https://techsolutions.example.com', 'Bangalore'),
('CloudNova', 'Cloud-native infrastructure startup helping teams ship on AWS and Azure with confidence.', 'https://cloudnova.example.com', 'Hyderabad'),
('CyberSecure Labs', 'Security research and managed detection company protecting mid-size enterprises.', 'https://cybersecurelabs.example.com', 'Pune'),
('DataWorks', 'Analytics and data engineering studio turning raw data into decisions.', 'https://dataworks.example.com', 'Chennai'),
('FinTech Systems', 'Payments and lending technology provider serving banks across South Asia.', 'https://fintechsystems.example.com', 'Mumbai');

-- ===== Seed: jobs =====
INSERT INTO public.jobs (company_id, title, description, responsibilities, location, salary_min, salary_max, job_type, experience_required) VALUES
(1, 'Software Engineer', 'Join our platform team to design and build scalable services used by millions of end users. You will work across the stack with a strong focus on backend quality.', E'- Design and implement backend services in C# and .NET\n- Write clean, testable code and participate in code reviews\n- Collaborate with product and QA on feature delivery\n- Monitor and improve service reliability', 'Bangalore', 800000, 1400000, 'FullTime', '2-4 years'),
(1, 'Backend Developer', 'Own the APIs that power our client dashboards. You will design REST endpoints, optimise SQL queries, and containerise services for cloud deployment.', E'- Build and maintain REST APIs with ASP.NET Core\n- Model data with Entity Framework Core and SQL\n- Package services with Docker\n- Improve performance and observability', 'Bangalore', 600000, 1000000, 'FullTime', '2-5 years'),
(1, '.NET Developer', 'Modernise legacy line-of-business applications onto ASP.NET Core and Azure while maintaining feature parity for enterprise customers.', E'- Migrate .NET Framework apps to .NET 8\n- Implement features with ASP.NET Core and EF Core\n- Deploy to Azure App Service\n- Write unit and integration tests', 'Remote', 700000, 1200000, 'Remote', '3+ years'),
(2, 'Frontend Developer', 'Craft delightful, accessible interfaces for our cloud console. You care about performance, component design, and pixel-level polish.', E'- Build UI components with React and TypeScript\n- Translate designs into responsive layouts\n- Optimise bundle size and rendering performance\n- Write component tests', 'Hyderabad', 700000, 1100000, 'FullTime', '2-4 years'),
(2, 'Full Stack Developer', 'Work end to end on customer-facing features, from React front ends to Node.js services deployed on AWS.', E'- Ship features across React and Node.js\n- Design REST APIs and PostgreSQL schemas\n- Automate deployments with CI/CD\n- Pair with designers and product managers', 'Hyderabad', 900000, 1500000, 'FullTime', '3-6 years'),
(2, 'React Developer', 'Build the next generation of our dashboard experience with React, Redux, and a modern design system.', E'- Develop reusable React components\n- Manage application state with Redux\n- Integrate REST APIs\n- Maintain high test coverage', 'Remote', 600000, 1000000, 'Remote', '1-3 years'),
(4, 'Data Analyst', 'Turn operational data into insight for retail and logistics clients through dashboards, reports, and ad-hoc analysis.', E'- Write SQL to explore and aggregate data\n- Build Power BI dashboards\n- Present findings to stakeholders\n- Automate recurring reports with Python', 'Chennai', 500000, 800000, 'FullTime', '1-3 years'),
(3, 'Cyber Security Analyst', 'Monitor, detect, and respond to threats across client environments as part of our security operations team.', E'- Triage security alerts and incidents\n- Perform vulnerability assessments\n- Harden Linux and network infrastructure\n- Document findings and remediation steps', 'Pune', 600000, 1000000, 'FullTime', '2-4 years'),
(4, 'Python Developer', 'Build data pipelines and internal tools that move and transform large datasets reliably.', E'- Develop services and scripts in Python\n- Build ETL pipelines with Pandas and SQL\n- Containerise workloads with Docker\n- Deploy to AWS', 'Chennai', 600000, 1000000, 'FullTime', '2-4 years'),
(4, 'AI/ML Intern', 'Six-month paid internship working alongside our data science team on applied machine learning projects.', E'- Prototype ML models with Python and TensorFlow\n- Clean and prepare datasets\n- Evaluate model performance\n- Present results to the team', 'Chennai', 20000, 35000, 'Internship', '0-1 years'),
(5, 'Java Backend Engineer', 'Design resilient payment services with Spring Boot that process high volumes of transactions securely.', E'- Build microservices with Java and Spring Boot\n- Design PostgreSQL schemas\n- Ensure security and compliance of payment flows\n- Deploy with Kubernetes', 'Mumbai', 1000000, 1800000, 'FullTime', '4+ years'),
(5, 'DevOps Engineer (Contract)', 'Twelve-month contract to build and maintain CI/CD pipelines and cloud infrastructure for our lending platform.', E'- Maintain CI/CD pipelines\n- Manage Kubernetes clusters on Azure\n- Automate infrastructure with scripts\n- Improve deployment reliability', 'Mumbai', 1200000, 1800000, 'Contract', '3+ years');

-- ===== Seed: job skills =====
INSERT INTO public.job_skills (job_id, skill_id, is_required)
SELECT j.id, s.id, true FROM (VALUES
 ('Software Engineer','C#'),('Software Engineer','.NET'),('Software Engineer','SQL'),('Software Engineer','REST API'),('Software Engineer','Git'),
 ('Backend Developer','C#'),('Backend Developer','.NET'),('Backend Developer','SQL'),('Backend Developer','REST API'),('Backend Developer','Docker'),
 ('.NET Developer','C#'),('.NET Developer','ASP.NET Core'),('.NET Developer','Entity Framework Core'),('.NET Developer','SQL Server'),('.NET Developer','Azure'),
 ('Frontend Developer','React'),('Frontend Developer','JavaScript'),('Frontend Developer','TypeScript'),('Frontend Developer','HTML'),('Frontend Developer','CSS'),
 ('Full Stack Developer','React'),('Full Stack Developer','Node.js'),('Full Stack Developer','JavaScript'),('Full Stack Developer','PostgreSQL'),('Full Stack Developer','AWS'),
 ('React Developer','React'),('React Developer','JavaScript'),('React Developer','Redux'),('React Developer','REST API'),
 ('Data Analyst','SQL'),('Data Analyst','Python'),('Data Analyst','Power BI'),('Data Analyst','Excel'),('Data Analyst','Data Analysis'),
 ('Cyber Security Analyst','Cyber Security'),('Cyber Security Analyst','Network Security'),('Cyber Security Analyst','Linux'),('Cyber Security Analyst','Penetration Testing'),
 ('Python Developer','Python'),('Python Developer','SQL'),('Python Developer','Pandas'),('Python Developer','Docker'),('Python Developer','AWS'),
 ('AI/ML Intern','Python'),('AI/ML Intern','Machine Learning'),('AI/ML Intern','TensorFlow'),('AI/ML Intern','Pandas'),
 ('Java Backend Engineer','Java'),('Java Backend Engineer','Spring Boot'),('Java Backend Engineer','PostgreSQL'),('Java Backend Engineer','Kubernetes'),
 ('DevOps Engineer (Contract)','Docker'),('DevOps Engineer (Contract)','Kubernetes'),('DevOps Engineer (Contract)','Azure'),('DevOps Engineer (Contract)','CI/CD'),('DevOps Engineer (Contract)','Linux')
) AS v(job_title, skill_name)
JOIN public.jobs j ON j.title = v.job_title
JOIN public.skills s ON s.name = v.skill_name;