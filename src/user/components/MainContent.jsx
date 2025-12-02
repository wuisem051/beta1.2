import React from 'react';

const MainContent = ({ children }) => {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto">
      {children}
    </main>
  );
};

export default MainContent;
