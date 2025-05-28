import { useColorScheme } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const lightThemeColors = {
  // Primary colors
  'text-primary': 'rgb(0, 102, 255)',
  'text-primary-dark': 'rgb(0, 88, 219)',

  // Status colors
  'text-red': 'rgb(255, 13, 0)',
  'text-red-dark': 'rgb(230, 11, 0)',
  'text-orange': 'rgb(255, 149, 0)',
  'text-orange-dark': 'rgb(230, 134, 0)',
  'text-yellow': 'rgb(255, 204, 0)',
  'text-yellow-dark': 'rgb(230, 184, 0)',
  'text-green': 'rgb(50, 195, 86)',
  'text-green-dark': 'rgb(45, 174, 77)',
  'text-pink': 'rgb(255, 36, 76)',
  'text-pink-dark': 'rgb(235, 0, 63)',
  'text-indigo': 'rgb(81, 78, 212)',
  'text-indigo-dark': 'rgb(60, 58, 207)',

  // Surface colors
  'text-surface': 'rgb(255, 255, 255)',
  'text-highlight': 'rgb(17, 17, 17)',
  'bg-surface': 'rgb(255, 255, 255)',
  'bg-highlight': 'rgb(17, 17, 17)',

  // Grays - Light theme
  'text-gray-1': 'rgb(249, 249, 252)',
  'text-gray-5': 'rgb(243, 243, 248)',
  'text-gray-10': 'rgb(229, 229, 235)',
  'text-gray-20': 'rgb(209, 209, 215)',
  'text-gray-30': 'rgb(199, 199, 205)',
  'text-gray-40': 'rgb(174, 174, 179)',
  'text-gray-50': 'rgb(142, 142, 148)',
  'text-gray-60': 'rgb(99, 99, 103)',
  'text-gray-70': 'rgb(72, 72, 75)',
  'text-gray-80': 'rgb(58, 58, 59)',
  'text-gray-90': 'rgb(44, 44, 48)',
  'text-gray-100': 'rgb(24, 24, 27)',

  // Background grays
  'bg-gray-1': 'rgb(249, 249, 252)',
  'bg-gray-5': 'rgb(243, 243, 248)',
  'bg-gray-10': 'rgb(229, 229, 235)',
  'bg-gray-20': 'rgb(209, 209, 215)',
  'bg-gray-30': 'rgb(199, 199, 205)',
  'bg-gray-40': 'rgb(174, 174, 179)',
  'bg-gray-50': 'rgb(142, 142, 148)',
  'bg-gray-60': 'rgb(99, 99, 103)',
  'bg-gray-70': 'rgb(72, 72, 75)',
  'bg-gray-80': 'rgb(58, 58, 59)',
  'bg-gray-90': 'rgb(44, 44, 48)',
  'bg-gray-100': 'rgb(24, 24, 27)',

  // Border grays
  'border-gray-1': 'rgb(249, 249, 252)',
  'border-gray-5': 'rgb(243, 243, 248)',
  'border-gray-10': 'rgb(229, 229, 235)',
  'border-gray-20': 'rgb(209, 209, 215)',
  'border-gray-30': 'rgb(199, 199, 205)',
  'border-gray-40': 'rgb(174, 174, 179)',
  'border-gray-50': 'rgb(142, 142, 148)',
  'border-gray-60': 'rgb(99, 99, 103)',
  'border-gray-70': 'rgb(72, 72, 75)',
  'border-gray-80': 'rgb(58, 58, 59)',
  'border-gray-90': 'rgb(44, 44, 48)',
  'border-gray-100': 'rgb(24, 24, 27)',

  // Utility colors
  'text-white': 'rgb(255, 255, 255)',
  'text-black': 'rgb(0, 0, 0)',
  'bg-white': 'rgb(255, 255, 255)',
  'bg-black': 'rgb(0, 0, 0)',

  'bg-white-15': 'rgba(255, 255, 255, 0.15)',
  'bg-white-25': 'rgba(255, 255, 255, 0.25)',
  'bg-white-45': 'rgba(255, 255, 255, 0.45)',
  'border-white-20': 'rgba(255, 255, 255, 0.20)',
  'border-white-40': 'rgba(255, 255, 255, 0.40)',

  'bg-primary-10': 'rgba(0, 102, 255, 0.10)',
  'bg-primary-20': 'rgba(0, 102, 255, 0.20)',

  'bg-forgot-password-screen': '#ebf2ff',
  'border-color-forgot-password-screen': '#f6faff',
};

const darkThemeColors = {
  // Primary colors
  'text-primary': 'rgb(20, 114, 255)',
  'text-primary-dark': 'rgb(0, 96, 240)',

  // Status colors
  'text-red': 'rgb(255, 61, 51)',
  'text-red-dark': 'rgb(255, 36, 26)',
  'text-orange': 'rgb(255, 164, 36)',
  'text-orange-dark': 'rgb(255, 153, 10)',
  'text-yellow': 'rgb(255, 214, 51)',
  'text-yellow-dark': 'rgb(255, 209, 26)',
  'text-green': 'rgb(72, 208, 106)',
  'text-green-dark': 'rgb(52, 203, 90)',
  'text-pink': 'rgb(255, 71, 105)',
  'text-pink-dark': 'rgb(255, 15, 80)',
  'text-indigo': 'rgb(106, 103, 218)',
  'text-indigo-dark': 'rgb(85, 83, 213)',

  // Surface colors
  'text-surface': 'rgb(17, 17, 17)',
  'text-highlight': 'rgb(255, 255, 255)',
  'bg-surface': 'rgb(17, 17, 17)',
  'bg-highlight': 'rgb(255, 255, 255)',

  // Grays - Dark theme (INVERTIDOS)
  'text-gray-1': 'rgb(24, 24, 27)',
  'text-gray-5': 'rgb(44, 44, 48)',
  'text-gray-10': 'rgb(58, 58, 59)',
  'text-gray-20': 'rgb(72, 72, 75)',
  'text-gray-30': 'rgb(99, 99, 103)',
  'text-gray-40': 'rgb(142, 142, 148)',
  'text-gray-50': 'rgb(174, 174, 179)',
  'text-gray-60': 'rgb(199, 199, 205)',
  'text-gray-70': 'rgb(209, 209, 215)',
  'text-gray-80': 'rgb(229, 229, 235)',
  'text-gray-90': 'rgb(243, 243, 248)',
  'text-gray-100': 'rgb(249, 249, 252)',

  // Background grays
  'bg-gray-1': 'rgb(24, 24, 27)',
  'bg-gray-5': 'rgb(44, 44, 48)',
  'bg-gray-10': 'rgb(58, 58, 59)',
  'bg-gray-20': 'rgb(72, 72, 75)',
  'bg-gray-30': 'rgb(99, 99, 103)',
  'bg-gray-40': 'rgb(142, 142, 148)',
  'bg-gray-50': 'rgb(174, 174, 179)',
  'bg-gray-60': 'rgb(199, 199, 205)',
  'bg-gray-70': 'rgb(209, 209, 215)',
  'bg-gray-80': 'rgb(229, 229, 235)',
  'bg-gray-90': 'rgb(243, 243, 248)',
  'bg-gray-100': 'rgb(249, 249, 252)',

  // Border grays
  'border-gray-1': 'rgb(24, 24, 27)',
  'border-gray-5': 'rgb(44, 44, 48)',
  'border-gray-10': 'rgb(58, 58, 59)',
  'border-gray-20': 'rgb(72, 72, 75)',
  'border-gray-30': 'rgb(99, 99, 103)',
  'border-gray-40': 'rgb(142, 142, 148)',
  'border-gray-50': 'rgb(174, 174, 179)',
  'border-gray-60': 'rgb(199, 199, 205)',
  'border-gray-70': 'rgb(209, 209, 215)',
  'border-gray-80': 'rgb(229, 229, 235)',
  'border-gray-90': 'rgb(243, 243, 248)',
  'border-gray-100': 'rgb(249, 249, 252)',

  // Utility colors
  'text-white': 'rgb(255, 255, 255)',
  'text-black': 'rgb(0, 0, 0)',
  'bg-white': 'rgb(255, 255, 255)',
  'bg-black': 'rgb(0, 0, 0)',

  'bg-white-15': 'rgba(255, 255, 255, 0.15)',
  'bg-white-25': 'rgba(255, 255, 255, 0.25)',
  'bg-white-45': 'rgba(255, 255, 255, 0.45)',
  'border-white-20': 'rgba(255, 255, 255, 0.20)',
  'border-white-40': 'rgba(255, 255, 255, 0.40)',

  'bg-primary-10': 'rgba(20, 114, 255, 0.10)',
  'bg-primary-20': 'rgba(20, 114, 255, 0.20)',

  'bg-forgot-password-screen': 'rgba(20, 114, 255, 0.2)',
  'border-color-forgot-password-screen': 'rgba(20, 114, 255, 0.1)',
};

type ColorMap = typeof lightThemeColors;

const useGetColor = () => {
  const tailwind = useTailwind();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getColor = (textColorClass: string): string => {
    const themeColors: ColorMap = isDark ? darkThemeColors : lightThemeColors;

    if (themeColors[textColorClass as keyof ColorMap]) {
      return themeColors[textColorClass as keyof ColorMap];
    }

    const fallbackColor = tailwind(textColorClass).color as string;
    return fallbackColor;
  };

  return getColor;
};

export default useGetColor;
