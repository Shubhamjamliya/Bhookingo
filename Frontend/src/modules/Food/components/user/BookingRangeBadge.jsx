import React, { useMemo } from 'react'
import { getRestaurantDistanceKm } from '@food/utils/common'

export { getRestaurantDistanceKm }

export default function BookingRangeBadge({ restaurant, userLocation, className = "" }) {
  const isOutOfRange = useMemo(() => {
    const dVal = getRestaurantDistanceKm(restaurant, userLocation)
    return dVal !== null && dVal > 50
  }, [restaurant, userLocation])

  if (!isOutOfRange) return null

  return (
    <div className={`absolute top-4 left-4 z-10 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg border border-red-500 ${className}`}>
      Outside Booking Range
    </div>
  )
}
