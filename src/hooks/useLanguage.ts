import { useAppSelector } from '../store/hooks';

export const useLanguage = () => {
  const language = useAppSelector((state) => state.app.language);
  return language;
};
