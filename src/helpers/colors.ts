/** Turns an `rgb(r, g, b)` color into `rgba(r, g, b, opacity)`. */
export const applyOpacity = (rgbColor: string, opacity: number): string =>
  rgbColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
