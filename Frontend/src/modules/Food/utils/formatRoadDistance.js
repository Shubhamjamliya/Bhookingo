export const formatRoadDistance = (distanceMeters) => {
  const numericDistance = Number(distanceMeters);
  if (!Number.isFinite(numericDistance) || numericDistance < 0) return "-";
  if (numericDistance <= 10) return "At selected pin";
  if (numericDistance < 1000) return `${Math.round(numericDistance)} m`;
  return `${(numericDistance / 1000).toFixed(numericDistance >= 10000 ? 0 : 1)} KM`;
};
