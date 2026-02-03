# Quick Reference

## Role IDs

```
A = Admin (full access)
S = Storekeeper
P = Procurement Officer
M = Maintenance Technician
```

---

## Permission Checks (Actual Implementation)

### Check Resource Access

```javascript
import { checkAccess } from '../utils/roles';
import { useSelector } from 'react-redux';

const user = useSelector(state => state.auth.user);

// Check if user can view a resource
const canView = checkAccess(user, 'part_master', 'view');

// Check if user can edit
const canEdit = checkAccess(user, 'part_master', 'edit');

// Check if user can add
const canAdd = checkAccess(user, 'part_master', 'add');
```

**Access Levels:** `no_access` < `view` < `edit` < `add`

---

## Protected Routes

```javascript
import ProtectedRoute from '../components/ProtectedRoute';

// Protect a route requiring 'view' access to 'user_master'
<Route element={<ProtectedRoute resourceId="user_master" requiredLevel="view" />}>
  <Route path="/admin/users" element={<UserManagement />} />
</Route>
```

---

## Common Tasks

### Get User Permissions in a Page Component

```javascript
import { useSelector } from 'react-redux';

const user = useSelector(state => state.auth.user);
const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
const permissions = user?.groupPermissions?.part_master || {};

const canAdd = permissions.access === 'add' || isAdmin;
const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
const canDelete = permissions.access === 'add' || isAdmin;
```

### Add a New Resource

1. Add the resource to `src/constants/resources.js` in the `APP_RESOURCES` array:
   ```javascript
   { id: 'my_resource', name: 'My Resource', category: RESOURCE_CATEGORIES.ADMIN }
   ```
2. Set permissions in User Group Master page (Admin)
3. Use `checkAccess(user, 'my_resource', 'view')` in components

---

## Firestore Collections

**users**
- uid, email, username, groupId, department, status, createdAt, passwordHistory

**groups**
- groupId, name, description, permissions, createdAt, updatedAt

---

## Troubleshooting

| Issue | Check |
|------|------|
| User cannot log in | User status is `active` in Firestore |
| Route access denied | Permission name matches exactly |
| Group dropdown empty | `roles.js` export and group sync |
| Missing user data | `syncUserData()` on app init |

---

## Key File Locations

- `src/utils/roles.js`
- `src/utils/userManagement.js`
- `src/components/ProtectedRoute.js`
- `src/pages/Auth/Register.js`
- `src/pages/Admin/UserManagement.js`
- `src/pages/Admin/UserGroupMaster.js`
- `src/redux/authSlice.js`
- `src/App.js`

---

## Real Code Examples from SIMS

### Example: Permission Check in PartMaster.js

```javascript
const user = useSelector(state => state.auth.user);
const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
const permissions = user?.groupPermissions?.part_master || {};

const canAdd = permissions.access === 'add' || isAdmin;
const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
const canDelete = permissions.access === 'add' || isAdmin;

// Use in JSX
{canAdd && <Button onClick={handleAdd}>Add Part</Button>}
```

### Example: Fetching Data with Access Control

```javascript
const fetchUsers = async () => {
  setLoading(true);
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const data = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    setUsers(data);
  } catch (err) {
    setSnackbar({ open: true, msg: "Failed to fetch users", severity: "error" });
  } finally {
    setLoading(false);
  }
};
```

### Example: User Sync on Login (App.js)

```javascript
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      await syncUserData(firebaseUser);
      const userDoc = await getUserDocByUid(firebaseUser.uid);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Fetch Group Permissions dynamically
      let groupPermissions = {};
      if (userData.groupId) {
        const groupRef = doc(db, 'groups', userData.groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          groupPermissions = groupSnap.data().permissions || {};
        }
      }
      
      dispatch(setUser({ ...userData, groupPermissions }));
    }
  });
  return () => unsub();
}, []);
```

---

## Available Resource IDs

From `src/constants/resources.js`:

**Admin:** `user_master`, `user_group_master`, `department_master`

**Data Master:** `part_master`, `part_group_master`, `warehouse_master`, `warehouse_locations`, `supplier_master`, `machine_master`

**Inventory:** `stock_in`, `stock_out`, `internal_transfer`, `movement_logs`, `mrf`, `stock_take`

**Procurement:** `purchase_requisition`

**Reports:** `dashboard`, `stock_inquiry`, `stock_valuation`, `movement_history`, `low_stock`

---

## Commands (from `SRC`)

- `npm install` — Install dependencies
- `npm start` — Start development server
- `npm run build` — Production build
