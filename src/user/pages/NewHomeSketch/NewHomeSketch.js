import React from 'react';

const NewHomeSketch = () => {
  return (
    <div style={{ width: '100%', border: 'none' }}>
      <iframe 
        src="/new-home-sketch/index.html" // La ruta al archivo HTML estático en public
        title="Boceto Futurista Home"
        style={{ width: '100%', height: 'auto', minHeight: '100vh', border: 'none' }}
      ></iframe>
    </div>
  );
};

export default NewHomeSketch;
