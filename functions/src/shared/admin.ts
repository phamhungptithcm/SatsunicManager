import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
export const adminApp = getApps()[0] ?? initializeApp();
export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
