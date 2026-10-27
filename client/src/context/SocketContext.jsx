import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [liveToasts, setLiveToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setLiveToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setLiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setLiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // In production, connect to the Render backend URL; in dev, use the Vite proxy origin
    const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_community');
    });

    newSocket.on('new_item_posted', (data) => {
      addToast({
        type: 'info',
        title: `New ${data.reportType.toUpperCase()} Item Reported`,
        message: `${data.title} (${data.category}) at ${data.location?.building || 'Campus'}`,
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  // When authenticated, listen for server-delivered personal notifications
  useEffect(() => {
    if (socket && user?._id) {
      const handleNotification = (notif) => {
        setUnreadNotifications((prev) => prev + 1);
        addToast({
          type: notif.type.includes('approved') ? 'success' : 'alert',
          title: notif.title,
          message: notif.message,
        });
      };

      socket.on('new_notification', handleNotification);

      return () => {
        socket.off('new_notification', handleNotification);
      };
    }
  }, [socket, user?._id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        unreadNotifications,
        setUnreadNotifications,
        addToast,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {liveToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-700/60'
                : toast.type === 'alert'
                ? 'bg-amber-950 text-amber-100 border-amber-700/60'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{toast.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext) || {};
};
