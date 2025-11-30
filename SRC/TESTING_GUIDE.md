# Testing Guide - User Group & Role Management System

## Pre-Testing Setup

1. **Clear Browser Storage** (if testing multiple times)
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Delete all entries for your domain

2. **Ensure Firestore is Empty or Set Up** (optional)
   - Create collections: `users`, `groups`
   - Or let the app create them automatically

3. **Start the Application**
   ```bash
   npm start
   ```

---

## Test 1: User Registration with Group Selection

### Objective
Verify that new users can register and select their user group.

### Steps
1. Navigate to `http://localhost:3000/register`
2. Fill in the registration form:
   - Email: `test@example.com`
   - Username: `testuser`
   - User Group: Select "Admin (A)" from dropdown
   - Password: `Test@123`
   - Confirm Password: `Test@123`
3. Click "Register" button

### Expected Results
- ✅ Form validates all inputs
- ✅ User created in Firebase Authentication
- ✅ User document created in Firestore `users` collection with:
  - `email`: test@example.com
  - `username`: testuser
  - `groupId`: A
  - `status`: pending
- ✅ Redirect to `/login` page

### Verification in Firebase Console
```
Firestore > users > {uid}:
{
  uid: "firebase-user-id",
  email: "test@example.com",
  username: "testuser",
  groupId: "A",
  status: "pending",
  createdAt: "2025-11-15T...",
  passwordHistory: []
}
```

---

## Test 2: Dropdown Group Selection

### Objective
Verify that user group dropdown shows all available groups from roles.js.

### Steps
1. Go to `/register`
2. Click the "User Group" dropdown
3. Observe the options

### Expected Results
- ✅ Dropdown displays 4 options:
  - Admin (A)
  - Store keeper (S)
  - Procurement Officer (P)
  - Maintenance Technician (M)
- ✅ All groups are selectable
- ✅ No errors in browser console

---

## Test 3: Registration Form Validation

### Objective
Verify that form validation works correctly.

### Test Cases

#### 3a: Missing Required Field
1. Go to `/register`
2. Leave "Email" empty
3. Click "Register"
- ✅ Error: "All fields are required"

#### 3b: Password Mismatch
1. Go to `/register`
2. Enter Password: `Test@123`
3. Enter Confirm Password: `Different123`
4. Click "Register"
- ✅ Error: "Passwords do not match"

#### 3c: Password Too Short
1. Go to `/register`
2. Enter Password: `123` (less than 6 chars)
3. Click "Register"
- ✅ Error: "Password must be at least 6 characters"

---

## Test 4: User Login

### Objective
Verify that registered users can log in.

### Prerequisites
- User registered in Test 1 with status 'pending'
- User status changed to 'active' in Firestore

### Steps
1. Update the test user's status in Firestore:
   - Go to Firebase Console
   - Find the user document created in Test 1
   - Change `status` from "pending" to "active"

2. Navigate to `http://localhost:3000/login`
3. Enter credentials:
   - Email: `test@example.com`
   - Password: `Test@123`
4. Click "Login"

### Expected Results
- ✅ Login successful
- ✅ Redirect to home page `/`
- ✅ Redux state updated with user info:
  - email: test@example.com
  - uid: firebase-uid
  - groupId: A
  - username: testuser
  - department: (empty or filled)

### Verification in Browser Console
```javascript
// Open DevTools Console and run:
localStorage.getItem('persist:root')
// Look for user object with groupId: "A"
```

---

## Test 5: Role-Based Access Control (RBAC)

### Objective
Verify that users can only access modules permitted by their role.

### Steps for Admin User
1. Login as Admin (groupId: A)
2. Check sidebar/navigation menu
3. Verify accessibility to:
   - ✅ User Management
   - ✅ Part Master
   - ✅ Asset Registry
   - ✅ Storage Locations
   - ✅ Supplier Management
   - ✅ Reports

### Steps for Store keeper User
1. Create new user with groupId: S
2. Change status to 'active'
3. Login as this user
4. Check sidebar/navigation menu
5. Verify accessibility to:
   - ✅ Part Master
   - ✅ Asset Registry
   - ✅ Storage Locations
   - ✅ Reports
   - ❌ User Management (should be hidden/disabled)
   - ❌ Supplier Management (should be hidden/disabled)

### Steps for Procurement Officer
1. Create new user with groupId: P
2. Change status to 'active'
3. Login as this user
4. Verify accessibility to:
   - ✅ Procurement Orders
   - ✅ Part Master (view only)
   - ✅ Supplier Management
   - ✅ Reports
   - ❌ Inventory Management
   - ❌ User Management
   - ❌ Asset Registry

### Steps for Maintenance Technician
1. Create new user with groupId: M
2. Change status to 'active'
3. Login as this user
4. Verify accessibility to:
   - ✅ Request Parts
   - ✅ Asset Registry
   - ✅ Reports
   - ❌ Procurement
   - ❌ User Management
   - ❌ Inventory Management

---

## Test 6: Protected Routes

### Objective
Verify that users without proper permissions cannot access restricted pages.

### Steps
1. Login as "Store keeper" (groupId: S)
2. Try to manually navigate to:
   - `http://localhost:3000/admin/users`
   - Expected: Redirect to `/unauthorized`
   - Reason: Store keeper lacks `canAccessUserManagement` permission

3. Try to navigate to:
   - `http://localhost:3000/inventory/parts`
   - Expected: Page loads or error (depends on component)
   - Reason: Store keeper has `canAccessPartMaster` permission

### Expected Behavior
- ✅ ProtectedRoute component checks user's permissions
- ✅ Users without permission see `/unauthorized`
- ✅ Users with permission see the page

---

## Test 7: Admin User Management

### Objective
Verify that admins can manage users and change their groups.

### Prerequisites
- Login as Admin user (groupId: A)

### Steps
1. Navigate to `/admin/users` (or Admin Panel → User Management)
2. Click "Add User" button
3. Fill in new user form:
   - Email: `newuser@example.com`
   - Username: `newuser`
   - Group: "Procurement Officer (P)"
   - Password: `NewUser@123`
   - Status: "active"
4. Click "Save"

### Expected Results
- ✅ New user created in Firebase Auth
- ✅ User document created in Firestore with groupId: P
- ✅ User appears in the users table
- ✅ Can refresh and user data persists

### Test 7b: Edit User Group
1. In User Management, click Edit icon on a user row
2. Change the Group dropdown (e.g., from S to M)
3. Click "Update"

### Expected Results
- ✅ User's groupId updated in Firestore
- ✅ User's permissions change on next login/refresh
- ✅ Snackbar shows success message

### Test 7c: Change User Status
1. In User Management, edit a user
2. Change Status from "pending" to "active"
3. Click "Update"

### Expected Results
- ✅ Status updated in Firestore
- ✅ User can now login (if status was pending)
- ✅ Confirmation message shown

### Test 7d: Delete User
1. In User Management, click Delete icon
2. Confirm deletion in dialog
3. Click "Delete"

### Expected Results
- ✅ User deleted from Firestore
- ✅ User removed from table
- ✅ Success message shown
- ✅ User cannot login anymore

---

## Test 8: User Group Master

### Objective
Verify that admins can view and manage user groups.

### Steps
1. Login as Admin
2. Navigate to `/admin/groups` (or Admin Panel → User Group Master)
3. Observe the groups table

### Expected Results
- ✅ Table displays 4 predefined groups:
  - A: Admin
  - S: Store keeper
  - P: Procurement Officer
  - M: Maintenance Technician
- ✅ Each group shows description
- ✅ Edit and Delete buttons available

### Test 8b: Add Custom Group
1. Click "Add Group" button
2. Fill in form:
   - Group ID: `X`
   - Group Name: `Custom Group`
   - Description: `A custom test group`
3. Click "Add"

### Expected Results
- ✅ New group created in Firestore
- ✅ Appears in groups table
- ✅ Can be assigned to users

### Test 8c: Edit Group
1. Click Edit icon on a group
2. Change description
3. Click "Update"

### Expected Results
- ✅ Group updated in Firestore
- ✅ Changes appear in table
- ✅ Success message shown

---

## Test 9: Permission Checking Functions

### Objective
Verify that permission checking functions work correctly.

### Test in Browser Console
```javascript
// After login, open DevTools Console and test:

// 1. Get user's role
import { getRoleByGroupId } from './utils/roles';
const userRole = getRoleByGroupId('A'); // Admin
console.log(userRole);
// Expected: { name: 'Admin', groupId: 'A', permissions: {...} }

// 2. Check specific permission
import { hasPermission } from './utils/roles';
console.log(hasPermission(userRole, 'canAccessUserManagement'));
// Expected: true (for Admin)

// 3. Get accessible modules
import { getAccessibleModules } from './utils/roles';
console.log(getAccessibleModules(userRole));
// Expected: ['userManagement', 'partMaster', 'assetRegistry', ...]

// 4. For different role
const skRole = getRoleByGroupId('S'); // Store keeper
console.log(hasPermission(skRole, 'canAccessUserManagement'));
// Expected: false (Store keeper cannot access user management)
```

---

## Test 10: Error Scenarios

### Test 10a: Network Error During Registration
1. Turn off internet (or mock network error)
2. Try to register new user
3. Expected: Error message displayed

### Test 10b: Duplicate Email Registration
1. Try to register with an email that already exists
2. Expected: Firebase error shown to user

### Test 10c: Groups Not Syncing
1. Check Firestore console
2. If groups collection is empty:
   - App should initialize groups on load
   - Groups should appear after refresh
3. Expected: Groups automatically created if missing

---

## Debugging Checklist

| Issue | How to Debug |
|-------|-------------|
| Dropdown not showing groups | Open Console, check if Roles imported correctly |
| User cannot login | Check Firestore: user status = 'active'? |
| Permission denied | Check user.groupId in Redux DevTools |
| Protected route always redirects | Verify requiredPermission param matches |
| Groups not appearing | Check Firestore > groups collection exists |
| User data not syncing | Check if syncUserData() called in App.js |

---

## Browser DevTools Checks

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
