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
      canAccessAssetRegistry: true,
      canAccessStorageLocations: true,
      canAccessSupplierManagement: true,
      canAccessReports: true,
      canAccessInventory: true,
      canAccessProcurement: true,
      canAccessStockTake: true,
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
      canAccessAssetRegistry: true,
      canAccessStorageLocations: true,
      canAccessSupplierManagement: false,
      canAccessReports: true,
      canAccessInventory: true,
      canAccessProcurement: false,
      canAccessStockTake: true,
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
      canAccessInventory: true, // Can request stock out
      canAccessStockTake: false,
      canAccessProcurement: false,
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