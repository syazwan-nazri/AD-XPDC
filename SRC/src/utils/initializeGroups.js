import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

const defaultGroups = [
  {
    groupId: 'A',
    groupName: 'Admin',
    description: 'Administrator group with full access',
    permissions: {
      inventory: true,
      procurement: true,
      maintenance: true,
      admin: true
    }
  },
  {
    groupId: 'S',
    groupName: 'Store keeper',
    description: 'Manages inventory and stock',
    permissions: {
      inventory: true,
      procurement: false,
      maintenance: false,
      admin: false
    }
  },
  {
    groupId: 'M',
    groupName: 'Maintenance technician',
    description: 'Handles maintenance requests',
    permissions: {
      inventory: false,
      procurement: false,
      maintenance: true,
      admin: false
    }
  },
  {
    groupId: 'P',
    groupName: 'Procurement officer',
    description: 'Manages purchases and orders',
    permissions: {
      inventory: false,
      procurement: true,
      maintenance: false,
      admin: false
    }
  }
];

export const initializeUserGroups = async () => {
  try {
    // Create each default group with groupId as the document ID
    const batch = db.batch();
    
    for (const group of defaultGroups) {
      const groupRef = doc(db, 'userGroups', group.groupId);
      batch.set(groupRef, group, { merge: true }); // Using merge to avoid overwriting existing data
    }
    
    await batch.commit();
    console.log('User groups initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing user groups:', error);
    return false;
  }
};