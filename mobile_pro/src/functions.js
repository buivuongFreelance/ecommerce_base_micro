// eslint-disable-next-line import/prefer-default-export
export const calculatePhysicalGrading = (point) => {
  const number = Number(point);
  if (number === 50) {
    return 'A';
  } if (number === 40) {
    return 'B';
  } if (number === 30) {
    return 'C';
  }
  return 'D';
};
