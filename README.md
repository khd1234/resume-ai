# Resume AI - Epic 1: User Authentication & Management

This is the implementation of Epic 1 for the Resume Processing Platform, focusing on user authentication and management.

## Features Implemented

✅ **User Registration & Login**

- Email/password authentication
- Google OAuth integration
- Form validation with Zod
- Secure password hashing with bcryptjs

✅ **Session Management**

- NextAuth.js for secure session handling
- JWT-based authentication
- Automatic session persistence

✅ **User Profile Management**

- View profile information
- Edit user details
- Account type display (OAuth vs Email/Password)

✅ **Database Schema**

- Prisma ORM with PostgreSQL
- User, Account, Session, and VerificationToken models
- Ready for future Resume and Result models

✅ **UI Components**

- Modern UI with Tailwind CSS and Shadcn UI
- Responsive design
- Clean authentication forms
- Dashboard with profile management

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **Password Security**: bcryptjs for hashing
- **Validation**: Zod for input validation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Install PostgreSQL locally or use a cloud provider
2. Copy `.env.example` to `.env.local`
3. Update the `DATABASE_URL` in `.env.local`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/resume_ai"
```

### 3. Prisma Setup

```bash
# Generate Prisma client
npx prisma generate

# Create and run database migrations
npx prisma migrate dev --name init
```

### 4. Environment Variables

Update `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/resume_ai"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# JWT
JWT_SECRET="your-jwt-secret-here"
```

### 5. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 6. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## User Stories Completed

### ✅ User Registration

- Users can register with email/password
- Unique email validation
- Password hashing for security
- Automatic sign-in after registration

### ✅ User Login

- Secure login with email/password
- Google OAuth integration
- Session management with NextAuth.js
- Redirect to dashboard after login

### ✅ User Logout

- Secure logout functionality
- Session invalidation
- Redirect to home page

### ✅ Profile Management

- View profile information
- Edit user name
- Display account type (OAuth vs Email)
- Show member since date

### ✅ Google OAuth Integration

- One-click Google sign-in
- Automatic account creation for new users
- Profile picture and name from Google

## API Endpoints

- `POST /api/auth/signup` - User registration
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `/api/auth/[...nextauth]` - NextAuth.js authentication

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // Nullable for OAuth users
  oauthProvider String?   // google, linkedin, etc.
  oauthId       String?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## Security Features

- Password hashing with bcryptjs (12 rounds)
- JWT tokens for session management
- CSRF protection via NextAuth.js
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM

## Next Steps

This completes Epic 1. The foundation is now ready for:

- **Epic 2**: Resume Upload Flow
- **Epic 3**: Resume Processing (Lambda) - Already completed
- **Epic 4**: Result Handling & Storage
- **Epic 5**: Dashboard & Result Display

## File Structure

```
├── app/
│   ├── api/auth/
│   │   ├── [...nextauth]/route.ts
│   │   └── signup/route.ts
│   ├── api/profile/route.ts
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── profile/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── providers.tsx
├── lib/
│   ├── auth.ts
│   ├── auth-utils.ts
│   ├── prisma.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── next-auth.d.ts
└── package.json
```
