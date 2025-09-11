import React, { createContext, useContext, useReducer } from 'react';

const GlobalStateContext = createContext();

const initialState = {
  // Define aquí tu estado global inicial
  // Por ejemplo:
  // user: null,
  // settings: {},
  // notifications: [],
};

function globalStateReducer(state, action) {
  switch (action.type) {
    // Define aquí tus acciones para modificar el estado global
    // Por ejemplo:
    // case 'SET_USER':
    //   return { ...state, user: action.payload };
    // case 'SET_SETTINGS':
    //   return { ...state, settings: action.payload };
    default:
      return state;
  }
}

export function GlobalStateProvider({ children }) {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  return useContext(GlobalStateContext);
}
