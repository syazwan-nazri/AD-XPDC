# User Group & Role System - Visual Summary

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ User         │  │ Admin Panel  │  │ Protected    │           │
│  │ Registration │  │ (User Mgmt)  │  │ Routes       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                       │
│                     ┌──────▼────────┐                              │
│                     │  Redux Auth   │                              │
│                     │  (user state) │                              │
│                     └──────┬────────┘                              │
│                            │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │ Role Definitions   │  │ Permission       │  │ User Management  ││
│  │ (roles.js)         │  │ Checks           │  │ Functions        ││
│  │                    │  │ (hasPermission)  │  │ (userManagement) ││
│  │ • Admin (A)        │  │                  │  │                  ││
│  │ • Store keeper (S) │  │ • inventory      │  │ • syncUserData   ││
│  │ • Procurement (P)  │  │ • procurement    │  │ • syncUserGroups ││
│  │ • Maintenance (M)  │  │ • maintenance    │  │ • getUserDocByUid││
│  │                    │  │ • module access  │  │                  ││
│  └────────────────────┘  └──────────────────┘  └──────────────────┘│
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                    DATA ACCESS LAYER                                  │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│              Firebase Authentication & Firestore                      │
│              ┌──────────────────────────────────────┐                │
│              │      Firebase Auth (Email/Pass)     │                │
│              └──────────────┬───────────────────────┘                │
│              ┌──────────────▼───────────────────────┐                │
│              │      Firestore Database              │                │
│              │  ┌─────────────┐  ┌──────────────┐  │                │
│              │  │ /users/{uid}│  │ /groups/{id} │  │                │
│              │  └─────────────┘  └──────────────┘  │                │
│              │                                       │                │
│              │  Users Collection:                   │                │
│              │  • uid (doc ID)                      │                │
│              │  • email                             │                │
│              │  • username                          │                │
│              │  • groupId (A/S/P/M)                │                │
│              │  • status (pending/active/inactive)  │                │
│              │                                       │                │
│              │  Groups Collection:                  │                │
│              │  • groupId (doc ID)                  │                │
│              │  • name                              │                │
│              │  • permissions (all module flags)    │                │
│              └──────────────────────────────────────┘                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## User Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   USER LIFECYCLE FLOW                         │
└─────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ┌─────────────────────────────┐
   │ User fills registration form│
   │ • Email                     │
   │ • Username                  │
   │ • Select Group (dropdown)   │
   │ • Password + Confirm        │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Form Validation             │
   │ ✓ All fields required       │
   │ ✓ Passwords match           │
   │ ✓ Min 6 char password       │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Create Firebase Auth User   │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Create Firestore User Doc   │
   │ status: "pending"           │
   │ groupId: selected group     │
   └────────────┬────────────────┘
                │
                ▼
         [Redirect to /login]


2. ADMIN APPROVAL
   ┌─────────────────────────────┐
   │ Admin views pending users   │
   │ in User Management          │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Admin changes status to     │
   │ "active"                    │
   └────────────┬────────────────┘
                │
                ▼
   [User can now login]


3. LOGIN
   ┌─────────────────────────────┐
   │ User enters email/password  │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Firebase Auth validates     │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ App syncs user data         │
   │ Fetches Firestore user doc  │
   │ Extracts groupId            │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ Redux stores user with      │
   │ • email                     │
   │ • uid                       │
   │ • groupId                   │
   │ • username                  │
   │ • department                │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ ProtectedRoute validates    │
   │ user permissions            │
   └────────────┬────────────────┘
                │
                ▼
   [User logged in with permissions]


4. AUTHORIZATION
   During session, for every protected operation:
   
   ┌──────────────────────────────┐
   │ User performs action         │
   └────────────┬─────────────────┘
                │
                ▼
   ┌──────────────────────────────┐
   │ Component checks permission  │
   │ getRoleByGroupId(user.groupId)
   │ hasPermission(role, permission)
   └────────────┬─────────────────┘
                │
        ┌───────┴──────┐
        │              │
        ▼              ▼
    [ALLOWED]     [DENIED]
        │              │
        │              ▼
        │      [Show error or hide UI]
        │
        ▼
   [Execute action]
```

## Permission Inheritance

```
┌─────────────────────────────────────────────────┐
│           ROLE PERMISSIONS MATRIX                │
├─────────────────────────────────────────────────┤

Admin (A) ✓ Full Access
├─ Inventory Management
├─ Procurement Management  
├─ Maintenance Management
├─ User Management
├─ Part Master
├─ Asset Registry
├─ Storage Locations
├─ Supplier Management
└─ Reports & Analytics

Store keeper (S) ✓ Inventory Focus
├─ Inventory Management
├─ Part Master (view/edit)
├─ Asset Registry (view)
├─ Storage Locations
└─ Reports (inventory only)

Procurement Officer (P) ✓ Procurement Focus
├─ Procurement Management
├─ Part Master (view)
├─ Supplier Management
└─ Reports (procurement)

Maintenance Technician (M) ✓ Maintenance Focus
├─ Maintenance Management
├─ Asset Registry (view)
└─ Reports (maintenance)
```

## Component Hierarchy with Role Checks

```
App
├─ AuthGuard
│  ├─ Navbar (shows user info)
│  ├─ Sidebar (filtered by getAccessibleModules)
│  │  ├─ Admin Menu → [canAccessUserManagement?]
│  │  ├─ Inventory Menu → [inventory permission?]
│  │  ├─ Procurement Menu → [procurement permission?]
│  │  ├─ Maintenance Menu → [maintenance permission?]
│  │  └─ Reports Menu → [canAccessReports?]
│  │
│  └─ Routes
│     ├─ /login → Login
│     ├─ /register → Register (group dropdown)
│     │
│     ├─ ProtectedRoute [admin]
│     │  ├─ /admin/users → UserManagement
│     │  ├─ /admin/groups → UserGroupMaster
│     │  └─ /admin/* → Admin modules
│     │
│     ├─ ProtectedRoute [inventory]
│     │  ├─ /inventory/parts → PartMaster
│     │  ├─ /inventory/locations → StorageLocations
│     │  └─ /inventory/* → Inventory modules
│     │
│     ├─ ProtectedRoute [procurement]
│     │  ├─ /procurement/orders → PurchaseOrder
│     │  └─ /procurement/* → Procurement modules
│     │
│     └─ ProtectedRoute [maintenance]
│        ├─ /maintenance/requests → RequestParts
│        └─ /maintenance/* → Maintenance modules
```

## Data Flow Example: User Registration

```
User Input
   │
   ├─ Email validation
   ├─ Username required
   ├─ GroupId selected from dropdown (loaded from Roles)
   ├─ Password confirmation match
   └─ Min 6 characters
       │
       ▼
   Form Valid?
       │
   ┌───┴───┐
   │       │
  YES     NO → Show Error
   │
   ▼
Firebase Auth
├─ createUserWithEmailAndPassword()
└─ Returns: UserCredential with uid
       │
       ▼
Firestore Create
├─ Collection: users
├─ Document ID: uid
├─ Data:
│  ├─ uid
│  ├─ email (lowercased)
│  ├─ username
│  ├─ groupId (selected group)
│  ├─ status: "pending"
│  ├─ createdAt: timestamp
│  └─ passwordHistory: []
       │
       ▼
Success
└─ Navigate to /login
   (User now exists but status is pending)
   (Admin must approve before user can login)
```

## Data Flow Example: Permission Check

```
User Action (e.g., Edit Part)
   │
   ▼
Component Check
├─ Get user.groupId from Redux
├─ getRoleByGroupId(user.groupId)
│  └─ Returns Role object
└─ hasPermission(role, 'canAccessPartMaster')
       │
   ┌───┴───┐
   │       │
 true     false
   │       │
   ▼       ▼
 Show    Hide/Disable
 Button  Button
   │       │
   ▼       ▼
User    User cannot
clicks  perform action
   │
   ▼
Execute Action
└─ Save changes to Firestore
```

## File Dependencies

```
App.js
├─ Imports from:
│  ├─ firebase/config (auth, db)
│  ├─ utils/roles (Roles)
│  ├─ utils/initializeGroups (initializeUserGroups)
│  ├─ utils/userManagement (syncUserGroups, syncUserData, getUserDocByUid)
│  ├─ redux/authSlice (setUser, logout)
│  └─ components/ProtectedRoute
│
Register.js
├─ Imports from:
│  ├─ firebase/config (auth, db)
│  ├─ utils/roles (Roles)
│  └─ firebase functions (setDoc)
│
UserManagement.js
├─ Imports from:
│  ├─ firebase/config (auth, db)
│  ├─ utils/roles (Roles)
│  └─ firebase functions (getDocs, setDoc, updateDoc, deleteDoc)
│
ProtectedRoute.js
├─ Imports from:
│  ├─ utils/roles (getRoleByGroupId, hasPermission)
│  └─ react-redux (useSelector)
│
roles.js
├─ Defines:
│  ├─ Roles object (4 roles with permissions)
│  ├─ getRoleByGroupId function
│  ├─ hasPermission function
│  └─ getAccessibleModules function
│
userManagement.js
├─ Imports from:
│  ├─ firebase/config (auth, db)
│  ├─ utils/roles (Roles)
│  └─ firestore functions
│
initializeGroups.js
├─ Imports from:
│  ├─ firebase/config (db)
│  └─ firestore functions
```

---

**Status**: ✅ All changes integrated and tested
**Error Count**: 0
**Ready for**: User registration, admin management, role-based access control
