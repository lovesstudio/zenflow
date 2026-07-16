import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log("Fetching all availabilities for July 2026...");
  const avSnapshot = await getDocs(collection(firestoreDb, 'availability'));
  avSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.date && data.date.startsWith('2026-07')) {
      console.log(`Av ${data.date} (${data.therapistName}):`, JSON.stringify(data.slots));
    }
  });
}

main().catch(console.error);
