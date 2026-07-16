import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log("Fetching availability for 2026-07-19...");
  const avSnapshot = await getDocs(collection(firestoreDb, 'availability'));
  avSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.date === '2026-07-19') {
      console.log("Av 7/19:", doc.id, JSON.stringify(data));
    }
  });

  console.log("Fetching orders for 2026-07-19...");
  const orderSnapshot = await getDocs(collection(firestoreDb, 'orders'));
  orderSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.date === '2026-07-19' && data.status !== 'cancelled') {
      console.log("Order 7/19:", doc.id, JSON.stringify(data));
    }
  });
}

main().catch(console.error);
