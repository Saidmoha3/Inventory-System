
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, doc, setDoc, query, where, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSj2F-KmYCwCr3Ia82G5vCckih-3hZx4w",
  authDomain: "silent-seeker-smvz5.firebaseapp.com",
  projectId: "silent-seeker-smvz5",
  storageBucket: "silent-seeker-smvz5.firebasestorage.app",
  messagingSenderId: "709761897987",
  appId: "1:709761897987:web:d840b97321c9bfa0eea036"
};

const databaseId = "ai-studio-inventorypro-c9ccdf6a-1ad3-475c-b768-e0cd9fa9e87e";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseId);

async function seed() {
  console.log('Seeding Users, Suppliers, and Orders...');

  // 1. Seed Users
  const users = [
    { name: 'Maxamed Cali', email: 'maxamed@example.com', role: 'admin' },
    { name: 'Caaisha Axmed', email: 'caaisha@example.com', role: 'staff' },
    { name: 'Cumar Xasan', email: 'cumar@example.com', role: 'staff' }
  ];

  for (const u of users) {
    const q = query(collection(db, 'users'), where('email', '==', u.email));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'users'), {
        ...u,
        locationIds: [],
        createdAt: serverTimestamp()
      });
      console.log(`Added user: ${u.name}`);
    }
  }

  // 2. Seed Suppliers
  const suppliers = [
    { name: 'Bakhaarada Muqdisho Co', contact: 'Axmed Yusuf', email: 'axmed@bakhaarada.com', address: 'Bakaaraha, Muqdisho', category: 'Raashin' },
    { name: 'Somali Traders Ltd', contact: 'Hinda Cali', email: 'hinda@somali.com', address: 'Muqdisho, Somalia', category: 'General' },
    { name: 'Global Food Supply', contact: 'John Doe', email: 'sales@globalfood.com', address: 'Dubai, UAE', category: 'Raashin & Daruuri' }
  ];

  for (const s of suppliers) {
    const q = query(collection(db, 'suppliers'), where('name', '==', s.name));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'suppliers'), {
        ...s,
        createdAt: serverTimestamp()
      });
      console.log(`Added supplier: ${s.name}`);
    }
  }

  // 3. Seed Sales (Orders)
  // Need at least one product and location
  const productsSnap = await getDocs(query(collection(db, 'products'), limit(1)));
  const locationsSnap = await getDocs(query(collection(db, 'locations'), limit(1)));

  if (!productsSnap.empty && !locationsSnap.empty) {
    const product = productsSnap.docs[0];
    const location = locationsSnap.docs[0];
    
    const sales = [
      { productId: product.id, locationId: location.id, quantity: 5, totalPrice: 125 },
      { productId: product.id, locationId: location.id, quantity: 2, totalPrice: 50 }
    ];

    for (const sale of sales) {
      await addDoc(collection(db, 'sales'), {
        ...sale,
        timestamp: serverTimestamp()
      });
      console.log(`Added sale for product: ${product.data().name}`);
    }
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
