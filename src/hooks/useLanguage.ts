import { useAppSelector } from '../store/hooks';

export const useLanguage = () => {
  return useAppSelector((state) => state.app.language);
};
