# Resume Processing Platform (Next.js + AWS) – MVP

## 1. Project Overview

- Goal: Allow users to upload resumes (PDF/DOCX), process them with AWS Lambda, and receive structured analysis (skills, score, summary).
- MVP Scope: End-to-end flow from upload → processing → result display.
- Optional: Google / LinkedIn OAuth login.

---

## 2. High-Level Architecture

- Frontend (Next.js UI)
  - User uploads resume via pre-signed S3 URL
- Amazon S3
  - Stores uploaded resumes
  - Triggers Lambda on object creation
- AWS Lambda
  - Parses resumes, extracts key info
  - Generates score and summary
  - Publishes result to SQS / SNS
- Amazon SQS / SNS
  - Reliable messaging between Lambda and backend
- Next.js API
  - Receives result messages
  - Stores processed results in RDS
- RDS (Postgres/MySQL)
  - Stores user info, resume metadata, processed results
- Frontend Dashboard
  - Displays processed results to the user
- Optional: WebSocket or polling for real-time updates

---

## 3. Tech Stack

- Frontend: Next.js 14, React 18, Tailwind CSS, Shadcn UI
- Auth: NextAuth.js with Google and LinkedIn OAuth
- Server/API: Next.js API Routes
- Storage: Amazon S3
- Processing: AWS Lambda (Node.js / Python)
- Messaging: Amazon SQS / SNS
- Database: Amazon RDS (Postgres/MySQL)
- Monitoring: AWS CloudWatch
- Local Testing: ngrok for webhook testing

---

## 4. Cloud Flow

- User uploads file via frontend → pre-signed S3 URL
- S3 triggers Lambda automatically
- Lambda parses resume and generates structured JSON result
- Lambda publishes result to SQS (or SNS)
- Next.js API receives messages → stores result in RDS
- Frontend fetches results via API and displays in dashboard
- Optional: WebSocket / polling for real-time updates

---

## 5. Epics & User Stories

### Epic 1: User Authentication & Management - Completed ✅

- Goal: Secure login/signup with optional Google/LinkedIn OAuth
- User Stories:
  - Register with email/password (unique email, hashed password) ✅
  - Login securely (JWT/session) ✅
  - Google/LinkedIn OAuth login (new user auto-created) ✅
  - Logout (session invalidated) ✅
  - View profile (email and account info displayed) ✅

### Epic 2: Resume Upload Flow - Completed ✅

- Goal: Users can upload resumes securely ✅
- User Stories:
  - Select resume (PDF/DOCX) with file type and size validation ✅
  - Backend generates pre-signed S3 URL ✅
  - Frontend uploads directly to S3 ✅
  - Store metadata in RDS (filename, userId, status=Pending) ✅

### Epic 3: Resume Processing (Lambda) - Completed ✅

status - completed

- Goal: Automatically parse and analyze uploaded resumes ✅
- User Stories:
  - Lambda triggered by S3 event ✅
  - Parse resume to extract key info ✅
  - Generate score/summary ✅
  - Publish result to SQS/SNS ✅
  - Log errors to CloudWatch ✅

### Epic 4: Result Handling & Storage

- Goal: Backend receives results and stores securely
- User Stories:
  - Backend receives SQS/SNS messages
  - Validate SNS signature / SQS integrity
  - Store results in RDS linked to resume/user
  - Retry failed messages; log errors

### Epic 5: Dashboard & Result Display

- Goal: Users view status and analysis of resumes
- User Stories:
  - View all uploaded resumes with status (Pending/Processed)
  - View detailed analysis per resume (score, skills, summary)
  - Real-time updates (“Processing → Completed”)

### Epic 6: Observability & Monitoring

- Goal: Enable debugging, logging, and testing
- User Stories:
  - View Lambda logs in CloudWatch
  - Monitor SNS/SQS delivery metrics
  - Test SNS → Next.js webhook locally via ngrok
  - Debug failed uploads or processing

---

## 6. Database Schema (Simplified)

- Users: id, email, password_hash, oauth_provider, created_at
- Resumes: id, user_id, s3_key, status, uploaded_at
- Results: id, resume_id, score, extracted_skills, summary, created_at

---

## 7. Optional Enhancements (Post-MVP)

- Step Functions for multi-step resume processing
- SQS Dead Letter Queue (DLQ) for failed messages
- WebSocket notifications for real-time dashboard
- OpenAI-generated resume improvement suggestions
- Secure deployment: Vercel / EC2 / ECS with HTTPS + ACM

---

## 8. MVP Flow Summary

- User logs in (email/password or OAuth)
- Uploads resume via frontend → pre-signed S3 URL
- S3 triggers Lambda → processes resume → publishes result
- Next.js backend receives result → stores in RDS
- Frontend fetches results → displays in dashboard
- Optional: WebSocket/polling updates user in real-time

---
