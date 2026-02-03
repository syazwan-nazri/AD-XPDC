# Integration Summary

This summary outlines how SIMS integrates authentication, role-based access, and domain modules across the codebase.

---

## Architecture

- **Frontend:** React + Material UI
- **State:** Redux Toolkit
- **Backend:** Firebase Authentication + Firestore

---

## Authentication & User Sync

- Firebase Auth handles sign-in and session state
- Firestore stores user profiles (`users`) and roles (`groups`)
- On login, user data is synced and stored in Redux

---

## Role-Based Access Control

- Roles are defined in `src/utils/roles.js`
- `ProtectedRoute` checks permissions on route access
- UI components use permission checks to show/hide actions

---

## Core Modules

- **Admin Master Data:** user/group management and reference data
- **Inventory:** stock movements, adjustments, and audit logs
- **Procurement:** requisitions, orders, and critical spares
- **Maintenance:** MRF requests and machine history
- **Reports:** dashboards and operational analytics

---

## Key Integration Points

- `src/App.js` initializes role sync and auth listeners
- `src/utils/userManagement.js` handles Firestore sync
- `src/pages/**` implement module workflows

---

## Data Collections (Core)

- `users`, `groups`
- `parts`, `partGroups`, `suppliers`, `assets`
- `storage`, `locations`
- `transactions`, `stockTakes`, `cycleCounts`
- `requisitions`, `purchaseOrders`
- `maintenanceRequests`, `machineHistory`

---

## Validation Checklist

- Registration creates user and profile
- Role permissions restrict routes
- Transactions are logged and traceable
- Reports reflect current inventory state
