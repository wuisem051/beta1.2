import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, query } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCEv6ZfHdaN-eNEYvAcEa_FfcSci8sluFg",
    authDomain: "pool-btc.firebaseapp.com",
    projectId: "pool-btc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function reset() {
    try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);

        let count = 0;
        querySnapshot.forEach((userDoc) => {
            batch.update(userDoc.ref, {
                balanceUSD: 0,
                balanceBTC: 0,
                balanceLTC: 0,
                balanceDOGE: 0,
                balanceUSDT: 0,
                balanceVES: 0
            });
            count++;
        });

        await batch.commit();
        console.log(`Listo: Se han reseteado los saldos de ${count} usuarios a 0.`);
        process.exit(0);
    } catch (error) {
        console.error("Error reseteando saldos:", error);
        process.exit(1);
    }
}

reset();
