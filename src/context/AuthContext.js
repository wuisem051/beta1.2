import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Para obtener roles de usuario desde Firestore
import { db } from '../services/firebase'; // Importar db desde firebase.js

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        // Obtener el rol del usuario desde Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data from Firestore:", userData);
            setIsAdmin(userData.role === 'admin');
          } else {
            console.log("User document does not exist for UID:", user.uid);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginAdmin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Obtener el rol del usuario desde Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("Admin login - User data from Firestore:", userData);
        if (userData.role === 'admin') {
          return { user };
        } else {
          await signOut(auth); // Cerrar sesión si no es administrador
          throw new Error('Acceso denegado: No eres administrador.');
        }
      } else {
        console.log("Admin login - User document does not exist for UID:", user.uid);
        await signOut(auth); // Cerrar sesión si no se encuentra el documento
        throw new Error('Acceso denegado: No se encontró el perfil de usuario.');
      }
    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    isAdmin,
    login,
    signup,
    logout,
    loginAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
