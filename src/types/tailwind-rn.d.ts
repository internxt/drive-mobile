declare module 'tailwind-rn' {
  const tailwind: (_classNames: string) => {
    [x: string]: unknown;
  };
  declare const useTailwind = () => tailwind;

  // TODO: type 'color'

  export { useTailwind };
}
