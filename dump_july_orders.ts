import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log("Fetching all orders for July 2026...");
  const orderSnapshot = await getDocs(collection(firestoreDb, 'orders'));
  orderSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.date && data.date.startsWith('2026-07') && data.status !== 'cancelled') {
      console.log(`Order ${data.date} (${data.time}):`, JSON.stringify(data));
    }
  });
}

main().catch(console.error);
