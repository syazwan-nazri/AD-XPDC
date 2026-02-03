# Visual Summary

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                       FRONTEND                            │
│  React + MUI + Redux                                      │
│  Pages, Components, Protected Routes                      │
└───────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC                        │
│  Roles, permissions, helpers, validation                  │
└───────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│                         DATA                              │
│  Firebase Auth + Firestore                                │
└───────────────────────────────────────────────────────────┘
```

---

## Module Map

```
SIMS
├─ Admin Master Data
│  ├─ Users & Groups
│  ├─ Parts / Part Groups
│  ├─ Storage / Locations
│  └─ Suppliers / Assets
├─ Inventory Operations
│  ├─ Stock In / Stock Out
│  ├─ Transfers / Adjustments
│  ├─ Stock Take / Cycle Count
│  └─ Movement Logs
├─ Procurement
│  ├─ Purchase Requisition
│  ├─ Purchase Order
│  └─ Critical Spares
├─ Maintenance
│  ├─ Request Parts (MRF)
│  ├─ Issue Work Order
│  └─ Machine History
└─ Reports
   ├─ KPI Dashboard
   ├─ Stock Inquiry
   ├─ Stock Valuation
   └─ Movement / Low Stock
```

---

## Role Access Snapshot

```
Admin (A):           All modules
Storekeeper (S):     Inventory + Parts + Storage + Reports
Procurement (P):     Procurement + Suppliers + Reports
Maintenance (M):     Maintenance + Assets + Reports
```

---

## Authentication & Authorization Flow

```
Register → User doc (pending)
Admin approval → status active
Login → Redux user state
ProtectedRoute → permission checks
```

---

## Data Entities (Core)

```
users / groups / parts / partGroups / suppliers / assets
storage / locations / transactions / requisitions / orders
maintenanceRequests / reports
```

---

**Status:** Documentation aligned to current repo (Feb 2026)
