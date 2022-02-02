import { useEffect, useState } from 'react';

const useIsMounted = (): boolean => {
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  return isMounted;
};

export default useIsMounted;
