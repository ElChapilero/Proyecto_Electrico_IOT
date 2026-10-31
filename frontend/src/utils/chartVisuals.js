export const comparisonMarkers = ["circle", "square", "diamond", "triangle"];

export function comparisonColor(hex, variant) {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const mix = Math.min(0.62, variant * 0.28);
  return `rgb(${Math.round(red + (255 - red) * mix)}, ${Math.round(
    green + (255 - green) * mix,
  )}, ${Math.round(blue + (255 - blue) * mix)})`;
}
