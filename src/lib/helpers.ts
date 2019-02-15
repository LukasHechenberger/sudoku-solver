export function getCoordinates(index: number) {
  return [
    index % 9, // col
    Math.floor(index / 9), // row
  ];
}

export function getSquare(x: number, y: number) {
  return Math.floor((x / 3) % 3) + Math.floor(y / 3) * 3;
}

export function getIndex(x: number, y: number) {
  return y * 9 + x;
}
