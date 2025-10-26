// Utility: capitalize each word in kebab-case
export const capitalize = (str) =>
  str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
