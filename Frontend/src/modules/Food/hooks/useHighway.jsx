import { useState, useEffect, useCallback, useRef } from 'react'
import { highwayAPI } from '@food/api'

// ---- Cross-hook caching & in-flight de-dupe (module-level) ----
const HIGHWAY_CACHE_TTL_MS = 30 * 1000
const highwayCache = new Map() // key -> { ts, payload }
const highwayInFlight = new Map() // key -> Promise<payload>

const roundCoord = (v, digits = 5) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const p = 10 ** digits
  return Math.round(n * p) / p
}

const highwayKeyFromCoords = (lat, lng) => {
  const rLat = roundCoord(lat, 5)
  const rLng = roundCoord(lng, 5)
  if (rLat === null || rLng === null) return null
  return `${rLat},${rLng}`
}

const applyHighwayPayload = (data, { setHighwayId, setHighway, setHighwayStatus }) => {
  if (data?.status === 'IN_SERVICE' && data.highwayId) {
    setHighwayId(data.highwayId)
    setHighway({
      _id: data.highwayId,
      name: data.highwayName,
      ref: data.highwayRef,
      distanceMeters: data.distanceMeters
    })
    setHighwayStatus('IN_SERVICE')
    localStorage.setItem('userHighwayId', data.highwayId)
    localStorage.setItem('userHighway', JSON.stringify({
      _id: data.highwayId,
      name: data.highwayName,
      ref: data.highwayRef
    }))
    localStorage.setItem('userHighwayStatus', 'IN_SERVICE')
  } else {
    setHighwayId(null)
    setHighway(null)
    setHighwayStatus('OUT_OF_SERVICE')
    localStorage.removeItem('userHighwayId')
    localStorage.removeItem('userHighway')
    localStorage.setItem('userHighwayStatus', 'OUT_OF_SERVICE')
  }
}

/**
 * Hook to detect the nearest National Highway to the user's location.
 * Replaces useZone — uses highway proximity instead of polygon containment.
 * Maintains identical return shape to useZone for drop-in replacement.
 *
 * @param {{ latitude: number, longitude: number }} location
 */
export function useHighway(location) {
  const [highwayId, setHighwayId] = useState(() => localStorage.getItem('userHighwayId'))
  const [highwayStatus, setHighwayStatus] = useState(
    () => localStorage.getItem('userHighwayStatus') || 'loading'
  )
  const [highway, setHighway] = useState(() => {
    try {
      const cached = localStorage.getItem('userHighway')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const prevCoordsRef = useRef({ latitude: null, longitude: null })
  const debounceTimerRef = useRef(null)

  const lat = roundCoord(location?.latitude, 6)
  const lng = roundCoord(location?.longitude, 6)
  const coordsChanged =
    prevCoordsRef.current.latitude !== lat ||
    prevCoordsRef.current.longitude !== lng

  const detectHighway = useCallback(async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setHighwayStatus('OUT_OF_SERVICE')
      setHighwayId(null)
      setHighway(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const key = highwayKeyFromCoords(lat, lng)
      const now = Date.now()
      if (key) {
        const cached = highwayCache.get(key)
        if (cached && now - cached.ts < HIGHWAY_CACHE_TTL_MS) {
          applyHighwayPayload(cached.payload, { setHighwayId, setHighway, setHighwayStatus })
          return
        }
      }

      const promise = (() => {
        if (key && highwayInFlight.has(key)) return highwayInFlight.get(key)
        const p = highwayAPI
          .detectHighway(lat, lng)
          .then((response) => {
            if (!response?.data?.success) {
              throw new Error(response?.data?.message || 'Failed to detect highway')
            }
            return response.data.data
          })
          .finally(() => {
            if (key) highwayInFlight.delete(key)
          })
        if (key) highwayInFlight.set(key, p)
        return p
      })()

      const data = await promise
      if (key) highwayCache.set(key, { ts: now, payload: data })
      applyHighwayPayload(data, { setHighwayId, setHighway, setHighwayStatus })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to detect highway')
      // Fall back to cached value on network failure — don't kick out the user
      const cachedHighwayId = localStorage.getItem('userHighwayId')
      if (cachedHighwayId) {
        const cachedHighway = localStorage.getItem('userHighway')
        setHighwayId(cachedHighwayId)
        setHighway(cachedHighway ? JSON.parse(cachedHighway) : null)
        setHighwayStatus('IN_SERVICE')
      } else {
        setHighwayStatus('loading')
        setHighwayId(null)
        setHighway(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (coordsChanged) {
        setLoading(true)
        prevCoordsRef.current = { latitude: lat, longitude: lng }
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          detectHighway(lat, lng)
        }, 50)
      }
    } else {
      // Use cached value while location is loading
      const cachedHighwayId = localStorage.getItem('userHighwayId')
      if (cachedHighwayId) {
        const cachedHighway = localStorage.getItem('userHighway')
        const cachedStatus = localStorage.getItem('userHighwayStatus')
        setHighwayId(cachedHighwayId)
        setHighway(cachedHighway ? JSON.parse(cachedHighway) : null)
        setHighwayStatus(cachedStatus || 'IN_SERVICE')
      } else {
        setHighwayStatus('loading')
        setHighwayId(null)
        setHighway(null)
      }
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [location?.latitude, location?.longitude, detectHighway])

  const refreshHighway = useCallback(() => {
    const lat = location?.latitude
    const lng = location?.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      detectHighway(lat, lng)
    }
  }, [location?.latitude, location?.longitude, detectHighway])

  return {
    // Highway-specific fields
    highwayId,
    highway,
    highwayStatus,
    // Drop-in aliases matching useZone shape
    zoneId: highwayId,
    zone: highway,
    zoneStatus: highwayStatus,
    loading: loading || coordsChanged,
    error,
    isInService: highwayStatus === 'IN_SERVICE',
    isOutOfService: highwayStatus === 'OUT_OF_SERVICE',
    refreshHighway,
    // Backward compat alias
    refreshZone: refreshHighway,
  }
}
