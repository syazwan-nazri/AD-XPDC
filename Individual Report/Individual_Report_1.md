Sprint Contribution Report: Store Inventory Management System
Report For: Dr. Adila Firdaus
Sprint Number: Sprint 1
Sprint Dates: 1st November 2025 to 15th November 2025
Project Role: Full-Stack Developer

1. Executive Summary
This sprint, I delivered the core Master Data packages assigned to me: Part Master, Part Group Master, Warehouse Master, and Warehouse Locations. I completed the CRUD pages, integrated them with the existing Firebase data flow, and ensured role-based access control checks aligned with the system’s resource permissions. I also verified routes and navigation entries for these modules and participated in sprint reviews and daily stand-ups.

2. Sprint Goals & Personal Objectives
Sprint Goal: "Complete foundational Master Data modules to support inventory and procurement workflows."
My Personal Objectives:
Finalize the Part Master and Part Group Master modules with consistent CRUD patterns.
Implement Warehouse Master and Warehouse Locations pages and ensure data integrity between them.
Align access control with the RBAC permissions (view/edit/add) for the data master resources.

3. Detailed Work Log / Task Breakdown
| Task ID | Task Description | Status | Effort (Hours) | Notes / Output |
|---|---|---|---:|---|
| SIMS-11 | Part Master CRUD page | Done | 5 | Built listing, create/edit modal, validation, and Firebase integration for part_master. |
| SIMS-12 | Part Group Master CRUD page | Done | 4 | Implemented part_group_master CRUD with lookup linkage to Part Master. |
| SIMS-13 | Warehouse Master CRUD page | Done | 4 | Added warehouse_master module with form validation and table filters. |
| SIMS-14 | Warehouse Locations CRUD page | Done | 4 | Implemented warehouse_locations with parent warehouse reference and required field checks. |
| SIMS-15 | RBAC alignment for data master pages | Done | 2 | Verified view/edit/add permission checks against roles.js and updated UI gating where needed. |

4. Key Achievements & Deliverables
✅ Delivered four Master Data modules: Part Master, Part Group Master, Warehouse Master, and Warehouse Locations.
✅ Integrated CRUD flows with the existing Firebase data model and UI patterns.
✅ Ensured RBAC checks align with `part_master`, `part_group_master`, `warehouse_master`, and `warehouse_locations` permissions.
✅ Verified routes and navigation entries for consistent access in the sidebar.

5. Challenges & Blockers
Challenge: Ensuring data consistency between Warehouse Master and Warehouse Locations when creating or editing records.
Solution: Standardized validation and added required parent selection for location creation to prevent orphan records.
Blocker: Needed confirmation on required fields and naming conventions for master data.
Action Taken: Reviewed project documentation and aligned form fields with the standardized resource definitions.

6. Learning & Growth
Technical: Improved consistency in CRUD patterns and RBAC enforcement across multiple modules.
Tooling: Strengthened familiarity with Firebase data operations and UI state handling.
Domain Knowledge: Better understanding of how master data drives inventory and procurement workflows.

7. Plans for Next Sprint
Extend CRUD consistency to other assigned modules and improve data validation UX.
Support report and inventory modules that depend on master data accuracy.
Contribute to documentation updates for the Master Data pages and permissions mapping.

8. Metrics & Artifacts (Optional but impactful)
