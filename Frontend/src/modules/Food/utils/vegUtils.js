/**
 * Centralized Veg Mode Filtering Utilities for Bhookingo Food Module
 * Single Source of Truth for Veg Item & Restaurant Classification
 */

/**
 * Robust helper to check if a dish/food item is vegetarian.
 * Supports all schema variations across backend models, legacy API payloads, and frontend transforms:
 * - item.isVeg (boolean / number)
 * - item.foodType ("Veg", "veg", "Non-Veg", "non-veg")
 * - item.dietType ("veg", "non-veg")
 * - item.is_veg (1 / true)
 * - item.category ("VEG", "Veg")
 */
export const isVegItem = (item) => {
  if (!item || typeof item !== "object") return false;

  // 1. Explicit boolean `isVeg`
  if (typeof item.isVeg === "boolean") {
    return item.isVeg;
  }
  if (typeof item.isVeg === "number") {
    return item.isVeg === 1;
  }

  // 2. Explicit `is_veg` (snake_case)
  if (typeof item.is_veg === "boolean") {
    return item.is_veg;
  }
  if (typeof item.is_veg === "number") {
    return item.is_veg === 1;
  }

  // 3. String based `foodType` (e.g. "Veg", "Non-Veg")
  if (item.foodType) {
    const ft = String(item.foodType).trim().toLowerCase();
    if (ft === "veg") return true;
    if (ft === "non-veg" || ft === "nonveg") return false;
    if (ft.includes("veg") && !ft.includes("non")) return true;
  }

  // 4. String based `dietType` (e.g. "veg", "non-veg")
  if (item.dietType) {
    const dt = String(item.dietType).trim().toLowerCase();
    if (dt === "veg" || dt === "pure-veg") return true;
    if (dt === "non-veg" || dt === "nonveg") return false;
    if (dt.includes("veg") && !dt.includes("non")) return true;
  }

  // 5. String based `category` fallback (e.g. "VEG")
  if (item.category) {
    const cat = String(item.category).trim().toLowerCase();
    if (cat === "veg") return true;
    if (cat === "non-veg" || cat === "nonveg") return false;
  }

  // Default fallback for items with no explicit veg indicators
  return false;
};

/**
 * Filters an array of dish items, returning only vegetarian items.
 */
export const filterVegItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter(isVegItem);
};

/**
 * Recursively filters menu sections and subsections to retain only Veg items.
 * Empty subsections or sections with 0 Veg items are automatically pruned.
 */
export const filterMenuSections = (sections) => {
  if (!Array.isArray(sections)) return [];

  return sections
    .map((section) => {
      const filteredItems = filterVegItems(section?.items || []);

      const filteredSubsections = (section?.subsections || [])
        .map((sub) => {
          const subItems = filterVegItems(sub?.items || []);
          return subItems.length > 0 ? { ...sub, items: subItems } : null;
        })
        .filter(Boolean);

      const hasItems = filteredItems.length > 0;
      const hasSubsections = filteredSubsections.length > 0;

      if (!hasItems && !hasSubsections) return null;

      return {
        ...section,
        items: filteredItems,
        subsections: filteredSubsections,
      };
    })
    .filter(Boolean);
};

/**
 * Checks if a restaurant has at least one Veg dish or is marked pureVegRestaurant.
 */
export const hasVegItems = (restaurant) => {
  if (!restaurant) return false;
  if (restaurant.pureVegRestaurant === true) return true;

  // Check embedded menu items or menuSections
  if (Array.isArray(restaurant.menuItems) && restaurant.menuItems.some(isVegItem)) {
    return true;
  }

  if (Array.isArray(restaurant.menuSections)) {
    const vegSections = filterMenuSections(restaurant.menuSections);
    if (vegSections.length > 0) return true;
  }

  return false;
};

/**
 * Centralized restaurant visibility rule based on Veg Mode and Veg Option ("all" vs "pure-veg").
 */
export const shouldShowRestaurantInVegMode = (restaurant, vegMode, vegModeOption = "all") => {
  if (!restaurant) return false;

  // If Veg Mode is OFF, all restaurants are visible
  if (!vegMode) return true;

  // If "Pure Veg Restaurants Only" option is selected
  if (vegModeOption === "pure-veg") {
    return restaurant.pureVegRestaurant === true;
  }

  // If "All Restaurants" option is selected:
  // Show pure veg restaurants AND mixed restaurants that have at least 1 veg dish
  return restaurant.pureVegRestaurant === true || hasVegItems(restaurant);
};
