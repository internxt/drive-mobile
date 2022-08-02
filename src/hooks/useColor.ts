import { useTailwind } from 'tailwind-rn';

const useGetColor = () => {
  const tailwind = useTailwind();
  const getColor = (textColorClass: string) => tailwind(textColorClass).color as string;

  return getColor;
};

export default useGetColor;
