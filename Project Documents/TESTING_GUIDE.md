# Testing Guide

This guide validates end-to-end flows for SIMS: authentication, RBAC, inventory operations, procurement, maintenance, and reporting.

---

## Pre-Test Setup

1. Ensure Firebase Authentication and Firestore are enabled.
2. Clear browser storage if re-testing (DevTools → Application → Local Storage).
3. Start the app from `SRC`:
   - `npm start`

---

## Test 1: Registration & Approval

**Objective:** Validate user registration and approval workflow.

**Steps:**
1. Register a new user on the Register page.
2. Confirm Firestore user document is created with `status: pending`.
3. As Admin, update the user status to `active`.

**Expected:** User cannot log in until approved, then can log in successfully.

---

## Test 2: Login & Session

**Objective:** Validate login, auth persistence, and session state.

**Steps:**
1. Log in with an active user account.
2. Refresh the page and confirm the session persists.
3. Log out and confirm protected routes are blocked.

**Expected:** Session persists on refresh; logout clears access.

---

## Test 3: Role-Based Navigation

**Objective:** Validate menu visibility and route access per role.

**Steps:**
1. Log in as Admin, Storekeeper, Procurement, and Maintenance.
2. Compare menus and accessible pages.

**Expected:** Each role only sees modules defined by permissions.

---

## Test 4: Master Data CRUD

**Objective:** Validate core master data pages.

**Steps:**
1. Create, update, and delete items in Part Master, Supplier Master, and Storage Locations (role permitting).
2. Confirm changes persist in Firestore.

**Expected:** CRUD operations succeed with proper validation and role permissions.

---

## Test 5: Stock In / Stock Out

**Objective:** Validate inventory transactions.

**Steps:**
1. Perform Stock In with a test part and quantity.
2. Perform Stock Out on the same part.
3. Verify Movement Logs reflect both transactions.

**Expected:** Stock levels update and transaction logs are created.

---

## Test 6: Transfers and Adjustments

**Objective:** Validate internal transfers and manual adjustments.

**Steps:**
1. Create an Internal Transfer between locations.
2. Execute a Manual Adjustment for a stock correction.

**Expected:** Stock levels update correctly with audit trail entries.

---

## Test 7: Stock Take / Cycle Count

**Objective:** Validate stock verification workflows.

**Steps:**
1. Create a Stock Take cycle.
2. Process counted quantities.
3. Run a Cycle Count and reconcile variances.

**Expected:** Stock reconciliation results are stored and visible.

---

## Test 8: Procurement Flow

**Objective:** Validate Purchase Requisition and Purchase Order workflows.

**Steps:**
1. Create a Purchase Requisition.
2. Approve and generate a Purchase Order (if enabled).
3. Receive items into inventory (Receive PO).

**Expected:** PR and PO statuses update, and stock reflects received items.

---

## Test 9: Maintenance Requests

**Objective:** Validate maintenance integration.

**Steps:**
1. Create a Material Request Form (MRF).
2. Issue parts against a work order.
3. Log Machine History entries.

**Expected:** MRFs and maintenance logs are stored and traceable.

---

## Test 10: Reports & Analytics

**Objective:** Validate reporting pages.

**Steps:**
1. Open KPI dashboard and core report pages.
2. Apply filters and verify data updates.

**Expected:** Reports load without errors and reflect current data.

---

## Error Handling Checks

- Attempt invalid inputs (required fields, invalid quantities)
- Attempt unauthorized access to restricted routes
- Simulate network interruption during save

**Expected:** Clear error messaging and no data corruption.

---

## Validation Notes

- Track pass/fail results per role
- Capture screenshots for critical failures
- Log Firestore document changes for audit trail verification

### Redux DevTools
```javascript
// Check user object in Redux auth state
{
  user: {
    email: "test@example.com",
    uid: "firebase-uid",
    groupId: "A",
    username: "testuser",
    department: "IT"
  }
}
```

### Firestore Console
```
Collections should exist:
✓ users (with uid documents)
✓ groups (with A, S, P, M documents)
```

### Browser Network Tab
- Check Firebase Auth API calls
- Check Firestore read/write operations
- Look for any 403 (Permission denied) errors

### Console Errors
```javascript
// No errors should appear related to:
- "Cannot read properties of undefined"
- "Roles is not defined"
- "groupId is undefined"
```

---

## Performance Checks

1. **Load Time**
   - App should initialize groups within 2 seconds
   - No excessive Firestore queries

2. **Memory**
   - Redux state should remain small
   - No memory leaks from listeners

3. **Firestore Reads**
   - One read per user login
   - One batch write for group initialization

---

## Summary

After completing all tests, verify:
- ✅ Registration works with group selection
- ✅ All 4 roles display in dropdown
- ✅ Form validation prevents invalid submissions
- ✅ Users can login after status is 'active'
- ✅ Permissions are enforced by role
- ✅ Admin can manage users and groups
- ✅ Protected routes block unauthorized access
- ✅ Permission checking functions work correctly
- ✅ No console errors or warnings
- ✅ Firestore data persists correctly

**Status**: Ready for production testing when all tests pass ✅
