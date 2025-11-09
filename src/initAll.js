/* eslint-env node */
import app, { db } from './lib/firebase.js';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

async function createOrVerifyUser(auth, email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    process.stdout.write(`✅ Created user: ${email}\n`);
    return credential.user.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      process.stdout.write(`⚠️  User already exists, reusing account: ${email}\n`);
      return credential.user.uid;
    }
    throw error;
  }
}

async function seedAuthAndFirestore() {
  const auth = getAuth(app);

  try {
    const adminUid = await createOrVerifyUser(auth, 'admin@studio.com', 'Admin123!');
    await signOut(auth);
    const staffUid = await createOrVerifyUser(auth, 'staff@studio.com', 'Staff123!');

    const usersCollection = collection(db, 'users');
    await Promise.all([
      setDoc(doc(usersCollection, adminUid), {
        email: 'admin@studio.com',
        role: 'admin',
        displayName: 'Hustle Studio Admin',
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(usersCollection, staffUid), {
        email: 'staff@studio.com',
        role: 'staff',
        displayName: 'Hustle Studio Staff',
        updatedAt: serverTimestamp(),
      }),
    ]);

    const inventoryCollection = collection(db, 'inventory');
    await Promise.all([
      setDoc(doc(inventoryCollection, 'Hookah Pipe'), {
        name: 'Hookah Pipe',
        quantity: 10,
        category: 'Equipment',
        price: 149.99,
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(inventoryCollection, 'Charcoal Pack'), {
        name: 'Charcoal Pack',
        quantity: 20,
        category: 'Consumable',
        price: 19.99,
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(inventoryCollection, 'Mouth Tips'), {
        name: 'Mouth Tips',
        quantity: 30,
        category: 'Consumable',
        price: 9.99,
        updatedAt: serverTimestamp(),
      }),
    ]);

    const reportsCollection = collection(db, 'reports');
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    await setDoc(doc(reportsCollection, isoDate), {
      total: 1234.56,
      createdAt: serverTimestamp(),
      notes: 'Daily summary auto-generated',
    });

    const salesCollection = collection(db, 'sales');
    await Promise.all([
      setDoc(doc(salesCollection, 'sale-001'), {
        items: [
          { id: 'Hookah Pipe', name: 'Hookah Pipe', price: 149.99, quantity: 1 },
          { id: 'Charcoal Pack', name: 'Charcoal Pack', price: 19.99, quantity: 2 },
        ],
        totals: { subtotal: 189.97, vat: 28.50, total: 218.47 },
        paymentType: 'Card',
        discount: 0,
        createdAt: serverTimestamp(),
      }),
      setDoc(doc(salesCollection, 'sale-002'), {
        items: [
          { id: 'Mouth Tips', name: 'Mouth Tips', price: 9.99, quantity: 5 },
        ],
        totals: { subtotal: 49.95, vat: 7.49, total: 57.44 },
        paymentType: 'Cash',
        discount: 5,
        createdAt: serverTimestamp(),
      }),
    ]);

    const teamLogsCollection = collection(db, 'teamLogs');
    await Promise.all([
      setDoc(doc(teamLogsCollection, 'log-001'), {
        message: 'Admin approved new stock delivery',
        createdAt: serverTimestamp(),
        actor: 'admin@studio.com',
      }),
      setDoc(doc(teamLogsCollection, 'log-002'), {
        message: 'Staff processed walk-in sale',
        createdAt: serverTimestamp(),
        actor: 'staff@studio.com',
      }),
    ]);

    await signOut(auth);
    process.stdout.write('🎉 Firestore seeded & signed out successfully!\n');
  } catch (error) {
    console.error('❌ Seeding error', error);
    process.exitCode = 1;
  }
}

seedAuthAndFirestore();
