# AppForge Backend

**AppForge** is a platform that allows users to describe their app idea in plain language and automatically generates a complete project plan, screen designs, and prototypes using artificial intelligence.

---

## What does the platform do?

AppForge turns a simple idea into a ready-made project document. The user just writes "I want to build an app that..." — the system handles the rest:

- Analyzes the idea and creates a list of features
- Generates wireframes (sketches) for each screen
- Defines navigation (transitions) between screens
- Produces time and cost estimates
- Allows exporting the complete project document

---

## Complete Workflow

### Step 1: Registration and Login

The user registers on the platform by providing their name, email, and password. A welcome email is sent after registration. For subsequent visits, the user logs in with their email and password. Upon login, the system issues a secure token — all actions are performed on behalf of the user through this token.

### Step 2: Create a New Project

The user creates a new project by:
- Giving the project a name
- Writing a detailed description of the app idea (e.g., "A food delivery app where users can browse restaurants, place orders, and track the delivery driver")

As soon as the project is created, the system automatically sends the description to the AI for analysis.

### Step 3: AI Analysis

During this step, the system works in the background — the user doesn't need to wait and receives real-time updates on the progress:

**The AI identifies:**
- App name and type (mobile app, website, SaaS, etc.)
- Target audience (who the app is built for)
- Core problem (what problem the app solves)
- Feature list — for each feature:
  - Name and description
  - Category (authentication, payments, profile, etc.)
  - Priority level (MVP, high, medium, low)
  - Complexity rating
  - Estimated hours
- Screen list (login, home page, settings, etc.)
- User personas
- Technical requirements and recommended technologies

**The user receives real-time notifications during the process:**
- "Analysis starting..."
- "Identifying features..."
- "Analysis complete!"

### Step 4: Wireframe Generation

After the analysis is complete, the system generates a wireframe (screen sketch) for each screen:

- Each screen is sent to the AI individually
- The AI creates a component structure for the screen (buttons, text fields, images, lists)
- The position, size, and properties of each component are defined
- Real-time progress updates are sent: "3/10 screens ready"

The result is a complete visual structure for every screen.

### Step 5: Prototype and Navigation

In this step, the user defines transitions between screens:

- Which button leads to which screen
- For example: pressing the "Login" button → navigates to the Home screen
- The system validates all connections — if any screen is incorrectly linked, it reports the issue

This creates a complete navigation flow for the app.

### Step 6: Cost and Time Estimation

The system generates a full cost and time breakdown for the project:

**Hours breakdown:**
- Design work — 15% of total hours
- Frontend (what the user sees) — 35%
- Backend (server side) — 30%
- Testing — 15%
- Deployment (launch) — 5%

**Results include:**
- Total hours
- Cost for each phase
- Total project cost
- Estimated timeline (in weeks)
- Phase plan (e.g., "Design: 2 weeks, Frontend: 4 weeks...")

### Step 7: Project Management

After a project is created, the user can perform the following actions:

| Action | Description |
|--------|-------------|
| View | View project details, features, and screens |
| Edit | Change the name and description |
| Re-analyze | Run AI analysis again (get fresh results) |
| Archive | Move the project to archive (keep without deleting) |
| Unarchive | Restore an archived project |
| Export | Download the complete project data |
| Change status | Move the project to the next stage |

### Step 8: Subscription and Billing

The platform operates with a subscription system:

| Plan | Description |
|------|-------------|
| FREE | Free — limited features |
| STARTER | Starter — expanded functionality |
| PRO | Professional — full access |
| ENTERPRISE | Enterprise — custom services |

**Payment flow:**
1. The user clicks the subscribe button
2. The system redirects to the Stripe payment page
3. The user enters their card details and pays
4. If payment is successful — the plan automatically upgrades to PRO
5. The subscription can be cancelled at any time (remains active until the end of the current billing period)

### Step 9: Profile Management

The user can manage their profile:
- Change name, company name, and position
- Upload a profile picture
- Change password

---

## Project Statuses

Each project goes through specific stages:

```
DRAFT (Initial state)
    ↓
ANALYZING (AI is processing the idea)
    ↓
WIREFRAMING (Screen sketches are being generated)
    ↓
READY (All data has been collected)
    ↓
IN_DEVELOPMENT (Under development)
    ↓
COMPLETED (Finished)

* Any status can be moved to → ARCHIVED
```

---

## User Roles

| Role | Description |
|------|-------------|
| CLIENT | Regular user — creates and manages projects |
| DEVELOPER | Developer — participates in projects |
| AGENCY_OWNER | Agency owner — manages a team |
| ADMIN | Administrator — full system access |

---

## Real-Time Notifications (WebSocket)

The platform sends real-time notifications. The user receives updates without refreshing the page:

- When a project status changes
- AI analysis progress percentage
- Wireframe generation progress (e.g., "5/12 screens ready")
- When an error occurs
- When another user comes online/goes offline
- When someone is typing in a project

---

## Email Notifications

The system sends emails in the following cases:

| Event | Email content |
|-------|---------------|
| Registration | Welcome! You've successfully joined the platform |
| Password reset | A link to reset your password |
| Project ready | Your project has been analyzed by AI and is ready |

---

## File Uploads

The platform supports two types of file uploads:

| File type | Allowed formats | Max size |
|-----------|-----------------|----------|
| Profile picture (avatar) | JPEG, PNG, WebP | 2 MB |
| Project thumbnail | JPEG, PNG, WebP, GIF | 5 MB |

---

## Overall Process Flow

```
User registers on the platform
        ↓
Creates a new project (describes the idea)
        ↓
AI analyzes the idea
├── Features are identified
├── Screen list is created
└── User personas are generated
        ↓
Wireframes are generated for each screen
        ↓
User defines navigation between screens
        ↓
Cost and time estimates are generated
        ↓
Project is ready — can be exported or moved to development
```

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| NestJS v11 | Backend framework (Express) |
| TypeScript 5.7 | Language |
| Prisma v7 | ORM with PostgreSQL adapter |
| PostgreSQL | Primary database |
| Passport JWT + Local | Authentication strategies |
| Claude AI (claude-sonnet-4-20250514) | AI analysis, wireframes, estimates, codegen |
| Stripe | Subscription payments & billing |
| SendGrid | Transactional emails |
| Cloudflare R2 | File storage (S3-compatible) |
| Socket.IO | Real-time WebSocket events |
| Redis | Caching (optional, falls back to in-memory) |
| @nestjs/throttler | Rate limiting |

---

## Setup & Installation

```bash
# Clone the repository
git clone <repo-url>
cd appforge-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | JWT signing key | — |
| `JWT_EXPIRATION` | Access token TTL | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | — |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL | `7d` |
| `CLAUDE_API_KEY` | Anthropic API key | — |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `REDIS_HOST` | Redis host (optional) | `localhost` |
| `REDIS_PORT` | Redis port (optional) | `6379` |
| `SENDGRID_API_KEY` | SendGrid API key | — |
| `SENDGRID_FROM_EMAIL` | Sender email address | — |
| `FRONTEND_URL` | Frontend URL for email links | — |
| `STRIPE_SECRET_KEY` | Stripe secret key | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | — |
| `R2_BUCKET` | Cloudflare R2 bucket name | — |
| `R2_ACCESS_KEY` | R2 access key | — |
| `R2_SECRET_KEY` | R2 secret key | — |
| `R2_ENDPOINT` | R2 endpoint URL | — |
| `R2_GET_URL` | R2 public GET URL | — |
| `STRIPE_FREE_PRICE_ID` | Stripe price ID for Free tier | — |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID for Starter tier | — |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for Pro tier | — |
| `STRIPE_ENTERPRISE_PRICE_ID` | Stripe price ID for Enterprise tier | — |
| `SWAGGER_USER` | Swagger docs basic auth username | — |
| `SWAGGER_PASSWORD` | Swagger docs basic auth password | — |

---

## API Reference

**Base URL:** `/api/v1`
**Swagger Docs:** `/api/docs` (development only, basic auth)

### Response Format

**Success:**
```json
{ "success": true, "data": { ... }, "timestamp": "2026-02-08T12:00:00.000Z" }
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10, "hasNext": true, "hasPrev": false },
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["Email must be valid"],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register new user (14-day PRO trial) | Public |
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/forgot-password` | Request password reset email | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |
| POST | `/auth/verify-email` | Verify email with token | Public |
| POST | `/auth/resend-verification` | Resend verification email | Public |

### Users Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/me` | Get current user profile | JWT |
| PATCH | `/users/me` | Update profile (name, company, position, avatar) | JWT |
| PATCH | `/users/me/password` | Change password | JWT |
| GET | `/users` | List all users (paginated) | Admin |

### Projects Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/projects` | Create project (triggers AI analysis) | JWT |
| GET | `/projects` | List user's projects (paginated) | JWT |
| GET | `/projects/:id` | Get project with features/screens/estimate | JWT |
| PATCH | `/projects/:id` | Update project (DRAFT/READY only) | JWT |
| DELETE | `/projects/:id` | Delete project | JWT |
| POST | `/projects/:id/archive` | Archive project | JWT |
| POST | `/projects/:id/unarchive` | Unarchive to DRAFT | JWT |
| POST | `/projects/:id/reanalyze` | Restart AI analysis | JWT |
| PATCH | `/projects/:id/status` | Transition project status | JWT |
| POST | `/projects/:id/estimate` | Generate cost/time estimate | JWT |
| GET | `/projects/:id/estimate` | Get project estimate | JWT |
| GET | `/projects/:id/export` | Export full project data | JWT |

### AI Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/ai/analyze` | Analyze app idea | JWT |
| POST | `/ai/wireframe` | Generate wireframe for screen | JWT |
| POST | `/ai/estimate` | Generate project estimate | JWT |
| POST | `/ai/codegen` | Generate code skeleton | JWT |

### Wireframes Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/wireframes/project/:projectId` | List screens for project | JWT |
| GET | `/wireframes/:id` | Get single screen | JWT |
| POST | `/wireframes` | Create new screen | JWT |
| PATCH | `/wireframes/:id` | Update screen | JWT |
| DELETE | `/wireframes/:id` | Delete screen | JWT |
| POST | `/wireframes/generate/:projectId` | Generate all wireframes | JWT |
| PATCH | `/wireframes/reorder/:projectId` | Reorder screens | JWT |

### Prototypes Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/prototypes/:projectId` | Get prototype with connections | JWT |
| PATCH | `/prototypes/connections` | Update screen connections | JWT |
| POST | `/prototypes/:projectId/validate` | Validate all connections | JWT |

### Stripe Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/stripe/checkout` | Create Stripe checkout session | JWT |
| POST | `/stripe/webhook` | Stripe webhook handler | Public |
| POST | `/stripe/cancel` | Cancel subscription | JWT |
| GET | `/stripe/status` | Get subscription status | JWT |

### Organizations Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/organizations` | Create organization | JWT |
| GET | `/organizations` | List user's organizations | JWT |
| GET | `/organizations/:id` | Get organization details | JWT |
| PATCH | `/organizations/:id` | Update organization | Owner/Admin |
| DELETE | `/organizations/:id` | Delete organization | Owner |
| GET | `/organizations/:id/members` | List members | JWT |
| POST | `/organizations/:id/invites` | Invite member by email | Owner/Admin |
| DELETE | `/organizations/:id/invites/:inviteId` | Revoke invite | Owner/Admin |
| POST | `/organizations/invites/:token/accept` | Accept invite | JWT |
| DELETE | `/organizations/:id/members/:memberId` | Remove member | Owner/Admin |
| PATCH | `/organizations/:id/members/:memberId/role` | Change member role | Owner |

### Billing Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/billing/summary` | Billing overview | JWT |
| GET | `/billing/invoices` | Invoice list (paginated) | JWT |
| GET | `/billing/invoices/:id` | Invoice detail | JWT |
| GET | `/billing/usage-report` | Usage report with date filter | JWT |

### Uploads Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/uploads/avatar` | Upload avatar (max 2MB, JPEG/PNG/WebP) | JWT |
| POST | `/uploads/thumbnail` | Upload thumbnail (max 5MB, JPEG/PNG/WebP/GIF) | JWT |

### Analytics Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/analytics/usage` | User's token usage stats | JWT |
| GET | `/analytics/usage/trend` | Monthly usage trend (12 months) | JWT |
| GET | `/analytics/projects/:id/usage` | Per-project token usage | JWT |
| GET | `/analytics/admin/system` | System-wide stats | Admin |
| GET | `/analytics/admin/revenue` | Revenue analytics | Admin |
| GET | `/analytics/admin/tiers` | Tier distribution | Admin |

### Admin Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/admin/dashboard` | System dashboard stats | Admin |
| GET | `/admin/users` | User list with filter/pagination | Admin |
| PATCH | `/admin/users/:id/tier` | Change user subscription tier | Admin |
| GET | `/admin/ai-calls` | Recent AI API calls | Admin |
| GET | `/admin/usage` | System usage breakdown | Admin |

---

## Subscription Tiers

| Tier | Price | Monthly Tokens | Max Projects | Daily AI Requests | Code Gen | Advanced Estimates | Custom Templates | Priority Support |
|------|-------|---------------|--------------|-------------------|----------|--------------------|------------------|-----------------|
| FREE | $0 | 50,000 | 3 | 10 | No | No | No | No |
| STARTER | $19/mo | 200,000 | 10 | 50 | No | Yes | Yes | No |
| PRO | $49/mo | 1,000,000 | 50 | 200 | Yes | Yes | Yes | Yes |
| ENTERPRISE | $199/mo | Unlimited | Unlimited | Unlimited | Yes | Yes | Yes | Yes |

### Trial System
- New users get a **14-day PRO trial** on registration
- Email alert sent 3 days before trial expiration
- Auto-downgrade to FREE when trial expires

---

## Guards & Decorators

| Guard/Decorator | Description |
|-----------------|-------------|
| `JwtAuthGuard` | Default auth guard on all routes |
| `LocalAuthGuard` | Email/password validation (login only) |
| `RolesGuard` | Role-based access control |
| `EmailVerifiedGuard` | Blocks unverified email users |
| `TierGuard` | Subscription tier enforcement |
| `QuotaGuard` | Token/request quota checking |
| `@Public()` | Skip JWT authentication |
| `@SkipEmailVerification()` | Bypass email verification requirement |
| `@Roles(UserRole.ADMIN)` | Require specific user roles |
| `@RequireTier(SubscriptionTier.PRO)` | Require subscription tier |
| `@RequireFeature('codeGeneration')` | Require specific feature |
| `@CurrentUser()` | Inject current user into handler |

---

## WebSocket Events

**Namespace:** `/events`
**Auth:** JWT token in `auth.token` handshake

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `project:status-changed` | `{ projectId, status, projectName }` | Project status updated |
| `project:analysis-progress` | `{ projectId, step, progress, message }` | AI analysis progress |
| `project:analysis-completed` | `{ projectId, featuresCount, screensCount }` | Analysis done |
| `project:wireframe-progress` | `{ projectId, screenName, current, totalScreens }` | Wireframe gen progress |
| `project:wireframe-completed` | `{ projectId }` | All wireframes generated |
| `notification` | `{ type, title, message, metadata }` | Generic notification |
| `error` | `{ message, context }` | Error event |
| `upload:completed` | `{ type, url }` | File upload completed |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join:project` | `{ projectId }` | Join project room |
| `leave:project` | `{ projectId }` | Leave project room |
| `typing:start` | `{ projectId }` | Started typing |
| `typing:stop` | `{ projectId }` | Stopped typing |
| `presence:get` | — | Get online users list |

---

## Database Models

| Model | Description |
|-------|-------------|
| User | User accounts with roles, tiers, trial info |
| Subscription | Stripe subscription records |
| Organization | Team/company organizations |
| OrganizationMember | Org membership with roles |
| OrganizationInvite | Pending org invitations |
| Project | App projects with AI analysis results |
| Screen | Project screens with wireframe JSON |
| Feature | Project features with priority/complexity |
| Estimate | Cost/time estimates per project |
| Template | Reusable project templates |
| PromptHistory | AI API call logs for analytics |
| PasswordReset | Password reset tokens |
| EmailVerification | Email verification tokens |
| Invoice | Stripe invoice records |
| UsageRecord | Monthly token/request usage aggregation |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in development mode (watch) |
| `npm run start:debug` | Start in debug mode |
| `npm run start:prod` | Start production server |
| `npm run build` | Build the project |
| `npm run lint` | Lint and fix code |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |

---

## Summary

AppForge is a fully automated platform that takes you from idea to a complete project document. With the help of artificial intelligence, users can get a professional-grade project plan without needing any technical knowledge. The platform works in real time, keeps you informed about every step of the process, and allows you to export the complete project data.