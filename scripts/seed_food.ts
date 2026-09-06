
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, doc, setDoc, updateDoc, increment, query, where } from 'firebase/firestore';

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
  console.log('Seeding food products...');

  // 1. Get or create category
  const categoriesSnap = await getDocs(collection(db, 'categories'));
  let foodCatId = categoriesSnap.docs.find(d => d.data().name === 'Raashin & Daruuri')?.id;
  
  if (!foodCatId) {
    const newCat = await addDoc(collection(db, 'categories'), {
      name: 'Raashin & Daruuri',
      description: 'Bariis, Sonkor, Saliid, Bur iyo agabka kale',
      createdAt: serverTimestamp()
    });
    foodCatId = newCat.id;
    console.log('Created Category: Raashin & Daruuri');
  }

  // 2. Get or create a location
  const locationsSnap = await getDocs(collection(db, 'locations'));
  let locId = locationsSnap.docs[0]?.id;
  
  if (!locId) {
    const newLoc = await addDoc(collection(db, 'locations'), {
      name: 'Bakhaarada Muqdisho',
      address: 'Suuqa Bakaaraha, Muqdisho',
      createdAt: serverTimestamp()
    });
    locId = newLoc.id;
    console.log('Created Default Location: Bakhaarada Muqdisho');
  }

  const foodProducts = [
    { name: 'Bariis (Rice)', sku: 'FOOD-BAR-001', category: 'Raashin & Daruuri', price: 25, minStockLevel: 10, unit: 'kg' },
    { name: 'Sonkor (Sugar)', sku: 'FOOD-SON-001', category: 'Raashin & Daruuri', price: 18, minStockLevel: 10, unit: 'kg' },
    { name: 'Saliid (Oil)', sku: 'FOOD-SAL-001', category: 'Raashin & Daruuri', price: 45, minStockLevel: 5, unit: 'liter' },
    { name: 'Bur (Flour)', sku: 'FOOD-BUR-001', category: 'Raashin & Daruuri', price: 20, minStockLevel: 10, unit: 'kg' }
  ];

  for (const p of foodProducts) {
    // Check if SKU exists
    const q = query(collection(db, 'products'), where('sku', '==', p.sku));
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      console.log(`Skipping ${p.name} - SKU ${p.sku} already exists.`);
      continue;
    }

    // Add product
    const prodRef = await addDoc(collection(db, 'products'), {
      ...p,
      createdAt: serverTimestamp()
    });
    
    // Add initial inventory
    const inventoryId = `${prodRef.id}_${locId}`;
    await setDoc(doc(db, 'inventory', inventoryId), {
      productId: prodRef.id,
      locationId: locId,
      quantity: 50,
      lastUpdated: serverTimestamp()
    });

    // Add stock movement record
    await addDoc(collection(db, 'stock_movements'), {
      productId: prodRef.id,
      locationId: locId,
      type: 'incoming',
      quantity: 50,
      note: 'Xog sample ah oo la galiyay (Initial Seed)',
      timestamp: serverTimestamp()
    });

    console.log(`Successfully added: ${p.name} (${p.sku})`);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
