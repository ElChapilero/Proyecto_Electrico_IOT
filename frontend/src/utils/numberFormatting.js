// Los valores se mantienen sin redondear en el estado y en las operaciones.
// Esta función solo define su representación en pantalla.
export const VISUAL_DECIMALS = 4;

export function formatVisualNumber(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: VISUAL_DECIMALS,
    maximumFractionDigits: VISUAL_DECIMALS,
  });
}
