import { useEffect, useState } from 'react';
import API from '../api'; // adjust path

export const useUser = () => {
  const [user, setUser] = useState(null);

  const fetchUser = async () => {
    try {
      const res = await API.get('/auth/profile/');
      const profileData = res.data;
      setUser({
        ...profileData,
        full_name:
          profileData.full_name ||
          profileData.name ||
          profileData.email?.split('@')[0] ||
          'User',
      });
    } catch (err) {
      console.error('[User Fetch Error]', err);
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, fetchUser };
};
