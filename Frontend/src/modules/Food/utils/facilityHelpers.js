const isTruthyValue = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

export const getFacilityAvailability = (facilities, key) => {
  const entry = facilities?.[key];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return entry.available === true;
  }
  return isTruthyValue(entry);
};

export const getFacilityRatingEntry = (restaurant, key) => {
  const nestedRating = restaurant?.facilities?.[key]?.rating;
  if (nestedRating && typeof nestedRating === "object") {
    return {
      average: Number(nestedRating.average || 0) || 0,
      count: Number(nestedRating.count || 0) || 0,
    };
  }
  return { average: 0, count: 0 };
};

export const getOverallFacilityRatingEntry = (restaurant) => {
  const nestedOverall = restaurant?.facilities?.overall?.rating;
  if (nestedOverall && typeof nestedOverall === "object") {
    return {
      average: Number(nestedOverall.average || 0) || 0,
      count: Number(nestedOverall.count || 0) || 0,
    };
  }
  return { average: 0, count: 0 };
};
