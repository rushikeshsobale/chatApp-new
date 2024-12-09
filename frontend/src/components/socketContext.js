import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  return (
    <SocketContext.Provider value={{ socket, userId, setSocket, setUserId}}>
      {children}
    </SocketContext.Provider>
  );
};
