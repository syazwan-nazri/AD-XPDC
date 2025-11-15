import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { Roles } from "./roles";

// Function to sync a single user's data
export const syncUserData = async (user) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // If user document doesn't exist, create it
      await setDoc(userRef, {
        email: user.email.toLowerCase(),
        uid: user.uid,
        createdAt: new Date().toISOString(),
        passwordHistory: [], // Initialize empty password history
        status: "active",
      });
    }
  } catch (error) {
    console.error("Error syncing user data:", error);
    throw error;
  }
};

// Function to sync Firebase user groups
export const syncUserGroups = async () => {
  try {
    const groupsRef = collection(db, "groups");
    const groupsSnapshot = await getDocs(groupsRef);
    const existingGroups = {};

    // Get existing groups
    groupsSnapshot.forEach((doc) => {
      existingGroups[doc.id] = doc.data();
    });

    // Update or create each predefined role
    for (const [roleKey, roleData] of Object.entries(Roles)) {
      const groupRef = doc(db, "groups", roleData.groupId);

      if (!existingGroups[roleData.groupId]) {
        // Create new group if it doesn't exist
        await setDoc(groupRef, {
          groupId: roleData.groupId,
          name: roleData.name,
          permissions: roleData.permissions,
          description: getGroupDescription(roleData.groupId),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Update existing group
        await updateDoc(groupRef, {
          name: roleData.name,
          permissions: roleData.permissions,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error syncing user groups:", error);
    throw error;
  }
};

// Helper function to get group description
const getGroupDescription = (groupId) => {
  switch (groupId) {
    case "A":
      return "Administrator group with full system access";
    case "S":
      return "Store keeper responsible for inventory management";
    case "P":
      return "Procurement officer handling purchase orders";
    case "M":
      return "Maintenance technician managing repairs and maintenance";
    default:
      return "User group";
  }
};

// Function to get user's document by uid
export const getUserDocByUid = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    return userDoc;
  } catch (error) {
    console.error("Error getting user document:", error);
    throw error;
  }
};

// Function to get user's document by email
export const getUserDocByEmail = async (email) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0];
    }
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};
