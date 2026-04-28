import { useState, useEffect } from 'react';

const USER_ID_KEY = 'chat_afinidade_user_id';

export function useUserSession() {
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USER_ID_KEY);
    }
    return null;
  });

  const login = (id: string) => {
    localStorage.setItem(USER_ID_KEY, id);
    setUserId(id);
  };

  const logout = () => {
    localStorage.removeItem(USER_ID_KEY);
    setUserId(null);
  };

  return { userId, login, logout };
}
