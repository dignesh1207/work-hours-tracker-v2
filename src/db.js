import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, doc, query, where, orderBy,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase config. Check the VITE_FIREBASE_* values in your .env file.');
}

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const rows  = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const fresh = async (ref) => ({ id: ref.id, ...(await getDoc(ref)).data() });

// ── Workplaces ───────────────────────────────────────────────────
export async function fetchWorkplaces() {
  const q = query(collection(db, 'workplaces'), orderBy('created_at', 'asc'));
  return rows(await getDocs(q));
}

export async function createWorkplace(data) {
  const ref = await addDoc(collection(db, 'workplaces'), { ...data, created_at: Date.now() });
  return fresh(ref);
}

export async function updateWorkplace(id, data) {
  const ref = doc(db, 'workplaces', id);
  await updateDoc(ref, data);
  return fresh(ref);
}

export async function deleteWorkplace(id) {
  // Firestore has no cascading delete, so remove the workplace's sessions first.
  const owned = await getDocs(query(collection(db, 'sessions'), where('workplace_id', '==', id)));
  await Promise.all(owned.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'workplaces', id));
}

// ── Sessions ─────────────────────────────────────────────────────
export async function fetchSessions() {
  const q = query(collection(db, 'sessions'), orderBy('date', 'desc'));
  return rows(await getDocs(q));
}

export async function createSession(data) {
  const ref = await addDoc(collection(db, 'sessions'), { ...data, created_at: Date.now() });
  return fresh(ref);
}

export async function updateSession(id, data) {
  const ref = doc(db, 'sessions', id);
  await updateDoc(ref, data);
  return fresh(ref);
}

export async function deleteSession(id) {
  await deleteDoc(doc(db, 'sessions', id));
}
