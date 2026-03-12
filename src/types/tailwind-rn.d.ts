declare module 'tailwind-rn' {
  import type { ReactNode } from 'react';

  type TailwindFn = (_classNames: string) => { [x: string]: unknown };

  declare const useTailwind: () => TailwindFn;

  interface TailwindProviderProps {
    utilities: Record<string, unknown>;
    colorScheme?: 'light' | 'dark';
    children?: ReactNode;
  }
  declare const TailwindProvider: (props: TailwindProviderProps) => JSX.Element;

  // TODO: type 'color'

  export { useTailwind, TailwindProvider };
}
