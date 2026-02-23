# ft_transcendence — Subject v20.0 — Summary / Outline

> *"This project involves undertaking tasks you have never done before. Remember the beginning of your journey in computer science. Look at you now; it's time to shine!"*

---

## Table of Contents

1. [AI Instructions](#i-ai-instructions)
2. [Preamble](#ii-preamble)
3. [Mandatory Part](#iii-mandatory-part)
4. [Modules](#iv-modules)
5. [Project Ideas and Examples](#v-project-ideas-and-examples)
6. [README Requirements](#vi-readme-requirements)
7. [Bonus Part](#vii-bonus-part)
8. [Submission and Peer-Evaluation](#viii-submission-and-peer-evaluation)

---

## I. AI Instructions

### Context
AI can assist with many tasks but must always be approached critically. Generated content (code, docs, ideas) may be inaccurate or poorly suited to your context. **Peers are your best quality checkpoint.**

### Main Message
- Use AI to reduce repetitive/tedious tasks.
- Develop prompting skills (coding and non-coding).
- Learn how AI systems work to avoid biases and ethical issues.
- Build technical and soft skills with peers.
- **Only use AI-generated content you fully understand and can take responsibility for.**

### Learner Rules
- Explore and understand AI tools before using them.
- Reflect on the problem before prompting.
- Systematically check, review, question, and test AI output.
- Always seek peer review.

### Phase Outcomes
- Develop general-purpose and domain-specific prompting skills.
- Boost productivity with AI tools.
- Strengthen computational thinking, problem-solving, adaptability, and collaboration.

### Key Examples
| ✅ Good Practice | ❌ Bad Practice |
|---|---|
| Ask AI for ideas → try them → review with a peer | Copy-paste AI-generated function without understanding it |
| Use AI to design → walk through logic with peer → fix bugs together | Let Copilot generate key code → can't explain it at evaluation |

---

## II. Preamble

### Overview
- **Group project: 4–5 people** — final project of the Common Core.
- Build a **real-world web application** as a team.
- Two parts: **mandatory part** (everyone contributes) + **chosen modules** (count toward grade).
- ⚠️ Poor early choices and lack of coordination will cost a lot of time. **All members must actively participate.**

### II.1 Team Organization and Project Management

#### II.1.1 Required Team Roles
Each team **must assign** these roles (one person can hold multiple roles in a 4-person team):

| Role | Responsibilities |
|---|---|
| **Product Owner (PO)** | Product vision, backlog, feature priorities, validates work, communicates with stakeholders |
| **Project Manager (PM) / Scrum Master** | Meetings, progress tracking, team communication, risk management |
| **Technical Lead / Architect** | Technical architecture, tech stack decisions, code quality, critical reviews |
| **Developers** (all members) | Code features, code reviews, testing, documentation |

- 4 people → some members take multiple roles (e.g., PM + Developer)
- 5 people → more specialized roles possible
- **All roles must be documented in README.md**

#### II.1.2 Recommended Project Management Practices *(not mandatory)*
- **Regular communication**: weekly/bi-weekly meetings
- **Task organization**: GitHub Issues, Trello, shared docs
- **Work breakdown**: divide into small, manageable tasks
- **Code reviews**: at least one peer reviews important changes
- **Documentation**: keep notes on decisions
- **Communication channel**: Discord, Slack, etc.

> ⚠️ During evaluation, the team must explain: role distribution, work organization, communication, and individual contributions. **All members must be able to explain the project.**

---

## III. Mandatory Part

### III.1 What Are We Doing?
- **The project idea is yours.** Decide as a team what application to build.
- First step: create a comprehensive **README.md** (see Chapter VI).
- Valid project examples:
  - Multiplayer Pong with tournament system
  - Collaborative platform with real-time features
  - Social network with user interactions
  - Online game (Chess, Tic-Tac-Toe, etc.) with matchmaking
  - Project management application
  - Any creative web application meeting requirements

### III.2 General Requirements
Failure to follow these = **project rejection**:

- **Web application** with frontend, backend, and database.
- **Git** with meaningful commit messages; repository must show commits from all members, clear messages, and proper work distribution.
- **Containerization** (Docker, Podman, or equivalent); must run with a single command.
- Compatible with the **latest stable Google Chrome**.
- **No warnings or errors** in the browser console.
- Must include accessible **Privacy Policy** and **Terms of Service** pages (real content, not placeholders; accessible from the app e.g. footer links). Missing/inadequate pages → project rejection.
- **Multi-user support (mandatory)**: multiple users logged in simultaneously, concurrent actions handled properly, real-time updates across users, no data corruption or race conditions.

### III.3 Technical Requirements *(mandatory)*

- Frontend: **clear, responsive, accessible** across all devices.
- Use a **CSS framework / styling solution** (Tailwind CSS, Bootstrap, Material-UI, Styled Components, etc.).
- Store credentials in a **`.env` file** ignored by Git; provide a `.env.example`.
- Database with **clear schema and well-defined relations**.
- **Basic user management system**: sign up and log in securely.
  - Minimum: email + password authentication (hashed, salted).
  - Additional methods (OAuth, 2FA) via modules.
- **Form and input validation** on both frontend and backend.
- **HTTPS** on the backend everywhere.

> **Framework definition** for this project: structured architecture, built-in features (routing, state mgmt), complete ecosystem.
> - Frontend: React, Vue, Angular, Svelte, Next.js
> - Backend: Express, Fastify, NestJS, Django, Flask, Ruby on Rails
> - Not frameworks: jQuery, Lodash, Axios
> - *Note: React is considered a framework in this context.*

---

## IV. Modules

**Need 14 points total** → Major module = **2 pts** | Minor module = **1 pt**

> ⚠️ Only **fully functional** modules count. Non-functional or incomplete = 0 points.

### Module Dependencies
- Gaming modules (AI Opponent, Tournament, Game customization, Spectator mode, Multiplayer 3+, Add another game) → **require at least one game implemented first**.
- Game Statistics module → requires a game.
- Advanced chat features → requires "User interaction" module (basic chat).
- SSR is **incompatible** with ICP blockchain backend.

---

### IV.1 Web

| Type | Module |
|---|---|
| **Major** | Use a framework for **both** frontend and backend (full-stack frameworks like Next.js count as both) |
| **Minor** | Use a frontend framework only (React, Vue, Angular, Svelte…) |
| **Minor** | Use a backend framework only (Express, Fastify, NestJS, Django…) |
| **Major** | Real-time features via WebSockets (real-time updates, handle connect/disconnect, efficient broadcasting) |
| **Major** | User interaction: basic chat + profile system + friends system |
| **Major** | Public API (secured API key, rate limiting, docs, min. 5 endpoints: GET, POST, PUT, DELETE) |
| **Minor** | ORM for the database |
| **Minor** | Complete notification system (create/update/delete actions) |
| **Minor** | Real-time collaborative features (shared workspaces, live editing, collaborative drawing…) |
| **Minor** | Server-Side Rendering (SSR) |
| **Minor** | Progressive Web App (PWA) with offline support and installability |
| **Minor** | Custom design system (min. 10 reusable components, color palette, typography, icons) |
| **Minor** | Advanced search with filters, sorting, pagination |
| **Minor** | File upload & management (multiple types, validation, secure storage, preview, progress, delete) |

---

### IV.2 Accessibility and Internationalization

| Type | Module |
|---|---|
| **Major** | Full WCAG 2.1 AA compliance (screen readers, keyboard navigation, assistive technologies) |
| **Minor** | Multiple languages (min. 3 translations, i18n system, language switcher, all text translatable) |
| **Minor** | RTL language support (min. 1 RTL language, full layout mirroring, seamless LTR↔RTL switch) |
| **Minor** | Additional browsers support (min. 2 browsers beyond Chrome: Firefox, Safari, Edge…) |

---

### IV.3 User Management

| Type | Module |
|---|---|
| **Major** | Standard user management: profile update, avatar upload (default if none), friends + online status, profile page |
| **Minor** | Game statistics & match history *(requires game)* — wins/losses/ranking, match history, achievements, leaderboard |
| **Minor** | OAuth 2.0 remote authentication (Google, GitHub, 42, etc.) |
| **Major** | Advanced permissions system: CRUD users, roles management (admin, user, guest, moderator…), role-based views |
| **Major** | Organization system: create/edit/delete orgs, add/remove users, org-specific actions (min. create, read, update) |
| **Minor** | 2FA (Two-Factor Authentication) |
| **Minor** | User activity analytics and insights dashboard |

---

### IV.4 Artificial Intelligence

| Type | Module |
|---|---|
| **Major** | AI Opponent for games *(requires game)* — challenging, human-like, uses customization options, must be explainable |
| **Major** | RAG (Retrieval-Augmented Generation) system — large dataset, Q&A, context retrieval + response generation |
| **Major** | LLM system interface — text/image generation, streaming responses, error handling + rate limiting |
| **Major** | Recommendation system (ML) — personalized, collaborative/content-based filtering, continuously improving |
| **Minor** | Content moderation AI (auto moderation, deletion, warnings) |
| **Minor** | Voice/speech integration |
| **Minor** | Sentiment analysis for user content |
| **Minor** | Image recognition and tagging system |

---

### IV.5 Cybersecurity

| Type | Module |
|---|---|
| **Major** | WAF/ModSecurity (hardened) + HashiCorp Vault for secrets — strict WAF config, secrets (API keys, credentials, env vars) encrypted and isolated in Vault |

---

### IV.6 Gaming and User Experience

| Type | Module |
|---|---|
| **Major** | Complete web-based game (real-time multiplayer, live matches, clear rules, 2D or 3D) |
| **Major** | Remote players — 2 players on separate computers in real-time (latency handling, reconnection logic) |
| **Major** | Multiplayer 3+ players *(requires game)* — 3+ simultaneous, fair mechanics, proper sync |
| **Major** | Add another game with history + matchmaking *(requires first game)* — 2nd distinct game, statistics, matchmaking |
| **Major** | Advanced 3D graphics (Three.js or Babylon.js — immersive environment, advanced rendering, smooth performance) |
| **Minor** | Advanced chat features *(requires basic chat)* — block users, game invites, notifications, profile access, history, typing indicators |
| **Minor** | Tournament system *(requires game)* — bracket, matchup tracking, matchmaking, registration/management |
| **Minor** | Game customization options *(requires game)* — power-ups, maps/themes, settings (default options must exist) |
| **Minor** | Gamification system — min. 3 of: achievements, badges, leaderboards, XP/level, daily challenges, rewards; persistent; visual feedback |
| **Minor** | Spectator mode *(requires game)* — watch ongoing games, real-time updates, optional spectator chat |

---

### IV.7 Devops

| Type | Module |
|---|---|
| **Major** | ELK stack log management (Elasticsearch + Logstash + Kibana — log retention, archiving, secure access) |
| **Major** | Monitoring with Prometheus + Grafana (metrics, exporters, custom dashboards, alerting, secure access) |
| **Major** | Backend as microservices (loosely coupled, REST/message queues, single responsibility per service) |
| **Minor** | Health check + status page + automated backups + disaster recovery |

---

### IV.8 Data and Analytics

| Type | Module |
|---|---|
| **Major** | Advanced analytics dashboard (interactive charts, real-time updates, export PDF/CSV, date ranges + filters) |
| **Minor** | Data export/import (JSON, CSV, XML; validation; bulk operations) |
| **Minor** | GDPR compliance (data request, deletion with confirmation, export in readable format, confirmation emails) |

---

### IV.9 Blockchain

| Type | Module |
|---|---|
| **Major** | Store tournament scores on blockchain (Avalanche + Solidity smart contracts, data integrity + immutability) |
| **Minor** | ICP (Internet Computer Protocol) blockchain backend *(incompatible with SSR)* |

---

### IV.10 Modules of Choice

| Type | Module |
|---|---|
| **Major** | Custom module not listed above — must be substantial, technically complex, with README justification (why chosen, technical challenges, added value, why it deserves 2 pts). No trivial shortcuts. |
| **Minor** | Same as major but smaller scope — must show technical skill, add value, justify in README (for 1 pt) |

---

## V. Project Ideas and Examples

> Need **14 points minimum**. These are suggestions — be creative!

### V.1 Example: Pong Game (14 pts)
| Category | Modules | Points |
|---|---|---|
| Gaming | Web-based game + Remote players + Tournament + Game customization | 6 |
| User Management | Standard user mgmt + OAuth | 3 |
| Web | Frontend + Backend frameworks + ORM | 3 |
| AI | AI Opponent | 2 |
| **Total** | | **14** |

### V.2 Gaming Projects
- **Multiplayer Pong** — tournaments, remote play, AI, power-ups → 14+ pts
- **Online Chess** — matchmaking, ELO, analysis, spectator → 15+ pts
- **Card Game Arena** (Poker, Uno) — multiplayer 3+, tournaments, leaderboards → 14+ pts
- **Battle Royale Mini-Game** — multiplayer 3+, real-time, customization → 14+ pts
- **Trivia/Quiz Platform** — multiplayer 3+, tournaments, gamification, analytics → 15+ pts

### V.3 Social and Collaborative Projects
- **Social Network** — profiles, posts, chat, notifications → 14+ pts
- **Collaborative Workspace** — real-time editing, org system, file sharing → 15+ pts
- **Forum Platform** — threads, moderation AI, advanced search → 14+ pts
- **Event Management Platform** — RSVP, calendar, notifications, public API → 14+ pts
- **Learning Management System** — courses, assignments, analytics → 15+ pts

### V.4 Creative and Media Projects
- **Music Streaming Platform** — upload, stream, recommendations, social → 15+ pts
- **Video Sharing Platform** — upload, watch, recommendations, moderation AI → 16+ pts
- **Art Gallery** — galleries, image recognition, custom design system → 14+ pts
- **Blogging Platform** — SSR, sentiment analysis, multilingual → 14+ pts
- **Recipe Sharing Platform** — upload, advanced search, PWA → 14+ pts

### V.5 Productivity and Tools Projects
- **Task Management System** — org system, real-time collab, notifications → 15+ pts
- **Code Collaboration Platform** — real-time collab, public API, custom design → 14+ pts
- **Booking System** — org system, notifications, public API → 14+ pts
- **Marketplace Platform** — file upload, recommendations, public API → 14+ pts
- **Fitness Tracker** — gamification, analytics, PWA, data export → 14+ pts

### V.6 Specialized Projects
- **Real-time Trading Simulator** — real-time features, analytics, public API, 3D → 15+ pts
- **Language Learning Platform** — gamification, multilingual, voice integration → 15+ pts
- **Pet Adoption Platform** — file upload, advanced search, org system → 14+ pts
- **Travel Planning Platform** — real-time collab, recommendations, multilingual → 15+ pts
- **Crowdfunding Platform** — file upload, public API, analytics, notifications → 14+ pts

> ⚠️ Choose a project that: interests your whole team, allows 14+ pts, demonstrates technical complexity, is feasible within the timeline, and has coherent module combinations.

---

## VI. README Requirements

The `README.md` must be at the root of the Git repo. **Must be written in English.** A poor or incomplete README negatively impacts your evaluation.

### Mandatory Base Content
1. **First line** (italicized): *This project has been created as part of the 42 curriculum by \<login1\>[, \<login2\>[, \<login3\>[...]]]*
2. **Description** section — project name, goal, key features, brief overview.
3. **Instructions** section — prerequisites (software, tools, versions, `.env` setup), step-by-step to run.
4. **Resources** section — references (docs, articles, tutorials) + description of how AI was used (which tasks, which parts).

### Additional Required Sections for ft_transcendence

**Team Information** — for each member:
- Assigned role(s): PO, PM, Tech Lead, Developer…
- Brief description of responsibilities

**Project Management**:
- How work was organized (task distribution, meetings)
- Tools used (GitHub Issues, Trello…)
- Communication channels (Discord, Slack…)

**Technical Stack**:
- Frontend technologies and frameworks
- Backend technologies and frameworks
- Database system and justification for choice
- Other significant technologies/libraries
- Justification for major technical choices

**Database Schema**:
- Visual or text representation of the structure
- Tables/collections and relationships
- Key fields and data types

**Features List**:
- Complete list of implemented features
- Which member(s) worked on each
- Brief description of each feature

**Modules**:
- Complete list (Major and Minor)
- Point calculation (Major = 2 pts, Minor = 1 pt)
- Justification for each choice (especially custom modules)
- How each module was implemented
- Which member(s) worked on each

**Individual Contributions**:
- Detailed breakdown per team member
- Specific features/modules/components per person
- Challenges faced and how they were overcome

---

## VII. Bonus Part

- Considered **only if 14 mandatory points are fully completed**.
- Each extra module beyond the required 14 may count as bonus.

### Conditions for Each Extra Module
- Must be fully functional
- Must meet the module requirements
- Must add real value to the project
- Must include justification in the README

### Bonus Point Values
- Major modules: **2 points each**
- Minor modules: **1 point each**
- **Maximum 5 bonus points** (e.g., 5 minor modules, or 2 major + 1 minor)

---

## VIII. Submission and Peer-Evaluation

- Submit in your **Git repository** as usual. Only work inside the repo is evaluated. Double-check file names.
- Discuss ideas with your team and peers **before starting**.
- During evaluation, a **brief modification** of the project may be requested (minor behavior change, a few lines of code, easy feature) to verify real understanding.
  - Not applicable to every project, but **be prepared** if mentioned in evaluation guidelines.
  - Feasible within a few minutes (unless a specific timeframe is defined).
  - Examples: update a function, modify a display, adjust a data structure.
- Specific details (scope, target) will be in the evaluation guidelines and may vary per evaluation session.

---

*Summary based on ft_transcendence subject version 20.0*
