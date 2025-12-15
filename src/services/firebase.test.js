import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase'; // Importar la configuración de Firebase

// Mock de las funciones de Firebase para pruebas unitarias
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}));

describe('Firebase Initialization', () => {
  test('Firebase app should be initialized with the provided config', () => {
    // Importar el archivo firebase.js para asegurar que se ejecute la inicialización
    require('./firebase'); 

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeApp).toHaveBeenCalledWith(firebaseConfig);
  });

  test('Firestore, Auth, and Storage should be initialized', () => {
    require('./firebase'); 

    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(getStorage).toHaveBeenCalledTimes(1);
  });
});
