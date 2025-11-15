# Quick Reference Guide - User Group & Role System

## User Group IDs & Names
```javascript
A = Admin
S = Store keeper
P = Procurement Officer
M = Maintenance Technician
```

## How to Use the Roles System

### 1. Check User's Permission
```javascript
import { getRoleByGroupId, hasPermission } from './utils/roles';

const userRole = getRoleByGroupId(user.groupId); // user.groupId from Redux
const canEdit = hasPermission(userRole, 'canAccessPartMaster');
```

### 2. Get User's Accessible Modules
```javascript
import { getAccessibleModules } from './utils/roles';

const userRole = getRoleByGroupId(user.groupId);
const modules = getAccessibleModules(userRole);
// Returns: ['userManagement', 'partMaster', ...]
```

### 3. Protect a Route
```javascript
<ProtectedRoute requiredPermission="canAccessUserManagement" />
// User must have this permission to access the route
```

### 4. Register a New User
- Navigate to `/register`
- Fill in email, username, password
- Select user group from dropdown
- User created with status 'pending'
- Admin must approve in User Management

## Firestore Collections

### users
- `uid` - Firebase Auth UID (document ID)
- `email` - User email
- `username` - User's display name
- `groupId` - Reference to group (A, S, P, M)
- `department` - Department name
- `status` - 'active', 'pending', or 'inactive'
- `createdAt` - Timestamp
- `passwordHistory` - Array of past passwords

### groups
- `groupId` - Group code (A, S, P, M) (document ID)
- `name` - Full group name
- `description` - Group description
- `permissions` - Object with all permission flags
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

## Permission Flags

### Core Permissions
- `inventory` - Inventory management access
- `procurement` - Procurement access
- `maintenance` - Maintenance access
- `admin` - Admin panel access

### Module Permissions
- `canAccessUserManagement` - Users & Groups management
- `canAccessPartMaster` - Parts/Items management
- `canAccessAssetRegistry` - Asset registry access
- `canAccessStorageLocations` - Storage locations access
- `canAccessSupplierManagement` - Supplier management
- `canAccessReports` - Reports access

## Redux User Object
```javascript
{
  email: "user@example.com",
  uid: "firebase-uid",
  groupId: "A",          // User's group
  username: "john_doe",
  department: "IT"
}
```

## Common Tasks

### Task 1: Display Different Menus Based on Role
```javascript
import { getAccessibleModules } from './utils/roles';

const userRole = getRoleByGroupId(user.groupId);
const modules = getAccessibleModules(userRole);

return (
  <Sidebar>
    {modules.includes('userManagement') && <UserMgmtMenu />}
    {modules.includes('partMaster') && <PartMasterMenu />}
    {modules.includes('procurement') && <ProcurementMenu />}
  </Sidebar>
);
```

### Task 2: Conditionally Render Components
```javascript
import { hasPermission, getRoleByGroupId } from './utils/roles';

const canEdit = hasPermission(getRoleByGroupId(user.groupId), 'canAccessPartMaster');

return (
  <div>
    {canEdit && <EditButton />}
    {!canEdit && <ReadOnlyView />}
  </div>
);
```

### Task 3: Add a New Permission Check
1. Add to `src/utils/roles.js` in each role's permissions object
2. Use `hasPermission()` to check it
3. Example:
```javascript
// In roles.js - add to each role
permissions: {
  // ... existing permissions
  canAccessNewModule: true/false  // Add new permission
}

// In component
const canAccess = hasPermission(userRole, 'canAccessNewModule');
```

### Task 4: Create an Admin-Only Page
```javascript
import ProtectedRoute from './components/ProtectedRoute';

<Routes>
  <Route element={<ProtectedRoute requiredPermission="canAccessUserManagement" />}>
    <Route path="/admin/users" element={<UserManagement />} />
  </Route>
</Routes>
```

## Important Notes

1. **GroupId is the unique identifier** - Always use `groupId` (A, S, P, M) as the key reference
2. **Roles are immutable** - Edit them in `roles.js`, not in the UI (unless custom groups)
3. **Firestore syncs on load** - Both user data and groups sync automatically
4. **Status matters** - Users with 'pending' status can't log in until approved
5. **Batch operations** - Group creation uses batch writes for reliability

## Troubleshooting

| Issue | Solution |
|-------|----------|
| User has no groupId | Check Firestore 'users' doc has groupId field |
| ProtectedRoute not working | Ensure requiredPermission matches permission name exactly |
| Roles not showing in dropdown | Ensure Roles are exported correctly from roles.js |
| Groups not syncing | Check syncUserGroups() is called on app init |
| User can't login | Check status is 'active' not 'pending' |

## File Locations
- **Roles definition**: `src/utils/roles.js`
- **User sync functions**: `src/utils/userManagement.js`
- **Protected routes**: `src/components/ProtectedRoute.js`
- **User registration**: `src/pages/Auth/Register.js`
- **User management**: `src/pages/Admin/UserManagement.js`
- **Group management**: `src/pages/Admin/UserGroupMaster.js`
- **Redux auth**: `src/redux/authSlice.js`
- **App initialization**: `src/App.js`
