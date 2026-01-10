// Resource access levels
// levels: no_access < view < edit < add
const LEVELS = { 'no_access': 0, 'view': 1, 'edit': 2, 'add': 3 };

/**
 * Checks if a user has access to a specific resource.
 * Uses only dynamic groupPermissions.
 * 
 * @param {Object} user - The user object from Redux/Auth
 * @param {String} resourceId - The ID of the resource to check (e.g., 'user_master')
 * @param {String} requiredLevel - The minimum required level ('view', 'edit', 'add')
 * @returns {Boolean} - True if access is granted
 */
export const checkAccess = (user, resourceId, requiredLevel = 'view') => {
  if (!user) return false;

  // Admin Superuser Override (Always allow Admin)
  if (['A', 'Admin', 'admin'].includes(user.groupId)) return true;

  // Check dynamic group permissions
  if (user.groupPermissions && Object.keys(user.groupPermissions).length > 0) {
    const userPerm = user.groupPermissions[resourceId];

    // If permission object doesn't exist for this resource, assume No Access
    if (!userPerm) return false;

    const userLevelValue = LEVELS[userPerm.access] || 0;
    const requiredLevelValue = LEVELS[requiredLevel] || 1;

    // Check if user level meets requirement
    return userLevelValue >= requiredLevelValue;
  }

  // If no group permissions match (and not Admin), default to NO ACCESS
  return false;
};
