Sprint Contribution Report: Store Inventory Management System
Report For: Dr. Adila Firdaus
Sprint Number: Sprint 1
Sprint Dates: 1st November 2025 to 15th November 2025
Project Role: Full-Stack Developer

1. Executive Summary
A brief, high-level overview of your contribution this sprint.
This sprint, I focused on developing the core inventory adjustment module, which allows store managers to process stock returns and damages. I successfully implemented the backend API endpoints and integrated them with the frontend modal component. Additionally, I assisted in bug fixes for the product search feature and participated in all Agile ceremonies.

2. Sprint Goals & Personal Objectives
List the sprint goals and how your tasks aligned with them.
Sprint Goal: "Enable users to adjust inventory levels for reasons other than sales (returns, damage, loss)."
My Personal Objectives:
Design and implement the InventoryAdjustment entity and repository.
Create REST API endpoints for POST /api/adjustments and GET /api/adjustments.
Collaborate with frontend to provide adjustment data for the product detail page.

3. Detailed Work Log / Task Breakdown
The core of your report. List each item you worked on.
Task ID
Task Description
Status
Effort (Hours)
Notes / Output
SIMS-45
Backend: Design InventoryAdjustment entity
Done
3
Created JPA entity with fields: id, product, quantity, reason (enum: RETURN, DAMAGE, LOSS, OTHER), note, createdBy, createdDate. Updated database schema (V5).
SIMS-46
Backend: Create AdjustmentRepository & Service layer
Done
4
Implemented saveAdjustment method which also updates the Product stock level. Added business logic to prevent negative stock.
SIMS-47
Backend: Implement REST Controller for adjustments
Done
3
Created AdjustmentController with POST and GET endpoints. Added input validation and proper HTTP status codes (201 Created, 400 Bad Request).
SIMS-52
Frontend: Integrate adjustment API into ProductDetail.vue
In Progress
2
Connected the "Adjust Stock" modal to the backend API. Form submission is functional; working on real-time table refresh.
SIMS-38
Bug Fix: Product search by SKU fails with special characters
Done
1.5
Fixed the issue in ProductRepository by correcting the LIKE query clause. PR #24 was merged.


Code Reviews & Team Collaboration
-
2.5
Reviewed PRs #22 (UI fix) and #25 (report module). Participated in design discussion for the stock alert system.


4. Key Achievements & Deliverables
Highlight what you successfully completed and delivered.
✅ Delivered Feature: Fully functional Inventory Adjustment backend module (API ready, integrated with database).
✅ Bug Resolution: Resolved critical search bug affecting user experience.
✅ Code Quality: Maintained >85% test coverage for new service classes. All new code follows project style guides.
✅ Collaboration: Provided constructive feedback on 2 peer PRs, facilitating knowledge sharing on error handling.

5. Challenges & Blockers
Demonstrate problem-solving and transparency.
Challenge: Initial design of the adjustment logic didn't account for concurrent stock updates, risking data integrity.
Solution: Researched and implemented optimistic locking using JPA's @Version annotation on the Product entity.
Blocker: Was blocked for half a day waiting for the UI design of the adjustment modal.
Action Taken: Used the time to write integration tests for the API and clarified requirements with the Product Owner to unblock myself.

6. Learning & Growth
Reflect on new skills or knowledge gained.
Technical: Gained practical experience with JPA optimistic locking for concurrency control.
Tooling: Learned to use the project's new performance profiling tool to verify API response times.
Domain Knowledge: Deepened my understanding of inventory management workflows, particularly in handling shrinkage.

7. Plans for Next Sprint
Show you are forward-thinking.
Complete the frontend integration for the adjustment module (SIMS-52).
Begin work on the Low Stock Alert feature (if assigned).
Write technical documentation for the new adjustment API for future team reference.
Aim to reduce number of minor bugs reported by improving unit test coverage for edge cases.

8. Metrics & Artifacts (Optional but impactful)
Attach or link to concrete evidence.
GitHub/GitLab: Link to your merged Pull Requests: #24, #26.
Trello/Jira: Screenshot of your completed tickets.
Code Coverage: Report snippet showing coverage for new code.
API Documentation: Screenshot of Swagger/Postman collection for the new endpoints.
