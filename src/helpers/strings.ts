export const titlerize = (value: string, onlyFirstLetter = true) => {
  if (onlyFirstLetter) value[0].toUpperCase() + value.substring(1, value.length);
  return value
    .split(' ')
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1, word.length);
    })
    .join(' ');
};
