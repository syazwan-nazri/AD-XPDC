# 🧰 Store Inventory Management System (SIMS)

A **Full-Stack Web Application** developed to streamline the management of engineering spare parts and inventory operations.  
This system ensures **accurate stock control**, **traceability of parts**, and **integration with maintenance workflows**, reducing downtime and optimizing procurement efficiency.

---

## � Table of Contents

1. [Project Overview](#project-overview)
2. [Project Goals & Objectives](#project-goals--objectives)
3. [System Architecture](#system-architecture)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Feature List](#feature-list)
6. [Module Breakdown](#module-breakdown)
7. [CRUD Operations by Role](#crud-operations-by-role)
8. [Page-wise Features & CRUD](#page-wise-features--crud)
9. [Database Schema](#database-schema)
10. [Technical Stack](#technical-stack)

---

## 🚀 Project Overview

The **Store Inventory Management System (SIMS)** is designed to digitalize the manual processes of engineering store operations.  
It enables storekeepers, procurement officers, and maintenance technicians to manage spare parts, issue items via barcode scanning, and track part usage across assets and work orders in real time.

The system is built with **React + Firebase** and provides:
- ✅ Real-time inventory tracking
- ✅ Role-based access control (4 distinct roles)
- ✅ Barcode scanning for fast issuance
- ✅ Automated low-stock alerts
- ✅ Comprehensive reporting and analytics
- ✅ Mobile-responsive design

---

## 🎯 Project Goals & Objectives

**Primary Goal:**  
To develop a **centralized digital platform** that automates inventory, procurement, and maintenance part-tracking processes — ensuring operational reliability, visibility, and data-driven decision-making.

**Key Objectives:**
1. ✅ Automate spare part tracking and issuance using barcode technology
2. ✅ Implement role-based access control (Admin, Storekeeper, Procurement, Maintenance)
3. ✅ Enable automated low-stock alerts and smart reorder suggestions
4. ✅ Provide real-time dashboards and analytical reporting
5. ✅ Reduce downtime by linking issued parts to maintenance work orders
6. ✅ Maintain audit trails for compliance and traceability
7. ✅ Simplify part and supplier management with master data screens
8. ✅ Provide data integrity through validation and error handling

---

## ⚙️ System Architecture

### Technology Stack
- **Frontend:** React (Functional Components + Hooks)
- **UI Framework:** Material-UI (MUI)
- **State Management:** Redux Toolkit
- **Backend:** Firebase Firestore (NoSQL Database)
- **Authentication:** Firebase Authentication
- **Hosting:** Firebase Hosting
- **Version Control:** GitHub

### System Modules
1. **User & Data Management** – Role-based access, CRUD for parts, suppliers, locations, and machines
2. **Inventory Operations** – Stock in/out, internal transfers, stock takes, cycle counting
3. **Procurement & Replenishment** – Purchase requisitions, POs, critical spares management
4. **Maintenance Integration** – Material Request Forms (MRF), work order tracking
5. **Reporting & Analytics** – Dashboards, KPIs, movement history, valuations
6. **Authentication & Security** – Login, password reset, role-based route protection

---

## 👥 User Roles & Permissions

The system supports **4 distinct user roles**, each with specific permissions and access levels:

### 1. **ADMIN** (Group ID: A)
**Full System Access** - Can access all modules and functions

**Permissions:**
- ✅ User Management (CRUD)
- ✅ User Group Management (CRUD)
- ✅ Part Master (CRUD)
- ✅ Part Group Master (CRUD)
- ✅ Storage Master (CRUD)
- ✅ Storage Locations (CRUD)
- ✅ Supplier Master (CRUD)
- ✅ Asset Registry (CRUD)
- ✅ All Inventory Operations
- ✅ All Procurement Operations
- ✅ All Reports & Analytics
- ✅ Stock Takes (full access)
- ✅ MRF (Material Request Forms)
- ✅ Stock Valuations

**Access Level:** All pages in the application

---

### 2. **STOREKEEPER** (Group ID: S)
**Inventory & Operations Focus** - Manages day-to-day inventory activities

**Permissions:**
- ✅ Part Master (READ, CREATE, UPDATE, DELETE)
- ✅ Part Group Master (READ, CREATE, UPDATE, DELETE)
- ✅ Storage Master (READ, UPDATE parts only)
- ✅ Storage Locations (READ, CREATE, UPDATE, DELETE)
- ✅ Asset Registry (READ only)
- ✅ Stock In / Stock Out (full operations)
- ✅ Internal Transfers (full operations)
- ✅ Movement Logs (READ only)
- ✅ Stock Take Processes (CRUD)
- ✅ Cycle Counting (CRUD)
- ✅ Manual Adjustments (CREATE, READ)
- ✅ MRF (READ, RECEIVE responses)
- ✅ Reports & Analytics (all except stock valuation)
- ❌ Cannot: Access procurement, user management, or financial data

**Access Level:** Inventory, Storage, Part Management, and Reports

---

### 3. **PROCUREMENT OFFICER** (Group ID: P)
**Procurement & Planning Focus** - Handles purchase and requisition management

**Permissions:**
- ✅ Part Master (READ only)
- ✅ Supplier Master (CRUD)
- ✅ Asset Registry (No access)
- ✅ Purchase Requisitions (CRUD)
- ✅ Purchase Orders (READ, CREATE)
- ✅ Critical Spares Management (CRUD)
- ✅ Requisition Dashboard (view all requisitions)
- ✅ Stock Take (READ only)
- ✅ Stock Valuation Reports (READ)
- ✅ Reports (Stock Inquiry, Movement History)
- ❌ Cannot: Perform stock operations, inventory management, or asset tracking

**Access Level:** Procurement, Suppliers, and relevant Reports

---

### 4. **MAINTENANCE TECHNICIAN** (Group ID: M)
**Maintenance & Asset Focus** - Manages work orders and asset maintenance

**Permissions:**
- ✅ Part Master (READ only)
- ✅ Asset Registry (CRUD)
- ✅ Machine History (READ, CREATE)
- ✅ Request Parts (CREATE, READ)
- ✅ MRF (Material Request Forms) - CREATE, READ, RECEIVE
- ✅ Reports (General access only)
- ❌ Cannot: Manage inventory, procurement, or storage operations

**Access Level:** Maintenance, Asset Management, and MRF

---

## 🎨 Feature List

### **Authentication & User Management**
- [ ] User Registration with email verification
- [ ] Role-based Login
- [ ] Password Reset via email
- [ ] Change Password functionality
- [ ] Session management and auto-logout
- [ ] User group management (Admin only)
- [ ] User deactivation/reactivation

### **Data Master Management**
- [ ] Part Master - Complete CRUD with barcode generation
- [ ] Part Group Master - Organize parts into categories
- [ ] Storage Master - Manage part storage locations and rack assignments
- [ ] Storage Locations - Detailed storage bin management
- [ ] Supplier Master - Supplier information and contact management
- [ ] Asset Registry (Machine Master) - Equipment and asset tracking
- [ ] User Master - User account management with roles

### **Inventory Operations**
- [ ] Stock In - Receive goods with barcode scanning
- [ ] Stock Out - Issue parts with barcode scanning
- [ ] Internal Transfer - Move stock between locations
- [ ] Movement Logs - Track all inventory movements
- [ ] Stock Take - Physical count and reconciliation
- [ ] Cycle Counting - Regular inventory verification
- [ ] Manual Adjustments - Correct stock discrepancies
- [ ] Receive PO - Goods receipt from purchase orders

### **Procurement & Replenishment**
- [ ] Purchase Requisitions - Create and manage requisitions
- [ ] Purchase Orders - Create and track orders
- [ ] Critical Spares Management - Identify and manage critical items
- [ ] Requisition Dashboard - Monitor all active requisitions
- [ ] Low Stock Alerts - Automatic notifications for low stock items
- [ ] Reorder Suggestions - AI-driven reorder recommendations

### **Maintenance Integration**
- [ ] Material Request Forms (MRF) - Request parts for maintenance
- [ ] Issue Work Order - Create work orders and request parts
- [ ] Machine History - Track maintenance history per asset
- [ ] Request Parts - Technicians can request parts for specific work orders

### **Reporting & Analytics**
- [ ] Dashboard KPIs - Real-time key performance indicators
- [ ] Stock Inquiry Report - Check part availability and location
- [ ] Stock Valuation Report - Financial value of inventory
- [ ] Movement History - Detailed part movement tracking
- [ ] Low Stock Alert Report - Critical stock levels
- [ ] Stock Movement Report - Inbound/outbound analysis

### **System Features**
- [ ] Barcode Scanning (for stock operations)
- [ ] CSV Import/Export - Bulk operations
- [ ] Real-time notifications (Snackbars)
- [ ] Search & Filter on all list pages
- [ ] Pagination (50 items/page standard)
- [ ] Responsive design (Desktop & Tablet)
- [ ] Audit trails (who did what and when)
- [ ] Data validation and error handling

---

## 📦 Module Breakdown

### **1. ADMIN MASTER DATA** (Data Input Master Section)
**Purpose:** Central hub for managing all master data and system configuration

**Pages:**
| Page | Route | CRUD | Access |
|------|-------|------|--------|
| User Master | `/admin/user-master` | CRUD | Admin Only |
| User Group Master | `/admin/user-group-master` | CRUD | Admin Only |
| Part Master | `/admin/part-master` | CRUD | Admin, Storekeeper, Procurement |
| Part Group Master | `/admin/part-group-master` | CRUD | Admin, Storekeeper |
| Storage Master | `/admin/bin-master` | R, U* | Admin, Storekeeper |
| Storage Locations | `/admin/storage-locations` | CRUD | Admin, Storekeeper |
| Supplier Master | `/admin/supplier-master` | CRUD | Admin, Procurement |
| Machine Master (Asset Registry) | `/admin/machine-master` | CRUD | Admin, Maintenance |

**Key Features:**
- Comprehensive master data management
- Validation and constraints enforcement
- Bulk import capabilities (CSV)
- Search, filter, and pagination
- Modern UI with color-coded sections

---

### **2. INVENTORY OPERATIONS** (Stock Movement Section)
**Purpose:** Day-to-day inventory management and stock transactions

**Pages:**
| Page | Route | Function | Access |
|------|-------|----------|--------|
| Stock In | `/inventory/stock-in` | Receive goods with barcode scanning | Storekeeper |
| Stock Out | `/inventory/stock-out` | Issue parts with barcode scanning | Storekeeper |
| Internal Transfer | `/inventory/internal-transfer` | Move stock between locations | Storekeeper |
| Movement Logs | `/inventory/movement-logs` | View all inventory movements | Storekeeper |
| Stock Take | `/inventory/stock-take` | Create physical count cycles | Storekeeper, Procurement |
| Stock Take Process | `/inventory/stock-take/process` | Perform physical counting | Storekeeper |
| MRF (Material Request Form) | `/inventory/mrf` | Handle maintenance requests | Storekeeper, Maintenance |

**Key Features:**
- Real-time stock level updates
- Barcode scanning integration
- Location-aware operations
- Transaction history tracking
- Quantity validations

---

### **3. PROCUREMENT** (Purchasing Section)
**Purpose:** Handle purchase requisitions, orders, and supplier management

**Pages:**
| Page | Route | Function | Access |
|------|-------|----------|--------|
| Purchase Requisition | `/procurement/purchase-requisition` | Create and manage requisitions | Procurement |
| Purchase Order | `/procurement/purchase-order` | Create and track purchase orders | Procurement |
| Critical Spares | `/procurement/critical-spares` | Manage critical spare parts | Procurement |
| Requisition Dashboard | `/procurement/requisition-dashboard` | Monitor all requisitions | Procurement |

**Key Features:**
- Automated requisition workflow
- Purchase order creation from requisitions
- Supplier integration
- Cost tracking and budgeting
- Status monitoring and notifications

---

### **4. MAINTENANCE INTEGRATION** (Maintenance Section)
**Purpose:** Link maintenance activities with inventory management

**Pages:**
| Page | Route | Function | Access |
|------|-------|----------|--------|
| Request Parts | `/maintenance/request-parts` | Technicians request parts | Maintenance |
| Machine History | `/maintenance/machine-history` | Track asset maintenance history | Maintenance |
| Issue Work Order | `/storekeeper/issue-work-order` | Create MRF for work orders | Storekeeper |

**Key Features:**
- Work order to parts linkage
- Asset maintenance tracking
- Material request fulfillment
- Historical record keeping

---

### **5. REPORTING & ANALYTICS** (Reports Section)
**Purpose:** Provide insights and analytics for decision-making

**Pages:**
| Page | Route | Function | Access |
|------|-------|----------|--------|
| Dashboard KPIs | `/reports/dashboard-kpis` | Real-time KPI dashboard | All |
| Stock Inquiry | `/reports/stock-inquiry` | Check part availability | All |
| Stock Valuation | `/reports/stock-valuation` | Financial inventory value | All (except Maintenance) |
| Movement History | `/reports/stock-movement` | Track part movements | All |
| Low Stock Alert | `/reports/low-stock` | Critical stock levels | All |

**Key Features:**
- Real-time data visualization
- Filtering and sorting
- Export to CSV/PDF
- Historical trend analysis
- Custom report generation

---

## 🔄 CRUD Operations by Role

### **ADMIN - Full Access to All CRUD Operations**

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Users | ✅ | ✅ | ✅ | ✅ |
| User Groups | ✅ | ✅ | ✅ | ✅ |
| Parts | ✅ | ✅ | ✅ | ✅ |
| Part Groups | ✅ | ✅ | ✅ | ✅ |
| Storage Locations | ✅ | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ | ✅ |
| Machines/Assets | ✅ | ✅ | ✅ | ✅ |
| Stock Transactions | ✅ | ✅ | ✅ | ✅ |
| Purchase Orders | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | N/A | N/A |

---

### **STOREKEEPER - Inventory & Operations Focus**

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Parts | ✅ | ✅ | ✅ | ✅ |
| Part Groups | ✅ | ✅ | ✅ | ✅ |
| Storage Locations | ✅ | ✅ | ✅ | ✅ |
| Storage Master (Rack Assignments) | ❌ | ✅ | ✅ Parts Only | ❌ |
| Stock In/Out | ✅ | ✅ | ✅ | ✅ |
| Internal Transfers | ✅ | ✅ | ✅ | ✅ |
| Movement Logs | ❌ | ✅ | ❌ | ❌ |
| Stock Take | ✅ | ✅ | ✅ | ✅ |
| Cycle Counting | ✅ | ✅ | ✅ | ✅ |
| Manual Adjustments | ✅ | ✅ | ❌ | ❌ |
| MRF | ❌ | ✅ | ✅ | ❌ |
| Reports | ❌ | ✅ | N/A | N/A |

---

### **PROCUREMENT OFFICER - Procurement & Planning Focus**

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Parts | ❌ | ✅ | ❌ | ❌ |
| Suppliers | ✅ | ✅ | ✅ | ✅ |
| Purchase Requisitions | ✅ | ✅ | ✅ | ✅ |
| Purchase Orders | ✅ | ✅ | ✅ | ✅ |
| Critical Spares | ✅ | ✅ | ✅ | ✅ |
| Stock Take | ❌ | ✅ | ❌ | ❌ |
| Reports (Procurement & Stock) | ❌ | ✅ | N/A | N/A |

---

### **MAINTENANCE TECHNICIAN - Maintenance & Asset Focus**

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Parts | ❌ | ✅ | ❌ | ❌ |
| Machines/Assets | ✅ | ✅ | ✅ | ✅ |
| Machine History | ✅ | ✅ | ✅ | ✅ |
| Request Parts | ✅ | ✅ | ✅ | ✅ |
| MRF | ✅ | ✅ | ✅ | ❌ |
| Reports | ❌ | ✅ | N/A | N/A |

---

## 📄 Page-wise Features & CRUD

### **1. USER MASTER** (`/admin/user-master`)
**Role Access:** Admin Only

**Features:**
- ✅ Create new user accounts with email and password
- ✅ View all users in paginated table (50 items/page)
- ✅ Search users by name, email, or ID
- ✅ Edit user details (name, email, group assignment)
- ✅ Delete user accounts
- ✅ View user details in dialog form
- ✅ Real-time validation
- ✅ Status indicators for active/inactive users

**CRUD Operations:**
- **CREATE:** New user registration via admin panel
- **READ:** List all users with search and filter
- **UPDATE:** Modify user information and role assignment
- **DELETE:** Remove user accounts from system

**Data Fields:**
- User ID, Name, Email, Assigned Group, Status, Created Date, Last Modified

---

### **2. USER GROUP MASTER** (`/admin/user-group-master`)
**Role Access:** Admin Only

**Features:**
- ✅ Create user groups/roles
- ✅ Assign permissions to groups
- ✅ View all user groups
- ✅ Edit group details and permissions
- ✅ Delete user groups
- ✅ View members in each group
- ✅ Permission matrix display

**CRUD Operations:**
- **CREATE:** Define new user groups with specific permissions
- **READ:** List all groups with member counts
- **UPDATE:** Modify group details and permission assignments
- **DELETE:** Remove user groups (if no members)

**Data Fields:**
- Group ID, Group Name, Description, Permissions, Member Count, Status

---

### **3. PART MASTER** (`/admin/part-master`)
**Role Access:** Admin, Storekeeper, Procurement

**Features:**
- ✅ Create parts with SAP#, internal reference, name, category
- ✅ Assign parts to material groups
- ✅ Set safety stock levels and reorder quantities
- ✅ Manage part descriptions and specifications
- ✅ Auto-generate barcode for parts
- ✅ CSV bulk import with duplicate detection
- ✅ Advanced search by SAP#, name, category, barcode
- ✅ Smart sorting (low stock items prioritized)
- ✅ Color-coded display (red=out of stock, amber=low stock)
- ✅ View related parts and storage locations
- ✅ 10 items/page for inventory management focus

**CRUD Operations:**
- **CREATE:** Add new parts with validation
- **READ:** List parts with search, filter, and sort
- **UPDATE:** Modify part details, safety levels, categories
- **DELETE:** Remove parts from system
- **IMPORT:** Bulk upload via CSV

**Data Fields:**
- SAP#, Internal Ref, Name, Category, Material Group, Safety Level, Reorder Qty, Current Stock, Barcode, Unit, Description

---

### **4. PART GROUP MASTER** (`/admin/part-group-master`)
**Role Access:** Admin, Storekeeper

**Features:**
- ✅ Create material groups/categories
- ✅ List all material groups with part counts
- ✅ View parts assigned to each group
- ✅ Manage parts awaiting assignment (10 items/page)
- ✅ Assign parts to groups
- ✅ Edit group details
- ✅ Delete groups (if no parts assigned)
- ✅ Search and filter groups
- ✅ Three-section layout: Groups, Pending Assignments, Assigned Parts

**CRUD Operations:**
- **CREATE:** Create new material groups
- **READ:** List groups and view part assignments
- **UPDATE:** Modify group details and part assignments
- **DELETE:** Remove groups
- **ASSIGN:** Move parts between groups

**Data Fields:**
- Group ID, Material Group Name, Part Count, Description, Created Date

---

### **5. STORAGE MASTER** (`/admin/bin-master`)
**Role Access:** Admin, Storekeeper

**Features:**
- ✅ Manage spare parts storage locations
- ✅ Assign rack numbers and levels to parts
- ✅ View all parts with their storage assignments
- ✅ Search parts by SAP#, name, rack number, level
- ✅ Color-coded display for stock status
- ✅ Edit rack assignments for parts
- ✅ Delete parts from storage
- ✅ 50 items/page pagination
- ✅ Stat cards showing total parts and low stock count
- ✅ Blue gradient modern UI

**CRUD Operations:**
- **CREATE:** Add storage assignments to parts (in Storage Locations)
- **READ:** List all parts with storage locations
- **UPDATE:** Modify rack number and level assignments
- **DELETE:** Remove part storage assignments
- **VIEW:** See full storage details and part info

**Data Fields:**
- SAP#, Part Name, Category, Rack #, Level, Stock, Material Group, Actions

---

### **6. STORAGE LOCATIONS** (`/admin/storage-locations`)
**Role Access:** Admin, Storekeeper

**Features:**
- ✅ Create storage bin locations with group ID, material group, rack details
- ✅ Flexible material group assignment (dropdown + custom option)
- ✅ Assign rack numbers (00-99) and levels (A-D)
- ✅ Add descriptions for storage locations
- ✅ Search and filter locations by any field
- ✅ Edit location details
- ✅ Delete storage locations
- ✅ 50 items/page pagination
- ✅ Stat cards for total locations and found count
- ✅ Cyan gradient modern UI with chips for visual grouping
- ✅ Real-time validation for rack numbers and levels

**CRUD Operations:**
- **CREATE:** Create new storage location bins
- **READ:** List all storage locations with search
- **UPDATE:** Modify location details, rack assignments
- **DELETE:** Remove storage locations
- **SEARCH:** Filter by group ID, material group, rack, level, description

**Data Fields:**
- Bin ID (Group ID), Material Group, Rack Number, Rack Level, Description, Created Date

**Validation Rules:**
- Bin ID: Exactly 4 letters (e.g., A001, B002)
- Rack Number: Exactly 2 digits (00-99)
- Rack Level: Single letter A, B, C, or D

---

### **7. SUPPLIER MASTER** (`/admin/supplier-master`)
**Role Access:** Admin, Procurement

**Features:**
- ✅ Create supplier profiles with company details
- ✅ Store contact information (phone, email, address)
- ✅ Manage supplier types (vendors, distributors, manufacturers)
- ✅ Set supplier ratings and performance metrics
- ✅ View parts sourced from each supplier
- ✅ Search suppliers by name, contact, location
- ✅ Edit supplier details
- ✅ Deactivate/activate suppliers
- ✅ Track supplier status (active/inactive)

**CRUD Operations:**
- **CREATE:** Register new suppliers
- **READ:** List all suppliers with details
- **UPDATE:** Modify supplier information
- **DELETE:** Remove supplier records

**Data Fields:**
- Supplier ID, Company Name, Contact Person, Phone, Email, Address, City, Country, Type, Rating, Status

---

### **8. MACHINE MASTER / ASSET REGISTRY** (`/admin/machine-master`)
**Role Access:** Admin, Maintenance

**Features:**
- ✅ Create machine/equipment records
- ✅ Track asset information (model, serial number, location)
- ✅ Assign critical spare parts to machines
- ✅ Link machines to departments/areas
- ✅ Maintain machine status (active/inactive/retired)
- ✅ View maintenance history per machine
- ✅ Search machines by name, serial, department
- ✅ Edit machine details
- ✅ Delete machine records

**CRUD Operations:**
- **CREATE:** Register new machines/assets
- **READ:** List all machines with details
- **UPDATE:** Modify machine information
- **DELETE:** Remove machine records

**Data Fields:**
- Machine ID, Name, Model, Serial #, Department, Location, Status, Manufacturer, Installation Date, Last Service Date

---

### **9. STOCK IN** (`/inventory/stock-in`)
**Role Access:** Storekeeper

**Features:**
- ✅ Receive goods from suppliers/purchases
- ✅ Barcode scanning for quick entry
- ✅ Select part and enter quantity received
- ✅ Add purchase order/receipt reference
- ✅ Record supplier and batch details
- ✅ Assign storage location automatically
- ✅ Real-time stock level update
- ✅ Confirmation and audit trail
- ✅ Create multiple stock in transactions
- ✅ View recent transactions

**CRUD Operations:**
- **CREATE:** Create stock-in transactions
- **READ:** View stock-in history
- **UPDATE:** Modify pending transactions
- **DELETE:** Cancel transactions (with audit)

**Data Fields:**
- Transaction ID, Part (SAP#), Quantity, Location, Supplier, Receipt Date, Reference #, Remarks, Created By

---

### **10. STOCK OUT** (`/inventory/stock-out`)
**Role Access:** Storekeeper

**Features:**
- ✅ Issue parts from inventory
- ✅ Barcode scanning for part selection
- ✅ Link to work orders or requisitions
- ✅ Select storage location
- ✅ Reduce stock levels in real-time
- ✅ Add issue reason/remarks
- ✅ Confirm before submission
- ✅ Generate issue receipt
- ✅ View stock-out history
- ✅ Prevent overselling (stock validation)

**CRUD Operations:**
- **CREATE:** Create stock-out transactions
- **READ:** View issue history
- **UPDATE:** Modify pending issues
- **DELETE:** Cancel issues (with audit)

**Data Fields:**
- Transaction ID, Part (SAP#), Quantity, Location, Work Order #, Issue Date, Issued To, Remarks, Created By

---

### **11. INTERNAL TRANSFER** (`/inventory/internal-transfer`)
**Role Access:** Storekeeper

**Features:**
- ✅ Move stock between storage locations
- ✅ Barcode scanning for part entry
- ✅ Select source and destination locations
- ✅ Track transfer reason
- ✅ Real-time location updates
- ✅ Prevent invalid transfers (validation)
- ✅ Transfer history with timestamps
- ✅ Audit trail for all movements

**CRUD Operations:**
- **CREATE:** Create transfer transactions
- **READ:** View transfer history
- **UPDATE:** Modify pending transfers
- **DELETE:** Cancel transfers

**Data Fields:**
- Transfer ID, Part (SAP#), Quantity, From Location, To Location, Reason, Transfer Date, Created By

---

### **12. MOVEMENT LOGS** (`/inventory/movement-logs`)
**Role Access:** Storekeeper (Read Only), Procurement (Read Only)

**Features:**
- ✅ View all inventory movements (Stock In, Stock Out, Transfers)
- ✅ Detailed transaction history
- ✅ Filter by date range, part, type, location
- ✅ Search movements by part name or SAP#
- ✅ View transaction details (who, when, what, where)
- ✅ Print and export movement reports
- ✅ Audit trail for compliance
- ✅ Pagination for large datasets

**CRUD Operations:**
- **READ ONLY:** View all movements with full details
- **FILTER:** Advanced filtering by multiple criteria
- **EXPORT:** Export to CSV/PDF

**Data Fields:**
- Transaction ID, Type (In/Out/Transfer), Part (SAP#), Quantity, Location(s), Date, Time, User, Reason, Status

---

### **13. STOCK TAKE** (`/inventory/stock-take`)
**Role Access:** Storekeeper, Procurement

**Features:**
- ✅ Create physical inventory count cycles
- ✅ Set count areas and responsible persons
- ✅ Generate count sheets (printed/digital)
- ✅ Schedule counts by location or part category
- ✅ Track count status (scheduled, in-progress, completed)
- ✅ Compare counted vs system quantities
- ✅ Generate variance reports
- ✅ Reconcile differences
- ✅ View historical counts

**CRUD Operations:**
- **CREATE:** Create new stock take cycles
- **READ:** List all cycles with status
- **UPDATE:** Modify cycle details before finalization
- **DELETE:** Cancel cycles (with restrictions)

**Data Fields:**
- Cycle ID, Count Date, Location, Department, Supervisor, Status, Count Start, Count End, Variance %, Initiated By

---

### **14. STOCK TAKE PROCESS** (`/inventory/stock-take/process`)
**Role Access:** Storekeeper

**Features:**
- ✅ Perform physical counting for active stock take cycles
- ✅ Barcode scanning for part verification
- ✅ Manual entry of counted quantities
- ✅ Real-time variance highlighting
- ✅ Add count remarks/notes
- ✅ Complete count when done
- ✅ Submit for reconciliation
- ✅ View parts yet to count
- ✅ Partial count support (multi-user counting)

**CRUD Operations:**
- **CREATE:** Add count entries for parts
- **READ:** View parts to be counted
- **UPDATE:** Modify count entries before submission
- **DELETE:** Remove incorrect entries

**Data Fields:**
- Cycle ID, Part (SAP#), System Qty, Counted Qty, Variance, Remarks, Counted By, Date, Time

---

### **15. MRF / MATERIAL REQUEST FORM** (`/inventory/mrf`)
**Role Access:** Storekeeper, Maintenance Technician

**Features:**
- ✅ Create MRF for maintenance work orders
- ✅ Request multiple parts in single form
- ✅ Link to specific machines/assets
- ✅ Priority levels for urgent requests
- ✅ Track MRF status (pending, approved, fulfilled, rejected)
- ✅ Attach documentation (work orders, specifications)
- ✅ View all MRFs with status
- ✅ Approve/Reject MRFs (as needed)
- ✅ Fulfill MRFs by issuing parts
- ✅ Generate MRF reports

**CRUD Operations:**
- **CREATE:** Create new MRFs for maintenance
- **READ:** View all MRFs and details
- **UPDATE:** Modify MRF status, add fulfillment
- **DELETE:** Cancel MRFs (with restrictions)

**Data Fields:**
- MRF ID, Work Order #, Machine/Asset, Parts Requested, Quantity, Priority, Status, Request Date, Due Date, Requested By, Fulfilled By

---

### **16. PURCHASE REQUISITION** (`/procurement/purchase-requisition`)
**Role Access:** Procurement Officer

**Features:**
- ✅ Create purchase requisitions for parts
- ✅ Set quantity, expected delivery date, budget
- ✅ Select supplier or leave open
- ✅ Add cost and delivery requirements
- ✅ Requisition approval workflow
- ✅ Track requisition status (draft, submitted, approved, ordered)
- ✅ View all requisitions with filters
- ✅ Convert approved requisitions to POs
- ✅ Manage requisition approvers

**CRUD Operations:**
- **CREATE:** Create new purchase requisitions
- **READ:** List all requisitions with status
- **UPDATE:** Modify requisition details, update status
- **DELETE:** Cancel draft requisitions

**Data Fields:**
- Requisition ID, Part (SAP#), Quantity, Unit Cost, Total Cost, Supplier, Expected Delivery, Request Date, Status, Requested By, Approved By

---

### **17. PURCHASE ORDER** (`/procurement/purchase-order`)
**Role Access:** Procurement Officer

**Features:**
- ✅ Create purchase orders from requisitions or standalone
- ✅ Add multiple line items with quantities and pricing
- ✅ Assign supplier and delivery terms
- ✅ Track PO status (draft, sent, acknowledged, received, closed)
- ✅ Set delivery schedules
- ✅ Add payment terms and conditions
- ✅ Generate PO documents (print/email)
- ✅ Track goods receipt against PO
- ✅ View all POs with filter options
- ✅ Manage PO amendments

**CRUD Operations:**
- **CREATE:** Create new purchase orders
- **READ:** List all POs with full details
- **UPDATE:** Modify PO details, receive goods, close PO
- **DELETE:** Cancel draft POs

**Data Fields:**
- PO #, Supplier, Parts, Quantities, Unit Prices, Total Cost, Delivery Date, Terms, Status, Created Date, Received Qty

---

### **18. CRITICAL SPARES MANAGEMENT** (`/procurement/critical-spares`)
**Role Access:** Procurement Officer

**Features:**
- ✅ Identify and manage critical spare parts
- ✅ Set minimum stock levels for critical items
- ✅ Link critical spares to machines
- ✅ Track criticality rating (high/medium/low)
- ✅ Monitor stock levels for critical items
- ✅ Set automatic reorder points
- ✅ Generate critical spares list
- ✅ Alert when critical stock drops below threshold
- ✅ Maintain critical spare history

**CRUD Operations:**
- **CREATE:** Mark parts as critical
- **READ:** List all critical spares with status
- **UPDATE:** Modify criticality levels and reorder points
- **DELETE:** Remove critical designation

**Data Fields:**
- Part (SAP#), Machine/Asset, Criticality Level, Min Stock, Max Stock, Reorder Qty, Supplier, Lead Time, Last Updated

---

### **19. REQUISITION DASHBOARD** (`/procurement/requisition-dashboard`)
**Role Access:** Procurement Officer

**Features:**
- ✅ Real-time requisition status overview
- ✅ KPI metrics (total requisitions, pending, approved, ordered)
- ✅ Filter requisitions by status, date, requester
- ✅ Sort by priority, date, value
- ✅ View requisition details in side panel
- ✅ Quick actions (approve, order, reject)
- ✅ Search requisitions by ID, part name, requester
- ✅ Export requisition list to CSV
- ✅ Timeline view of requisition progress

**CRUD Operations:**
- **READ:** View all requisitions with detailed filtering
- **UPDATE:** Update status, add approvals, create POs
- **FILTER:** Advanced filtering by multiple fields

---

### **20. REQUEST PARTS** (`/maintenance/request-parts`)
**Role Access:** Maintenance Technician

**Features:**
- ✅ Technicians can request parts for work orders
- ✅ Search parts by name or SAP#
- ✅ Check part availability and location
- ✅ Add quantities needed
- ✅ Link request to specific work orders
- ✅ Set priority (routine/urgent)
- ✅ View request history
- ✅ Track fulfillment status
- ✅ Receive confirmation when issued

**CRUD Operations:**
- **CREATE:** Create new part requests
- **READ:** View request history and status
- **UPDATE:** Modify request details before fulfillment
- **DELETE:** Cancel requests

**Data Fields:**
- Request ID, Work Order #, Parts, Quantities, Priority, Status, Request Date, Fulfilled Date, Fulfilled By

---

### **21. MACHINE HISTORY** (`/maintenance/machine-history`)
**Role Access:** Maintenance Technician

**Features:**
- ✅ View complete maintenance history per machine
- ✅ Record maintenance activities (service, repair, replacement)
- ✅ Link maintenance to work orders
- ✅ Record parts replaced during maintenance
- ✅ Document technician and date of service
- ✅ Add notes and findings
- ✅ Track downtime and service duration
- ✅ Schedule preventive maintenance
- ✅ View maintenance timeline and trends

**CRUD Operations:**
- **CREATE:** Record new maintenance activities
- **READ:** View all maintenance records for a machine
- **UPDATE:** Modify maintenance details
- **DELETE:** Remove maintenance records (with restrictions)

**Data Fields:**
- History ID, Machine, Maintenance Type, Date, Duration, Technician, Work Order #, Parts Used, Findings, Next Service Date

---

### **22. ISSUE WORK ORDER** (`/storekeeper/issue-work-order`)
**Role Access:** Storekeeper

**Features:**
- ✅ Create Material Request Forms (MRF) linked to work orders
- ✅ Receive maintenance requests from technicians
- ✅ Issue requested parts
- ✅ Track MRF status and fulfillment
- ✅ Maintain MRF history
- ✅ Link multiple parts to single work order
- ✅ Generate picking lists
- ✅ Confirm part receipt by technician

**CRUD Operations:**
- **CREATE:** Create MRF for work orders
- **READ:** View all MRFs with details
- **UPDATE:** Update MRF status and fulfill requests
- **DELETE:** Cancel MRFs (with restrictions)

**Data Fields:**
- MRF ID, Work Order #, Machine/Asset, Parts Requested, Qty, Status, Request Date, Fulfilled Date, Fulfilled By

---

### **23. RECEIVE PO** (`/storekeeper/receive-po`)
**Role Access:** Storekeeper

**Features:**
- ✅ Receive goods from purchase orders
- ✅ Barcode scanning for part verification
- ✅ Match received quantities against PO
- ✅ Record receipt date and time
- ✅ Add quality comments or issues
- ✅ Accept or reject items
- ✅ Trigger stock-in upon acceptance
- ✅ Update PO receipt status
- ✅ Track receiving history

**CRUD Operations:**
- **CREATE:** Create receipt transactions
- **READ:** View POs awaiting receipt
- **UPDATE:** Record received quantities, accept/reject items
- **DELETE:** Cancel receipts (with audit)

**Data Fields:**
- PO #, Part (SAP#), Qty Ordered, Qty Received, Receipt Date, Quality Status, Remarks, Received By, Location

---

### **24. DASHBOARD KPIS** (`/reports/dashboard-kpis`)
**Role Access:** All Roles

**Features:**
- ✅ Real-time KPI metrics and indicators
- ✅ Total parts in inventory
- ✅ Low stock items count
- ✅ Out-of-stock items count
- ✅ Inventory turnover rate
- ✅ Pending requisitions count
- ✅ Pending purchase orders
- ✅ Stock value/valuation
- ✅ Supplier performance metrics
- ✅ Department-wise stock distribution
- ✅ Graphical representation (charts, gauges)
- ✅ Drill-down to detailed data

**Features:**
- **READ ONLY:** View KPIs and metrics
- **FILTER:** Filter by time period, category, department
- **EXPORT:** Export reports to PDF

---

### **25. STOCK INQUIRY REPORT** (`/reports/stock-inquiry`)
**Role Access:** All Roles

**Features:**
- ✅ Check part availability and location
- ✅ Search parts by SAP#, name, category
- ✅ View current stock levels
- ✅ See storage location for each part
- ✅ Track stock value
- ✅ View reorder information
- ✅ Print inquiry report
- ✅ Export to CSV/Excel

**CRUD Operations:**
- **READ ONLY:** Query stock levels
- **FILTER:** Advanced search and filter
- **EXPORT:** Export report

**Data Fields:**
- SAP#, Part Name, Category, Current Stock, Unit Cost, Total Value, Location, Reorder Qty, Safety Level, Status

---

### **26. STOCK VALUATION REPORT** (`/reports/stock-valuation`)
**Role Access:** All Roles (except Maintenance)

**Features:**
- ✅ Financial valuation of inventory
- ✅ Calculate total inventory value
- ✅ Valuation by category/group
- ✅ Valuation by location
- ✅ Cost analysis per part
- ✅ Compare actual vs standard costs
- ✅ Identify slow-moving items
- ✅ ABC analysis (high/medium/low value)
- ✅ Generate financial reports

**CRUD Operations:**
- **READ ONLY:** View valuation data
- **FILTER:** Filter by category, location, value range
- **EXPORT:** Export valuation report

**Data Fields:**
- SAP#, Part Name, Qty, Unit Cost, Total Cost, Category, Location, Movement Frequency, Valuation Date

---

### **27. MOVEMENT HISTORY REPORT** (`/reports/stock-movement`)
**Role Access:** All Roles

**Features:**
- ✅ Track all part movements over time
- ✅ Filter by date range, part, type (in/out/transfer)
- ✅ View inbound vs outbound quantities
- ✅ Analyze movement patterns
- ✅ Identify fast-moving and slow-moving parts
- ✅ Department-wise usage tracking
- ✅ Trend analysis
- ✅ Print and export movement reports

**CRUD Operations:**
- **READ ONLY:** View movement history
- **FILTER:** Advanced filtering by multiple criteria
- **EXPORT:** Export report

**Data Fields:**
- Date, Part (SAP#), Movement Type, Qty, Location, From/To, Reason, User, Status

---

### **28. LOW STOCK ALERT REPORT** (`/reports/low-stock`)
**Role Access:** All Roles

**Features:**
- ✅ Identify parts below safety stock level
- ✅ Highlight out-of-stock items
- ✅ Calculate reorder quantities
- ✅ Flag critical items needing immediate action
- ✅ Suggest suppliers and lead times
- ✅ Email alerts for low stock (configurable)
- ✅ Historical low stock tracking
- ✅ Generate procurement recommendations

**CRUD Operations:**
- **READ ONLY:** View low stock items
- **FILTER:** Filter by criticality, category, location
- **EXPORT:** Export alert report

**Data Fields:**
- SAP#, Part Name, Current Stock, Safety Level, Reorder Qty, Days to Stockout, Recommended Supplier, Lead Time, Action Required

---

## 🗄️ Database Schema

### **Collections in Firebase Firestore**

```
Store Inventory Management System (SIMS)
│
├── users/
│   ├── userId
│   │   ├── name: string
│   │   ├── email: string
│   │   ├── groupId: string (A/S/P/M)
│   │   ├── status: string (active/inactive)
│   │   ├── mustChangePassword: boolean
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── parts/
│   ├── partId
│   │   ├── sapNumber: string
│   │   ├── internalRef: string
│   │   ├── name: string
│   │   ├── category: string
│   │   ├── materialGroupId: string
│   │   ├── currentStock: number
│   │   ├── safetyLevel: number
│   │   ├── reorderQuantity: number
│   │   ├── unitCost: number
│   │   ├── barcode: string
│   │   ├── unit: string
│   │   ├── rackNumber: string
│   │   ├── rackLevel: string
│   │   ├── description: string
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── materialGroups/
│   ├── groupId
│   │   ├── materialGroup: string
│   │   ├── description: string
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── storageLocations/
│   ├── locationId
│   │   ├── binId: string (Group ID - 4 letters)
│   │   ├── materialGroup: string
│   │   ├── rackNumber: string (2 digits)
│   │   ├── rackLevel: string (A-D)
│   │   ├── description: string
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── suppliers/
│   ├── supplierId
│   │   ├── companyName: string
│   │   ├── contactPerson: string
│   │   ├── phone: string
│   │   ├── email: string
│   │   ├── address: string
│   │   ├── city: string
│   │   ├── country: string
│   │   ├── type: string (vendor/distributor/manufacturer)
│   │   ├── rating: number
│   │   ├── status: string (active/inactive)
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── machines/
│   ├── machineId
│   │   ├── name: string
│   │   ├── model: string
│   │   ├── serialNumber: string
│   │   ├── department: string
│   │   ├── location: string
│   │   ├── manufacturer: string
│   │   ├── installationDate: date
│   │   ├── lastServiceDate: date
│   │   ├── status: string (active/inactive/retired)
│   │   ├── criticalSpares: array[partIds]
│   │   ├── createdDate: timestamp
│   │   └── lastModified: timestamp
│   │
│
├── stockTransactions/
│   ├── transactionId
│   │   ├── type: string (IN/OUT/TRANSFER)
│   │   ├── partId: string
│   │   ├── quantity: number
│   │   ├── fromLocation: string
│   │   ├── toLocation: string
│   │   ├── supplierId: string (for IN)
│   │   ├── workOrderId: string (for OUT)
│   │   ├── reason: string
│   │   ├── transactionDate: timestamp
│   │   ├── createdBy: string (userId)
│   │   ├── status: string (pending/confirmed/rejected)
│   │   └── remarks: string
│   │
│
├── purchaseRequisitions/
│   ├── requisitionId
│   │   ├── partId: string
│   │   ├── quantity: number
│   │   ├── unitCost: number
│   │   ├── supplierId: string (optional)
│   │   ├── expectedDeliveryDate: date
│   │   ├── status: string (draft/submitted/approved/ordered)
│   │   ├── requestedBy: string (userId)
│   │   ├── approvedBy: string (userId)
│   │   ├── requestDate: timestamp
│   │   └── remarks: string
│   │
│
├── purchaseOrders/
│   ├── poId
│   │   ├── supplierId: string
│   │   ├── items: array[{partId, quantity, unitPrice, totalPrice}]
│   │   ├── deliveryDate: date
│   │   ├── paymentTerms: string
│   │   ├── totalAmount: number
│   │   ├── status: string (draft/sent/acknowledged/received/closed)
│   │   ├── createdBy: string (userId)
│   │   ├── createdDate: timestamp
│   │   ├── receivedQuantities: array
│   │   └── remarks: string
│   │
│
├── stockTakeCycles/
│   ├── cycleId
│   │   ├── countDate: date
│   │   ├── location: string
│   │   ├── supervisor: string (userId)
│   │   ├── status: string (scheduled/in-progress/completed)
│   │   ├── countStart: timestamp
│   │   ├── countEnd: timestamp
│   │   ├── variance: number (%)
│   │   ├── initiatedBy: string (userId)
│   │   └── remarks: string
│   │
│
├── materialRequestForms/
│   ├── mrfId
│   │   ├── workOrderId: string
│   │   ├── machineId: string
│   │   ├── items: array[{partId, quantity, remarks}]
│   │   ├── priority: string (routine/urgent)
│   │   ├── status: string (pending/approved/fulfilled/rejected)
│   │   ├── requestDate: timestamp
│   │   ├── requestedBy: string (userId)
│   │   ├── fulfilledBy: string (userId)
│   │   ├── fulfilledDate: timestamp
│   │   └── remarks: string
│   │
│
├── machineHistory/
│   ├── historyId
│   │   ├── machineId: string
│   │   ├── maintenanceType: string (service/repair/replacement)
│   │   ├── date: date
│   │   ├── duration: number (hours)
│   │   ├── technician: string (userId)
│   │   ├── workOrderId: string
│   │   ├── partsUsed: array[{partId, quantity}]
│   │   ├── findings: string
│   │   ├── nextServiceDate: date
│   │   ├── remarks: string
│   │   └── createdDate: timestamp
│   │
│
└── systemLogs/
    ├── logId
    │   ├── userId: string
    │   ├── action: string
    │   ├── module: string
    │   ├── details: object
    │   ├── timestamp: timestamp
    │   ├── ipAddress: string
    │   └── status: string (success/failure)
```

---

## 🛠️ Technical Stack

### **Frontend**
- **Framework:** React 18+ with Functional Components
- **State Management:** Redux Toolkit
- **UI Library:** Material-UI (MUI) v5+
- **Icons:** Material-UI Icons
- **Routing:** React Router v6+
- **HTTP Client:** Firebase SDK
- **Styling:** MUI sx prop + CSS-in-JS
- **Charts & Graphs:** Chart.js or Recharts
- **Barcode Scanning:** QuaggaJS or custom scanner
- **Notifications:** Snackbar components

### **Backend & Database**
- **Backend:** Firebase (Serverless)
- **Database:** Firestore (NoSQL)
- **Authentication:** Firebase Auth
- **Cloud Storage:** Firebase Storage
- **Cloud Functions:** Firebase Functions (for automation)
- **Hosting:** Firebase Hosting

### **Development Tools**
- **Version Control:** Git & GitHub
- **Package Manager:** npm or yarn
- **Build Tool:** Create React App / Vite
- **Testing:** Jest + React Testing Library
- **Code Quality:** ESLint + Prettier
- **Deployment:** Firebase CLI

### **Browser Support**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📊 Reporting & Analytics Capabilities

### **Available Reports**

1. **Dashboard KPIs** - Real-time metrics and performance indicators
2. **Stock Inquiry** - Part availability and location tracking
3. **Stock Valuation** - Inventory financial value
4. **Movement History** - Part usage and flow analysis
5. **Low Stock Alerts** - Critical inventory levels
6. **Supplier Performance** - Supplier metrics and ratings
7. **Department-wise Stock** - Stock distribution by area
8. **Requisition Status** - Procurement pipeline visibility
9. **Stock Take Reports** - Variance and reconciliation
10. **MRF Fulfillment** - Maintenance part request tracking

### **Export Formats**
- CSV (for Excel/data analysis)
- PDF (for printing/archiving)
- Print-ready reports

### **Data Visualization**
- Charts (Bar, Line, Pie, Area)
- Gauges and KPI cards
- Tables with sorting and filtering
- Timeline views
- Trend analysis

---

## 🔐 Security & Access Control

### **Authentication**
- Email/password login
- Firebase Authentication
- Session management
- Secure logout

### **Authorization**
- Role-based access control (RBAC)
- Route-level protection
- Page-level permission checks
- Module-specific access restrictions

### **Data Security**
- Firestore security rules (permission-based)
- User data isolation
- Audit trails and logging
- Transaction integrity

### **Best Practices**
- Input validation on all forms
- XSS and SQL injection prevention
- Secure password policies
- Regular security audits

---

## 📱 User Interface Features

### **Design System**
- **Color Palette:** Blues, Purples, Cyans, Ambers (Material Design)
- **Typography:** Responsive and accessible font sizing
- **Spacing:** 8px grid system
- **Border Radius:** 8-16px for modern look
- **Icons:** Material-UI Icons (70+ icons used)

### **Components**
- Data tables with pagination
- Forms with validation
- Dialogs for confirmations
- Snackbars for notifications
- Cards and stat displays
- Navigation sidebar
- Top navigation bar
- Search and filter controls
- Dropdown menus
- Chips and badges

### **Responsive Design**
- Desktop-first approach
- Tablet-friendly layouts
- Mobile-responsive navigation
- Touch-friendly buttons and controls
- Collapsible sidebar for mobile

---

## 📝 Key Business Rules & Validations

### **Part Management**
- SAP# must be unique
- Part name cannot be blank
- Safety stock level ≥ 0
- Reorder quantity > 0
- Category must exist

### **Storage Management**
- Bin ID must be exactly 4 letters
- Rack Number must be 00-99
- Rack Level must be A, B, C, or D
- Location must be unique

### **Stock Transactions**
- Cannot issue more than available stock
- From and To locations must be different for transfers
- Transaction dates must be valid
- Quantities must be positive

### **Purchase Orders**
- Supplier must be active
- Line items must have positive quantities
- Delivery date must be in future
- Total amount must match line items

### **Stock Take**
- Only one active stock take per location
- Counted quantity cannot be negative
- Variance must be calculated correctly
- All items must be counted before closing

### **User Management**
- Email must be unique
- User group must exist
- Email format must be valid
- Passwords must meet requirements

---

## 🎯 Future Enhancements

- [ ] Mobile app (Flutter/React Native)
- [ ] Advanced analytics and AI recommendations
- [ ] Integration with ERP systems
- [ ] Supplier portal for PO feedback
- [ ] Automated email notifications
- [ ] SMS alerts for critical items
- [ ] Warehouse location heatmaps
- [ ] Barcode label printing
- [ ] Multi-warehouse support
- [ ] Demand forecasting
- [ ] Predictive maintenance
- [ ] API for third-party integrations

---

## 📞 Support & Documentation

For detailed technical documentation, see the [Project Documents](./Project%20Documents/) folder.

- **Feature Specifications:** [DOCUMENTATION_INDEX.md](./SRC/DOCUMENTATION_INDEX.md)
- **Implementation Checklist:** [IMPLEMENTATION_CHECKLIST.md](./SRC/IMPLEMENTATION_CHECKLIST.md)
- **Quick Reference:** [QUICK_REFERENCE.md](./SRC/QUICK_REFERENCE.md)
- **Testing Guide:** [TESTING_GUIDE.md](./SRC/TESTING_GUIDE.md)

---

**Last Updated:** January 8, 2026  
**Version:** 1.0.0  
**Status:** In Development

---

You can access the full documentation here:  
<a href="https://github.com/ammaribrahim95/AD-XPDC/blob/main/Project%20Documents/README.md" target="_blank">📂 Open Project Documents</a>

### 🧾 Quick Access Links

| Document | Description | Link |
|-----------|--------------|------|
| 📝 **Project Proposal** | Detailed overview of the system goals, scope, and approach. | <a href="./Proposal SECJ3104 - Group XPDC.pdf" target="_blank"> Open Proposal</a> |
| ⚙️ **Sagile Board** | Agile sprint tracking and progress management dashboard. | <a href="https://sagile.dev/shared-project/store-inventory-management-system-3wFzyT3q" target="_blank">View Sagile Board</a> |
| 📄 **Software Requirements Specification (SRS)** | Detailed system requirements, modules, and features. | <a href="https://docs.google.com/document/d/your-srs-link-here" target="_blank">View SRS Document</a> |

---

## 🧑‍🤝‍🧑 Project Team

| Member Name | Role | Description |
|--------------|------|-------------|
| **Muhammad Syazwan bin Nazri** | Project Manager & System Analyst | Leads requirement analysis, system design, documentation, and testing coordination. |
| **Ammar Ibrahim bin Mohamed** | Backend Developer & Database Engineer | Builds the backend using Firebase, manages APIs, and ensures data security and performance. |
| **Irfan Danial Leong Bin Muhammad Shariff Leong** | Frontend Developer & UI/UX Designer | Designs the user interface with Flutter and integrates it with the backend APIs. |

---

## 🧩 Key Features

| Feature | Description |
|----------|-------------|
| 🔐 **Role-Based Access Control** | Secure login and access restrictions for Admin, Storekeeper, Technician, and Procurement Officer. |
| 🧾 **Digital Part Master** | Manage all spare parts with datasheets, certificates, and supplier details. |
| 📦 **Barcode/QR Integration** | Scan parts during receiving and issuing for accurate real-time updates. |
| 🔔 **Smart Alerts** | Automatic low-stock and critical spare notifications. |
| 📈 **Reports & Dashboards** | Visual KPIs for stock levels, usage trends, and asset traceability. |
| 💡 **Automated Reorder Suggestions** | Suggest reorder quantities based on past usage and lead time. |

---

## 🏗️ System Workflow (Use Case Overview)

**Actors:**
- **Admin** – Manages users, permissions, and system settings.  
- **Storekeeper** – Performs daily receiving, issuing, and stock updates.  
- **Procurement Officer** – Handles purchase requisitions and supplier records.  
- **Maintenance Technician** – Requests and collects parts for assigned work orders.  

**Typical Flow:**
1. Procurement officer creates or receives a Purchase Order (PO).  
2. Storekeeper scans and receives parts into the system.  
3. Technician requests parts using a Work Order ID.  
4. Storekeeper issues parts and updates the asset traceability log.  
5. Dashboard displays stock levels, alerts, and part usage reports.  

---

## 🖥️ Installation & Setup

### **Prerequisites**
- Node.js & npm (for Firebase CLI)
- Flutter SDK installed
- Firebase project configured

### **Setup Steps**
```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/spare-parts-management-system.git

# 2. Navigate into the project folder
cd spare-parts-management-system

# 3. Install dependencies
flutter pub get

# 4. Connect Firebase project
firebase login
firebase init

# 5. Run the app (development)
flutter run -d chrome

---

📅 **Last Updated:** January 2026  
Maintained by **SIMS Development Team**  
