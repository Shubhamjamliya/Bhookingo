/**
 * Formats a Date/Time value into the standard Indian locale date-time representation.
 * @param {string|Date} value
 * @returns {string} Formatted date time string.
 */
export const formatDateTime = (value) => {
  if (!value) return "N/A"
  const date = new Date(value)
  if (isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })
}
