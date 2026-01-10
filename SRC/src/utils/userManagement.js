import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

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
    const { collection, query, where, getDocs } = require("firebase/firestore");
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
