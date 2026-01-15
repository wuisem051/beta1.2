import React from 'react';

const MainContent = ({ children, style }) => {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto" style={style}>
      {children}
    </main>
  );
};

export default MainContent;
