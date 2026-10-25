export function chartTooltipPosition(container, marker) {
  if (!container || !marker) return null;
  const halfTooltip = Math.min(120, Math.max(70, container.width / 2 - 8));
  const markerCenter = marker.left + marker.width / 2;
  const left = Math.min(
    Math.max(markerCenter, container.left + halfTooltip),
    container.right - halfTooltip,
  );
  const below = marker.top - container.top < 105;
  return { left, top: below ? marker.bottom + 10 : marker.top - 10, below };
}
