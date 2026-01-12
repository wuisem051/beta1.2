import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Importar setDoc
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Crear documento de usuario en Firestore después del registro con email/password
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: userCredential.user.email,
      role: 'user', // Rol por defecto
      // Otros campos iniciales si son necesarios
    });
    return userCredential;
  }

  async function signupWithPayeer(email, password, payeerAccount) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Crear documento de usuario en Firestore después del registro con Payeer
    await setDoc(doc(db, "users", userCredential.user.uid), {
      payeerAccount: payeerAccount,
      email: email, // Guardamos el email generado para referencia
      role: 'user', // Rol por defecto
      // Otros campos iniciales si son necesarios
    });
    return userCredential;
  }

  async function login(identifier, password) {
    let emailToSignIn = identifier;

    // Check if the identifier is a Payeer account number
    const isPayeerAccount = /^P\d{8}$/.test(identifier);
    if (isPayeerAccount) {
      emailToSignIn = `${identifier}@payeer.com`;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToSignIn, password);
      const user = userCredential.user;

      // Verify if the user exists in Firestore (important for consistency with onAuthStateChanged)
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If user document doesn't exist, it means this account was not properly registered.
        // Log out the user and throw an error.
        await signOut(auth);
        throw new Error('No se encontró el perfil de usuario. Por favor, regístrate.');
      }
      return userCredential;
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
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
            console.log("User data from Firestore for UID:", user.uid, ":", userData);
            setIsAdmin(userData.role === 'admin');
            console.log("Is Admin:", userData.role === 'admin');
          } else {
            console.log("User document does not exist for UID:", user.uid);
            setIsAdmin(false);
            console.log("Is Admin: false (user document not found)");
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        console.log("User is not authenticated. Is Admin: false");
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
    } finally {
      setLoading(false); // Asegurarse de que loading se establezca en false después de un intento de inicio de sesión
    }
  };

  // Dev Mode Bypass for agentic testing in localhost
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
      window.__ENABLE_DEV_MODE__ = () => {
        console.warn("DEV MODE ENABLED: Bypassing Auth & Permissions");
        setCurrentUser({
          uid: 'agent-dev-uid',
          email: 'agent@elite.dev',
          displayName: 'Antigravity Agent'
        });
        setIsAdmin(true);
        setLoading(false);
      };
    }
  }, []);

  const value = {
    currentUser,
    isAdmin,
    login,
    signup,
    signupWithPayeer, // Exportar la nueva función
    logout,
    loginAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
