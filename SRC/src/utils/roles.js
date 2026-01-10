// Role definitions with their corresponding group IDs and permissions
export const Roles = {
  ADMIN: {
    name: 'Admin',
    groupId: 'A',
    permissions: {
      inventory: true,
      procurement: true,
      maintenance: true,
      admin: true,
      // Module access permissions
      canAccessUserManagement: true,
      canAccessPartMaster: true,
      canAccessPartGroupMaster: true,
      canAccessAssetRegistry: true,
      canAccessStorageLocations: true,
      canAccessSupplierManagement: true,
      canAccessReports: true,
      canAccessInventory: true,
      canAccessProcurement: true,
      canAccessStockTake: true,
      canAccessMRF: true,
      canAccessStockValuation: true,
    }
  },
  STOREKEEPER: {
    name: 'Store keeper',
    groupId: 'S',
    permissions: {
      inventory: true,
      procurement: false,
      maintenance: false,
      admin: false,
      // Module access permissions
      canAccessUserManagement: false,
      canAccessPartMaster: true,
      canAccessPartGroupMaster: true,
      canAccessAssetRegistry: true,
      canAccessStorageLocations: true,
      canAccessSupplierManagement: false,
      canAccessReports: true,
      canAccessInventory: true,
      canAccessProcurement: false,
      canAccessStockTake: true,
      canAccessMRF: true,
      canAccessStockValuation: true,
    }
  },
  PROCUREMENT: {
    name: 'Procurement Officer',
    groupId: 'P',
    permissions: {
      inventory: false,
      procurement: true,
      maintenance: false,
      admin: false,
      // Module access permissions
      canAccessUserManagement: false,
      canAccessPartMaster: true,
      canAccessAssetRegistry: false,
      canAccessStorageLocations: false,
      canAccessSupplierManagement: true,
      canAccessReports: true,
      canAccessInventory: false,
      canAccessProcurement: true,
      canAccessStockTake: true,
      canAccessMRF: false,
      canAccessStockValuation: true,
    }
  },
  MAINTENANCE: {
    name: 'Maintenance Technician',
    groupId: 'M',
    permissions: {
      inventory: false,
      procurement: false,
      maintenance: true,
      admin: false,
      // Module access permissions
      canAccessUserManagement: false,
      canAccessPartMaster: false,
      canAccessAssetRegistry: true,
      canAccessStorageLocations: false,
      canAccessSupplierManagement: false,
      canAccessReports: true,
      canAccessInventory: false,
      canAccessStockTake: false,
      canAccessProcurement: false,
      canAccessMRF: true,
      canAccessStockValuation: false,
    }
  }
};

// Helper functions
export const getRoleByGroupId = (groupId) => {
  return Object.values(Roles).find(role => role.groupId === groupId);
};

export const hasPermission = (userRole, permission) => {
  const role = typeof userRole === 'string' ? Roles[userRole] : userRole;
  return role?.permissions?.[permission] || false;
};

// levels: no_access < view < edit < add
const LEVELS = { 'no_access': 0, 'view': 1, 'edit': 2, 'add': 3 };

export const checkAccess = (user, resourceId, requiredLevel = 'view') => {
  if (!user) return false;

  // 1. Priority: Check dynamic group permissions if they exist
  if (user.groupPermissions && Object.keys(user.groupPermissions).length > 0) {
    const userPerm = user.groupPermissions[resourceId];
    if (!userPerm) return false; // Explicitly defined permissions exist, but this resource is missing -> No Access

    const userLevelValue = LEVELS[userPerm.access] || 0;
    const requiredLevelValue = LEVELS[requiredLevel] || 1;
    return userLevelValue >= requiredLevelValue;
  }

  // 2. Fallback: Check static role-based permissions (Legacy)
  const legacyPermissionMap = {
    'user_master': 'canAccessUserManagement',
    'user_group_master': 'canAccessUserManagement',
    'part_master': 'canAccessPartMaster',
    'part_group_master': 'canAccessPartGroupMaster',
    'storage_master': 'canAccessStorageLocations',
    'supplier_master': 'canAccessSupplierManagement',
    'machine_master': 'canAccessAssetRegistry',

    'stock_in': 'canAccessInventory',
    'stock_out': 'canAccessInventory',
    'internal_transfer': 'canAccessInventory',
    'movement_logs': 'canAccessInventory',
    'stock_take': 'canAccessStockTake',
    'mrf': 'canAccessMRF',

    'purchase_requisition': 'canAccessProcurement',

    'dashboard': 'canAccessReports',
    'stock_inquiry': 'canAccessReports',
    'stock_valuation': 'canAccessStockValuation',
    'movement_history': 'canAccessReports',
    'low_stock': 'canAccessReports'
  };

  const legacyKey = legacyPermissionMap[resourceId];
  if (legacyKey) {
    const userRole = getRoleByGroupId(user.groupId);
    return hasPermission(userRole, legacyKey);
  }

  // Fallback for Admin superuser if all else fails
  if (user.groupId === 'A') return true;

  return false;
};


export const getAccessibleModules = (userRole) => {
  const role = typeof userRole === 'string' ? Roles[userRole] : userRole;
  if (!role) return [];

  const modules = [];
  if (role.permissions.canAccessUserManagement) modules.push('userManagement');
  if (role.permissions.canAccessPartMaster) modules.push('partMaster');
  if (role.permissions.canAccessAssetRegistry) modules.push('assetRegistry');
  if (role.permissions.canAccessStorageLocations) modules.push('storageLocations');
  if (role.permissions.canAccessSupplierManagement) modules.push('supplierManagement');
  if (role.permissions.canAccessReports) modules.push('reports');

  return modules;
};