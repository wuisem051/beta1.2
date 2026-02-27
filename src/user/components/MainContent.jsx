import React from 'react';

const MainContent = ({ children, style }) => {
  return (
    <main className="flex-1 min-w-0 w-full flex flex-col overflow-y-auto overflow-x-hidden relative" style={style}>
      {children}
    </main>
  );
};

export default MainContent;
