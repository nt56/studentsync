# 🎓 StudentSync

A centralized SaaS platform where colleges publish events and students discover, register, and participate — all from one place. Built to solve the problem of fragmented event information across colleges.

---

## 📖 About the Project

College students often miss events because information is scattered across WhatsApp groups, notice boards, Instagram pages, and college websites. **StudentSync** is a unified platform that brings all college events into a single, browsable, and searchable hub.

**Key goals:**

- Students can discover events across colleges and register in a few clicks
- Organizers can create, manage events and track participant lists
- Admins can manage the entire platform — users, colleges, and events

**Current status:** Phase 1 (Core MVP) — Backend complete with full REST API, authentication, and role-based access control. Frontend development is next.

---

## ⚙️ Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| **Framework**   | Next.js 16 (App Router)                     |
| **Language**    | TypeScript                                  |
| **Database**    | MongoDB with Mongoose ODM                   |
| **Auth**        | Better Auth (Email/Password, session-based) |
| **Validation**  | Zod v4                                      |
| **Styling**     | Tailwind CSS v4                             |
| **Runtime**     | Node.js 18+                                 |
| **Package Mgr** | npm                                         |

---

## 👥 User Roles & Permissions

| Capability                    | Student | Organizer | Admin |
| ----------------------------- | ------- | --------- | ----- |
| Browse & search events        | ✅      | ✅        | ✅    |
| Register / cancel for events  | ✅      | ✅        | ✅    |
| View own registrations        | ✅      | ✅        | ✅    |
| Create & manage events        | ❌      | ✅        | ✅    |
| View event participant list   | ❌      | ✅ (own)  | ✅    |
| Manage all users & roles      | ❌      | ❌        | ✅    |
| Manage & verify colleges      | ❌      | ❌        | ✅    |
| Delete any event/user/college | ❌      | ❌        | ✅    |

> **Security:** Every new user is assigned the `student` role. Only an admin can promote users to `organizer` or `admin` via the API. Users **cannot** set their own role.

---
