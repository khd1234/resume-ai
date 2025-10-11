# 🧠 Project: resume-ai  
**Full Build Specification for AI Pair Programmer**

---

## 1. Project Overview

**Goal:**  
Enable users to upload resumes (PDF/DOCX), process them using AWS Lambda, and display a structured analysis including skills, score, and summary.

**MVP Scope:**  
End-to-end flow from upload → processing → result display.

**Optional Feature:**  
Google / LinkedIn OAuth login.

---

## 2. High-Level Architecture

**Flow Overview:**

1. User uploads resume via Next.js frontend using a pre-signed S3 URL.  
2. S3 triggers a Lambda function automatically.  
3. Lambda parses and analyzes the resume.  
4. Lambda publishes result to SQS (or SNS for notifications).  
5. Next.js backend receives the result, stores it in RDS.  
6. Frontend fetches results from backend and displays them in the dashboard.

**Architecture Components:**

- **Frontend (Next.js UI)** → Upload file via pre-signed S3 URL  
- **Amazon S3** → Stores uploaded resume files  
- **AWS Lambda (Resume Parser)** → Processes the resume  
- **Amazon SQS / SNS** → Communicates processed results  
- **Next.js API Routes** → Handles upload URL generation, message processing, and result storage  
- **Amazon RDS (Postgres)** → Stores user data, metadata, and processed results  
- **Frontend Dashboard** → Displays processed results to user  

---

## 3. Tech Stack

**Frontend:**  
- Next.js 14  
- React 18  
- Tailwind CSS  
- Shadcn UI  

**Authentication:**  
- NextAuth.js with JWT sessions  
- Optional Google / LinkedIn OAuth  

**Backend / API:**  
- Next.js API Routes  
- Generates pre-signed S3 URLs  
- Handles SQS/SNS callbacks  
- Fetches processed results  

**Storage:**  
- Amazon S3 for resume files  

**Processing:**  
- AWS Lambda (Node.js or Python) for parsing and analysis  

**Messaging:**  
- Amazon SQS or SNS for Lambda → Backend communication  

**Database:**  
- Amazon RDS (Postgres or MySQL)  

**Monitoring:**  
- AWS CloudWatch for Lambda logs and metrics  

**Local Testing:**  
- ngrok for webhook testing  

---

## 4. Cloud Workflow Summary

1. User uploads a file via Next.js using a pre-signed S3 URL.  
2. File is stored in Amazon S3.  
3. S3 triggers AWS Lambda (event-based trigger).  
4. Lambda processes the resume:
   - Parses resume contents
   - Extracts skills
   - Generates a score and summary  
5. Lambda publishes structured result to SQS or SNS.  
6. Next.js API:
   - Receives and validates the message
   - Stores results in RDS  
7. Frontend Dashboard fetches and displays results.  

**Optional:**  
Real-time updates via WebSocket or polling.

---

## 5. Epics and User Stories

### Epic 1: User Authentication & Management
**Goal:** Secure login/signup with optional OAuth.

- Register with email and password  
  - Validate unique email  
  - Hash and store password in RDS  
  - **Priority:** High  

- Login securely (JWT/session)  
  - Return session/JWT token  
  - Show error for invalid credentials  
  - **Priority:** High  

- Google/LinkedIn OAuth login  
  - Create user automatically if new  
  - **Priority:** High  

- Logout  
  - Invalidate session and redirect to login  
  - **Priority:** Medium  

- View profile  
  - Display account info and email  
  - **Priority:** Medium  

---

### Epic 2: Resume Upload Flow
**Goal:** Allow users to upload resumes securely.

- Select resume file (PDF/DOCX)  
  - Validate file type and size  
  - **Priority:** High  

- Backend generates pre-signed S3 URL  
  - **Priority:** High  

- Frontend uploads directly to S3 using the URL  
  - **Priority:** High  

- Store metadata in RDS (filename, userId, status=Pending)  
  - **Priority:** High  

---

### Epic 3: Resume Processing (Lambda)
**Goal:** Automatically parse and analyze uploaded resumes.  
✅ **Status:** Done (Lambda implemented)

- Triggered by S3 event  
  - **Priority:** High  

- Parse resume and extract key info  
  - Skills, experience, summary  
  - **Priority:** High  

- Generate score and structured summary  
  - **Priority:** High  

- Publish result to SQS or SNS  
  - **Priority:** High  

- Log all processing steps in CloudWatch  
  - **Priority:** Medium  

---

### Epic 4: Result Handling & Storage
**Goal:** Store the Lambda-processed results securely.

- Backend receives SQS/SNS message  
  - **Priority:** High  

- Validate SNS signature or SQS message integrity  
  - **Priority:** High  

- Store results in RDS (linked to resume/user)  
  - **Priority:** High  

- Retry failed messages and log errors  
  - **Priority:** Medium  

---

### Epic 5: Dashboard & Result Display
**Goal:** Display user’s uploaded resumes and analysis.

- View all uploaded resumes with status  
  - **Priority:** High  

- View detailed analysis (skills, score, summary)  
  - **Priority:** High  

- Download processed report (PDF/CSV)  
  - **Priority:** Medium  

- Real-time updates (status change: “Processing → Completed”)  
  - **Priority:** Medium  

---

### Epic 6: Observability & Monitoring
**Goal:** Ensure debugging and error visibility.

- View Lambda logs in CloudWatch  
  - **Priority:** High  

- Monitor SNS/SQS metrics  
  - **Priority:** Medium  

- Test SNS → Next.js webhook locally via ngrok  
  - **Priority:** High  

- Debug failed uploads or processing tasks  
  - **Priority:** Medium  

---

## 6. Database Schema (Simplified)

**Users Table:**  
- id  
- email  
- password_hash  
- oauth_provider  
- created_at  

**Resumes Table:**  
- id  
- user_id  
- s3_key  
- status  
- uploaded_at  

**Results Table:**  
- id  
- resume_id  
- score  
- extracted_skills  
- summary  
- created_at  

---

## 7. Optional Enhancements (Post-MVP)

- AWS Step Functions for multi-step workflow  
- SQS Dead Letter Queue (DLQ) for failed messages  
- WebSocket-based live updates on dashboard  
- AI-powered resume improvement suggestions using OpenAI  
- Deployment options:
  - Vercel  
  - EC2 / ECS  
  - HTTPS with AWS ACM  

---

## ✅ Summary of MVP Flow

1. User logs in (email/password or OAuth).  
2. User uploads resume via pre-signed S3 URL.  
3. S3 triggers Lambda to process resume.  
4. Lambda publishes result to SQS/SNS.  
5. Next.js backend stores results in RDS.  
6. Frontend dashboard displays results to user.  
7. (Optional) WebSocket or polling updates results in real-time.

---

## Developer Notes

- Use environment variables for AWS credentials and secrets.  
- Use AWS SDK v3 for S3, SNS, and SQS interactions.  
- Keep Lambda lightweight and stateless.  
- Handle all async operations with retries or DLQs.  
- Log extensively for debugging through CloudWatch.  
- Prefer TypeScript for type safety in both frontend and backend.  

---

**End of Document**
