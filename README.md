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

## Summary

AppForge is a fully automated platform that takes you from idea to a complete project document. With the help of artificial intelligence, users can get a professional-grade project plan without needing any technical knowledge. The platform works in real time, keeps you informed about every step of the process, and allows you to export the complete project data.