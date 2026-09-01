/**
 * Helper utilities for Motion & Cursor physics
 */

/**
 * Normalizes cursor position relative to an element (returns -0.5 to 0.5)
 */
export function getRelativeCursorCoords(event, element) {
  if (!element) return { x: 0, y: 0, rawX: 0, rawY: 0 };
  const rect = element.getBoundingClientRect();
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  const x = rawX / rect.width - 0.5;
  const y = rawY / rect.height - 0.5;
  return { x, y, rawX, rawY };
}

/**
 * Checks if user is on mobile (< 768px)
 */
export function isMobileScreen() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
