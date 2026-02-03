# Software Requirements Specification (SRS)

**Project:** Store Inventory Management System (SIMS)  
**Document Version:** 1.0  
**Date:** February 3, 2026  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Store Inventory Management System (SIMS), a web-based platform for managing engineering spare parts, inventory operations, procurement workflows, and maintenance requests with role-based access control.

### 1.2 Scope
SIMS provides centralized inventory management with real-time stock tracking, barcode-assisted transactions, procurement planning, maintenance integration, and reporting. The system is intended for use by storekeepers, procurement officers, maintenance technicians, and administrators within an engineering or manufacturing organization.

### 1.3 Definitions, Acronyms, and Abbreviations
- **SIMS**: Store Inventory Management System
- **MRF**: Material Request Form
- **PO**: Purchase Order
- **PR**: Purchase Requisition
- **RBAC**: Role-Based Access Control
- **KPI**: Key Performance Indicator

### 1.4 References
- Project overview and features: [README.md](README.md)
- Documentation index: [SRC/DOCUMENTATION_INDEX.md](SRC/DOCUMENTATION_INDEX.md)
- Completion summary: [SRC/COMPLETION_REPORT.md](SRC/COMPLETION_REPORT.md)
- Quick reference: [SRC/QUICK_REFERENCE.md](SRC/QUICK_REFERENCE.md)

### 1.5 Overview
This SRS defines functional and non-functional requirements, system features, user roles, interfaces, data requirements, and constraints.

---

## 2. Overall Description

### 2.1 Product Perspective
SIMS is a full-stack web application built with React and Firebase. It uses Firebase Authentication for identity and Firestore for data storage. The UI uses Material-UI, and Redux Toolkit manages client state.

### 2.2 Product Functions (High-Level)
- User authentication and role-based access control
- Master data management (parts, suppliers, assets, storage)
- Inventory transactions (stock in/out, transfers, adjustments)
- Procurement workflows (PR, PO, critical spares)
- Maintenance integration (MRF, work orders, machine history)
- Reporting and analytics (KPIs, movement history, stock valuation)

### 2.3 User Classes and Characteristics
- **Admin (A):** Full system access; manages users, groups, and master data.
- **Storekeeper (S):** Performs daily inventory operations and stock control.
- **Procurement Officer (P):** Manages suppliers, requisitions, and purchase orders.
- **Maintenance Technician (M):** Requests parts and logs maintenance activities.

### 2.4 Operating Environment
- Web browser (desktop and tablet supported)
- Firebase Authentication and Firestore backend
- Deployed via Firebase Hosting

### 2.5 Design and Implementation Constraints
- Firebase Authentication for user identity and session management
- Firestore as primary data store
- RBAC permissions enforced in UI routing and component access

### 2.6 User Documentation
- Developer guide: [SRC/QUICK_REFERENCE.md](SRC/QUICK_REFERENCE.md)
- Technical design: [SRC/INTEGRATION_SUMMARY.md](SRC/INTEGRATION_SUMMARY.md)
- Testing procedures: [SRC/TESTING_GUIDE.md](SRC/TESTING_GUIDE.md)

### 2.7 Assumptions and Dependencies
- Organization provides a Firebase project with required services enabled
- Users have network connectivity and modern browsers
- Barcoding hardware is supported via browser-based scanner input

---

## 3. Functional Requirements

### 3.1 Authentication and User Management
**FR-1** The system shall allow users to register with email, username, password, and user group selection.  
**FR-2** The system shall require admin approval for newly registered users before login.  
**FR-3** The system shall provide login, password reset, and change password functions.  
**FR-4** The system shall enforce role-based access control for pages and actions.

### 3.2 Role and Group Management
**FR-5** The system shall allow admins to create, update, and delete user groups.  
**FR-6** The system shall allow admins to assign users to groups and set user status (active, pending, inactive).  
**FR-7** The system shall persist group permissions in Firestore.

### 3.3 Master Data Management
**FR-8** The system shall allow authorized users to manage Part Master data, including barcode generation.  
**FR-9** The system shall allow authorized users to manage Part Group categories.  
**FR-10** The system shall allow authorized users to manage Storage Masters and Storage Locations.  
**FR-11** The system shall allow authorized users to manage Suppliers.  
**FR-12** The system shall allow authorized users to manage Assets/Machines.

### 3.4 Inventory Operations
**FR-13** The system shall support Stock In transactions with barcode scanning.  
**FR-14** The system shall support Stock Out transactions with barcode scanning.  
**FR-15** The system shall support Internal Transfers between storage locations.  
**FR-16** The system shall provide Movement Logs for all inventory transactions.  
**FR-17** The system shall support Stock Take creation and Stock Take processing.  
**FR-18** The system shall support Cycle Counting operations.  
**FR-19** The system shall allow Manual Adjustments for stock corrections.  
**FR-20** The system shall support receiving items against Purchase Orders.

### 3.5 Procurement and Replenishment
**FR-21** The system shall allow procurement officers to create and manage Purchase Requisitions.  
**FR-22** The system shall allow procurement officers to create and track Purchase Orders.  
**FR-23** The system shall support Critical Spares management.  
**FR-24** The system shall provide a Requisition Dashboard to monitor requests.  
**FR-25** The system shall provide Low Stock Alerts and reorder suggestions.

### 3.6 Maintenance Integration
**FR-26** The system shall allow maintenance technicians to create Material Request Forms (MRFs).  
**FR-27** The system shall allow storekeepers to process MRFs and issue parts.  
**FR-28** The system shall allow maintenance technicians to log Machine History.  
**FR-29** The system shall allow issuing parts to work orders and link to assets.

### 3.7 Reporting and Analytics
**FR-30** The system shall provide a KPI dashboard for key inventory metrics.  
**FR-31** The system shall provide Stock Inquiry reports.  
**FR-32** The system shall provide Stock Valuation reports.  
**FR-33** The system shall provide Movement History reports.  
**FR-34** The system shall provide Low Stock reports.  
**FR-35** The system shall support export of report data (CSV or PDF where available).

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Web UI with navigation, sidebar menus, data tables, forms, and modals
- Responsive layout for desktop and tablet
- Barcode input support on inventory pages

### 4.2 Hardware Interfaces
- Optional barcode scanners acting as keyboard input

### 4.3 Software Interfaces
- Firebase Authentication
- Firestore (NoSQL database)
- Firebase Hosting

### 4.4 Communications Interfaces
- HTTPS connections to Firebase services

---

## 5. Data Requirements

### 5.1 Core Collections (Firestore)
- **users**: uid, email, username, groupId, department, status, createdAt, passwordHistory
- **groups**: groupId, name, description, permissions, createdAt, updatedAt
- Additional collections for parts, suppliers, storage locations, assets, transactions, and reports

### 5.2 Data Integrity
- Required fields validated on create/update
- Stock quantities must not fall below zero (unless authorized adjustments)
- User status must be active for login

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page loads should complete within 3 seconds under normal network conditions.
- Inventory transactions should update stock levels in near real time.

### 6.2 Security
- Authentication via Firebase Authentication
- Role-based access control for routes and UI actions
- Audit-ready movement logs and user status enforcement

### 6.3 Reliability and Availability
- Target uptime aligned with Firebase Hosting SLA
- Data stored with Firestore redundancy

### 6.4 Usability
- Consistent UI patterns across modules
- Search, filter, and pagination in list views
- Error feedback for validation and data submission failures

### 6.5 Maintainability
- Modular React components and Redux state management
- Centralized role permissions in utility module

### 6.6 Compatibility
- Modern browsers (Chrome, Edge, Firefox)
- Tablet responsive layout

---

## 7. System Features (By Module)

### 7.1 Admin Master Data
- User Management (CRUD)
- User Group Management (CRUD)
- Parts, Part Groups, Storage, Suppliers, Assets (CRUD based on permissions)

### 7.2 Inventory Operations
- Stock In, Stock Out, Internal Transfer
- Stock Take, Stock Take Process, Cycle Counting
- Manual Adjustments, Movement Logs

### 7.3 Procurement
- Purchase Requisition, Purchase Order, Critical Spares, Requisition Dashboard

### 7.4 Maintenance
- Request Parts, MRF, Machine History, Work Order issue support

### 7.5 Reports
- Dashboard KPIs
- Stock Inquiry, Stock Valuation
- Movement History, Low Stock

---

## 8. Appendices

### 8.1 Role Summary
- **Admin (A):** Full access
- **Storekeeper (S):** Inventory operations and reporting
- **Procurement (P):** Procurement and supplier management
- **Maintenance (M):** Maintenance and asset management

### 8.2 Related Documents
- [SRC/COMPLETION_REPORT.md](SRC/COMPLETION_REPORT.md)
- [SRC/INTEGRATION_SUMMARY.md](SRC/INTEGRATION_SUMMARY.md)
- [SRC/TESTING_GUIDE.md](SRC/TESTING_GUIDE.md)
