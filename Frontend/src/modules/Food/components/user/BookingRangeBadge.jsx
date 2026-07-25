import React, { useMemo } from 'react'
import { getRestaurantDistanceKm } from '@food/utils/common'
import { useLocation } from '@food/hooks/useLocation'
import { useProfile } from '@food/context/ProfileContext'

export { getRestaurantDistanceKm }

export default function BookingRangeBadge({ restaurant, userLocation: propUserLocation, className = "" }) {
  const { location: geoLoc } = useLocation()
  const { receiverDetails } = useProfile()

  const activeLocation = useMemo(() => {
    if (propUserLocation) return propUserLocation
    if (receiverDetails?.isForSomeoneElse && Number.isFinite(Number(receiverDetails?.receiverLat)) && Number.isFinite(Number(receiverDetails?.receiverLng))) {
      return {
        latitude: Number(receiverDetails.receiverLat),
        longitude: Number(receiverDetails.receiverLng),
        isReceiverLocation: true
      }
    }
    return geoLoc
  }, [propUserLocation, receiverDetails, geoLoc])

  const isOutOfRange = useMemo(() => {
    const dVal = getRestaurantDistanceKm(restaurant, activeLocation)
    return dVal !== null && dVal > 50
  }, [restaurant, activeLocation])

  if (!isOutOfRange) return null

  return (
    <div className={`absolute top-4 left-4 z-10 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg border border-red-500 ${className}`}>
      Outside Booking Range
    </div>
  )
}
