import { useLocation } from './useLocation'
import { useHighway as useZone } from './useHighway'

/**
 * Read centralized location + zone information from the active hooks.
 * Keeps the old hook contract for callers that still import useAppLocation.
 */
export function useAppLocation() {
  const {
    location,
    effectiveLocation,
    loading: locationLoading,
    requestLocation,
  } = useLocation()
  const {
    zoneId,
    zoneStatus,
    loading: zoneLoading,
    isOutOfService,
    refreshZone,
  } = useZone(location)

  return {
    isLocationResolved: Boolean(location?.latitude && location?.longitude),
    location,
    effectiveLocation,
    zoneId,
    address: location?.address || location?.formattedAddress || null,
    zoneStatus,
    loading: locationLoading || zoneLoading,
    isOutOfService,
    deliveryAddressMode: 'saved',
    requestLocation,
    setSavedLocation: () => {},
    setDeliveryAddressMode: () => {},
    refreshZone,
  }
}
