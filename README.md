# Store Inventory Management System (SIMS) — AD-XPDC

A full-stack web application for engineering spare parts and inventory operations. The system supports role-based access control, barcode-assisted stock movements, procurement workflows, maintenance requests, and operational reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Capabilities](#key-capabilities)
3. [User Roles](#user-roles)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Documentation](#documentation)
8. [Project Documents](#project-documents)
9. [Status](#status)

---

## Overview

SIMS digitalizes store operations for engineering spare parts. It helps teams maintain accurate stock control, traceability, and coordination between inventory, procurement, and maintenance workflows.

---

## Key Capabilities

- Real-time inventory tracking and movement logs
- Role-based access control with protected routes
- Barcode-assisted stock in/out
- Procurement workflows (requisitions and purchase orders)
- Maintenance integration (MRF and machine history)
- Reporting and KPI dashboards
- Responsive UI with search, filter, and pagination

---

## User Roles

| Role | Group ID | Primary Responsibilities |
|------|----------|--------------------------|
| Admin | A | Full system access, user/group management |
| Storekeeper | S | Inventory operations and stock control |
| Procurement Officer | P | Supplier, requisition, and PO management |
| Maintenance Technician | M | Maintenance requests and asset tracking |

---

## Architecture

- **Frontend:** React + Material UI
- **State:** Redux Toolkit
- **Backend:** Firebase Authentication + Firestore
- **Hosting:** Firebase Hosting

---

## Project Structure

```
AD-XPDC/
├─ README.md
├─ Project Documents/         (All .md documentation files)
│  ├─ DOCUMENTATION_INDEX.md
│  ├─ QUICK_REFERENCE.md
│  ├─ TESTING_GUIDE.md
│  ├─ SOFTWARE_REQUIREMENTS_SPECIFICATION.md
│  └─ ... (other documentation)
└─ SRC/
    ├─ package.json
    ├─ firebase.json
    ├─ src/
    │  ├─ components/
    │  ├─ pages/
    │  ├─ redux/
    │  ├─ utils/
    │  └─ firebase/
    └─ public/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Authentication and Firestore enabled

### Install & Run

1. Open a terminal in the `SRC` folder
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the app:
    ```bash
    npm start
    ```

### Firebase Configuration

Update your Firebase configuration in `SRC/src/firebase/config.js` with your project credentials.

---

## Scripts

Run these from the `SRC` directory:

- `npm start` — start development server
- `npm run build` — production build
- `npm test` — run tests (if configured)

---

## Documentation

### Navigation
Start here: [Project Documents/DOCUMENTATION_INDEX.md](Project%20Documents/DOCUMENTATION_INDEX.md)

### Key Documents
All documentation is now centralized in the `Project Documents/` folder:

- [DOCUMENTATION_INDEX.md](Project%20Documents/DOCUMENTATION_INDEX.md) — Navigation guide
- [QUICK_REFERENCE.md](Project%20Documents/QUICK_REFERENCE.md) — Developer quick guide for roles, permissions, and common tasks
- [TESTING_GUIDE.md](Project%20Documents/TESTING_GUIDE.md) — End-to-end testing procedures and validation
- [VISUAL_SUMMARY.md](Project%20Documents/VISUAL_SUMMARY.md) — Architecture diagrams and visual flows
- [COMPLETION_REPORT.md](Project%20Documents/COMPLETION_REPORT.md) — Project delivery summary and readiness assessment
- [IMPLEMENTATION_CHECKLIST.md](Project%20Documents/IMPLEMENTATION_CHECKLIST.md) — Feature validation checklist
- [INTEGRATION_SUMMARY.md](Project%20Documents/INTEGRATION_SUMMARY.md) — System integration architecture
- [SOFTWARE_REQUIREMENTS_SPECIFICATION.md](Project%20Documents/SOFTWARE_REQUIREMENTS_SPECIFICATION.md) — Formal SRS document with functional/non-functional requirements

### Documentation Updates (February 3, 2026)

**Recent Changes:**
- Consolidated all documentation files into `Project Documents/` folder
- Refreshed Quick Reference, Testing Guide, and Visual Summary
- Refined Completion Report, Integration Summary, and Implementation Checklist
- Added Software Requirements Specification (SRS) document
- Updated Documentation Index to include all current files
- Merged duplicate README files into single source

**Status:**
- Documentation aligned with current repository structure
- Ready for QA review and validation
- Next step: execute the testing checklist in [TESTING_GUIDE.md](Project%20Documents/TESTING_GUIDE.md)

---

## Project Documents

### Proposal
- [Proposal SECJ3104 - Group XPDC.pdf](Project%20Documents/Proposal%20SECJ3104%20-%20Group%20XPDC.pdf)

### Agile Tracking
- Sagile Board: https://sagile.dev/shared-project/store-inventory-management-system-3wFzyT3q

### External Resources (Links)
| Resource | Link | Notes |
|---------|------|------|
| System SRS Document | https://docs.google.com/document/d/your-srs-link-here | Replace with the current link if used externally. |
| UI/UX Wireframes | https://www.figma.com/file/your-figma-link-here | Replace with the current link if used externally. |
| Mind Map | https://miro.com/app/board/your-miro-link-here | Replace with the current link if used externally. |

### Team
| Name | Role | Responsibility |
|------|------|----------------|
| Muhammad Syazwan bin Nazri | Project Manager & System Analyst | Requirements, documentation, architecture |
| Ammar Ibrahim bin Mohamed | Backend Developer | Firebase setup, auth, data layer |
| Irfan Danial Leong Bin Muhammad Shariff Leong | Frontend Developer | UI implementation and integration |

### Notes
- Update placeholder links before sharing outside the team.

---

## Status

**Current Phase:** Development Complete - Testing Required

Core modules are implemented and documented. See [COMPLETION_REPORT.md](Project%20Documents/COMPLETION_REPORT.md) for detailed status and [IMPLEMENTATION_CHECKLIST.md](Project%20Documents/IMPLEMENTATION_CHECKLIST.md) to validate features.

**Next Steps:**
1. Execute test scenarios in [TESTING_GUIDE.md](Project%20Documents/TESTING_GUIDE.md)
2. Harden Firebase security rules for production
3. Set up production environment and deploy

---

**Last Updated:** February 3, 2026  
**Version:** 1.1.0
