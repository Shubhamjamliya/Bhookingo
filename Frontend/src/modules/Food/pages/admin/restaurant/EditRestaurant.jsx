import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { adminAPI, highwayAPI } from "@food/api"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { Label } from "@food/components/ui/label"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { formatRoadDistance } from "@food/utils/formatRoadDistance"
import { ArrowLeft, Loader2, MapPin, CheckCircle2, AlertCircle } from "lucide-react"

const debugError = (..._args) => { }

const toNumberOrEmpty = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : ""
}

const isNearZero = (n) => Math.abs(Number(n) || 0) < 0.000001

const normalizeRestaurantId = (r) => r?._id || r?.id || r?.restaurantId || ""

const normalizeZoneId = (zoneId) => {
  if (!zoneId) return ""
  if (typeof zoneId === "string") return zoneId
  return zoneId?._id || zoneId?.id || ""
}

const parseGoogleAddressComponents = (components = []) => {
  const get = (types) => components.find((component) => types.some((type) => component.types?.includes(type)))?.long_name || ""
  const route = get(["route"])
  const streetNumber = get(["street_number"])
  const roadName = [streetNumber, route].filter(Boolean).join(" ").trim() || route || ""

  return {
    area: get(["sublocality_level_1", "sublocality", "neighborhood"]) || get(["locality"]),
    city: get(["locality"]) || get(["administrative_area_level_2"]),
    state: get(["administrative_area_level_1"]) || get(["administrative_area_level_2"]),
    pincode: get(["postal_code"]),
    roadName,
  }
}

const extractHighwayRef = (value = "") => {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const compactMatch = raw.match(/\b(NH|SH)\s*[- ]?\s*(\d+[A-Z]?)\b/i)
  if (compactMatch) {
    return `${compactMatch[1].toUpperCase()}-${compactMatch[2].toUpperCase()}`
  }

  const expandedMatch = raw.match(/\b(National|State)\s+Highway\s+(\d+[A-Z]?)\b/i)
  if (expandedMatch) {
    const prefix = expandedMatch[1].toLowerCase().startsWith("national") ? "NH" : "SH"
    return `${prefix}-${expandedMatch[2].toUpperCase()}`
  }

  return ""
}

const normalizeLocationFormFromRestaurant = (restaurant) => {
  const loc =
    restaurant?.location ||
    restaurant?.onboarding?.step1?.location ||
    {}

  const lat =
    toNumberOrEmpty(loc?.latitude ?? restaurant?.latitude)
  const lng =
    toNumberOrEmpty(loc?.longitude ?? restaurant?.longitude)

  const hasValidCoords =
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    !isNearZero(lat) &&
    !isNearZero(lng)

  const formattedAddress =
    loc?.formattedAddress ||
    loc?.addressLine1 ||
    restaurant?.formattedAddress ||
    restaurant?.addressLine1 ||
    restaurant?.address ||
    ""

  return {
    zoneId: normalizeZoneId(restaurant?.zoneId),
    formattedAddress,
    addressLine1: loc?.addressLine1 || restaurant?.addressLine1 || formattedAddress,
    addressLine2: loc?.addressLine2 || restaurant?.addressLine2 || "",
    area: loc?.area || restaurant?.area || "",
    city: loc?.city || restaurant?.city || "",
    state: loc?.state || restaurant?.state || "",
    pincode: loc?.pincode || restaurant?.pincode || "",
    landmark: loc?.landmark || restaurant?.landmark || "",
    placeId: loc?.placeId || restaurant?.placeId || "",
    roadName: loc?.roadName || restaurant?.roadName || "",
    highwayRef: restaurant?.highwayRef || "",
    latitude: hasValidCoords ? lat : "",
    longitude: hasValidCoords ? lng : "",
  }
}

const normalizeDetailsFormFromRestaurant = (restaurant) => {
  return {
    name: restaurant?.name || restaurant?.restaurantName || "",
    isHighwayRestaurant:
      typeof restaurant?.isHighwayRestaurant === "boolean"
        ? restaurant.isHighwayRestaurant
        : true,
    pureVegRestaurant:
      typeof restaurant?.pureVegRestaurant === "boolean"
        ? restaurant.pureVegRestaurant
        : false,
    ownerName: restaurant?.ownerName || "",
    ownerEmail: restaurant?.ownerEmail || "",
    ownerPhone: restaurant?.ownerPhone || "",
    primaryContactNumber: restaurant?.primaryContactNumber || "",
    email: restaurant?.email || "",
    cuisinesText: Array.isArray(restaurant?.cuisines) ? restaurant.cuisines.join(", ") : "",
    offer: restaurant?.offer || "",
    isActive: restaurant?.isActive !== false,
    takeawayEnabled: restaurant?.takeawaySettings?.isEnabled ?? false,
    facilities: restaurant?.facilities ? {
      parking: restaurant.facilities.parking === true,
      wifi: restaurant.facilities.wifi === true,
      familyFriendly: restaurant.facilities.familyFriendly === true,
      evCharging: restaurant.facilities.evCharging === true,
      washroom: restaurant.facilities.washroom === true
    } : {
      parking: false,
      wifi: false,
      familyFriendly: false,
      evCharging: false,
      washroom: false
    },
  }
}

async function loadGooglePlaces() {
  if (window.google?.maps?.places?.Autocomplete) return true
  const apiKey = await getGoogleMapsApiKey()
  if (!apiKey) return false

  window.gm_authFailure = () => { }

  const existing = document.getElementById("admin-google-maps-script")
  if (existing) {
    await new Promise((resolve, reject) => {
      if (window.google?.maps?.places?.Autocomplete) {
        resolve()
        return
      }
      existing.addEventListener("load", resolve, { once: true })
      existing.addEventListener("error", reject, { once: true })
    })
    return !!window.google?.maps?.places?.Autocomplete
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.id = "admin-google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return !!window.google?.maps?.places?.Autocomplete
}

export default function EditRestaurant() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [error, setError] = useState("")

  const [restaurant, setRestaurant] = useState(null)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(false)

  const [detailsForm, setDetailsForm] = useState(() => normalizeDetailsFormFromRestaurant(null))
  const [locationForm, setLocationForm] = useState(() => normalizeLocationFormFromRestaurant(null))
  const [locationError, setLocationError] = useState("")
  const [locationSearchValue, setLocationSearchValue] = useState("")
  const [isGoogleMapsValid, setIsGoogleMapsValid] = useState(true)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [highwayInfo, setHighwayInfo] = useState({
    loading: false,
    status: null,
    highwayId: null,
    highwayName: null,
    highwayRef: null,
    distanceMeters: null,
    thresholdMeters: null,
  })
  const [isRoadNameDirty, setIsRoadNameDirty] = useState(false)
  const [isHighwayRefDirty, setIsHighwayRefDirty] = useState(false)
  const [isMapsSdkReady, setIsMapsSdkReady] = useState(() => Boolean(window.google?.maps))

  const locationSearchInputRef = useRef(null)
  const placesAutocompleteRef = useRef(null)
  const mapsScriptLoadedRef = useRef(false)
  const isPlaceSelectedRef = useRef(false)
  const pinMapContainerRef = useRef(null)
  const pinMapRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const pinGeocoderRef = useRef(null)
  const lastAutoRoadNameRef = useRef("")

  const restaurantId = useMemo(() => {
    if (id) return id
    return normalizeRestaurantId(restaurant)
  }, [id, restaurant])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!restaurantId) return
      try {
        setLoading(true)
        setError("")

        const res = await adminAPI.getRestaurantById(restaurantId)
        const data = res?.data?.data || null
        if (!mounted) return
        if (!res?.data?.success || !data) {
          setError(res?.data?.message || "Failed to load restaurant")
          setRestaurant(null)
          return
        }

        setRestaurant(data)
        setDetailsForm(normalizeDetailsFormFromRestaurant(data))
        setLocationForm(normalizeLocationFormFromRestaurant(data))
        setLocationSearchValue(
          data?.location?.formattedAddress ||
          data?.location?.addressLine1 ||
          data?.formattedAddress ||
          data?.addressLine1 ||
          data?.address ||
          ""
        )
      } catch (e) {
        debugError(e)
        if (!mounted) return
        setError(e?.response?.data?.message || "Failed to load restaurant")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [restaurantId])

  useEffect(() => {
    let mounted = true
    setZonesLoading(true)

    if (typeof adminAPI.getZones !== "function") {
      console.warn("adminAPI.getZones is not defined")
      setZones([])
      setZonesLoading(false)
      return
    }

    adminAPI
      .getZones({ limit: 1000 })
      .then((res) => {
        const list =
          res?.data?.data?.zones ||
          res?.data?.data?.data?.zones ||
          res?.data?.data ||
          []
        if (!mounted) return
        setZones(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.error("Failed to load zones", err)
        if (!mounted) return
        setZones([])
      })
      .finally(() => {
        if (!mounted) return
        setZonesLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let autocomplete = null

    if (placesAutocompleteRef.current) {
      try {
        window.google?.maps?.event?.clearInstanceListeners(placesAutocompleteRef.current)
      } catch {}
      placesAutocompleteRef.current = null
    }

    const init = async () => {
      let inputElement = null
      for (let i = 0; i < 50; i += 1) {
        if (locationSearchInputRef.current) {
          inputElement = locationSearchInputRef.current
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (!inputElement || cancelled) return

      const loadMaps = async () => {
        if (window.google?.maps?.places?.Autocomplete) {
          mapsScriptLoadedRef.current = true
          setIsMapsSdkReady(true)
          return true
        }

        const apiKey = await getGoogleMapsApiKey()
        if (!apiKey) {
          setIsGoogleMapsValid(false)
          setLocationError("Unable to load Google Places Autocomplete.")
          return false
        }

        window.gm_authFailure = () => {
          setIsGoogleMapsValid(false)
          setIsMapsSdkReady(false)
          setLocationError("Unable to load Google Places Autocomplete.")
        }

        const scripts = Array.from(document.getElementsByTagName("script"))
        const mapsScript = scripts.find((script) => script.src?.includes("maps.googleapis.com/maps/api/js"))

        if (mapsScript && !mapsScript.src.includes("libraries=places")) {
          mapsScript.remove()
        } else if (mapsScript && mapsScript.src.includes("libraries=places")) {
          for (let i = 0; i < 60; i += 1) {
            if (window.google?.maps?.places?.Autocomplete) return true
            if (cancelled) return false
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }

        return new Promise((resolve) => {
          const script = document.createElement("script")
          script.id = "google-maps-sdk"
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
          script.async = true
          script.defer = true
          script.onload = () => {
            setTimeout(() => {
              const ok = !!window.google?.maps?.places?.Autocomplete
              mapsScriptLoadedRef.current = ok
              setIsMapsSdkReady(Boolean(window.google?.maps))
              if (!ok) {
                setIsGoogleMapsValid(false)
                setLocationError("Unable to load Google Places Autocomplete.")
              }
              resolve(ok)
            }, 200)
          }
          script.onerror = () => {
            setIsGoogleMapsValid(false)
            setIsMapsSdkReady(false)
            setLocationError("Unable to load Google Places Autocomplete.")
            resolve(false)
          }
          document.head.appendChild(script)
        })
      }

      const parsePlace = (place) => {
        const formattedAddress = place?.formatted_address || ""
        const comps = Array.isArray(place?.address_components) ? place.address_components : []
        const parsedAddress = parseGoogleAddressComponents(comps)
        const lat = place?.geometry?.location?.lat?.()
        const lng = place?.geometry?.location?.lng?.()

        return {
          formattedAddress,
          area: parsedAddress.area,
          city: parsedAddress.city,
          state: parsedAddress.state,
          pincode: parsedAddress.pincode,
          roadName: parsedAddress.roadName,
          placeId: place?.place_id || "",
          latitude: Number.isFinite(lat) ? Number(lat.toFixed(6)) : "",
          longitude: Number.isFinite(lng) ? Number(lng.toFixed(6)) : "",
        }
      }

      setLocationError("")
      const ok = await loadMaps()
      if (!ok || cancelled || !inputElement) return

      if (inputElement.hasAttribute("data-google-places-initialized")) return

      try {
        autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
          fields: ["formatted_address", "address_components", "geometry", "place_id"],
          componentRestrictions: { country: "in" },
          types: ["geocode", "establishment"],
        })

        inputElement.setAttribute("data-google-places-initialized", "true")
        placesAutocompleteRef.current = autocomplete
        isPlaceSelectedRef.current = false
        setIsGoogleMapsValid(true)

        autocomplete.addListener("place_changed", () => {
          if (cancelled) return
          const place = autocomplete.getPlace()
          if (!place?.geometry) return

          isPlaceSelectedRef.current = true
          const parsed = parsePlace(place)
          setLocationForm((prev) => ({
            ...prev,
            formattedAddress: parsed.formattedAddress || prev.formattedAddress,
            addressLine1: parsed.formattedAddress || prev.addressLine1 || "",
            area: parsed.area || prev.area,
            city: parsed.city || prev.city,
            state: parsed.state || prev.state,
            pincode: parsed.pincode || prev.pincode,
            roadName: parsed.roadName || prev.roadName || "",
            placeId: parsed.placeId || prev.placeId || "",
            latitude: parsed.latitude !== "" ? parsed.latitude : prev.latitude,
            longitude: parsed.longitude !== "" ? parsed.longitude : prev.longitude,
          }))
          setLocationSearchValue(parsed.formattedAddress || "")
          setIsRoadNameDirty(false)

          if (inputElement) inputElement.blur()

          const containers = document.querySelectorAll(".pac-container")
          containers.forEach((container) => {
            container.style.display = "none"
            container.style.visibility = "hidden"
          })
        })

        const pacContainerFix = () => {
          if (cancelled) return
          const containers = document.querySelectorAll(".pac-container")
          if (isPlaceSelectedRef.current) {
            containers.forEach((container) => {
              container.style.display = "none"
              container.style.visibility = "hidden"
            })
            return
          }
          const applyFix = () => {
            if (cancelled || isPlaceSelectedRef.current) {
              containers.forEach((container) => {
                container.style.display = "none"
                container.style.visibility = "hidden"
              })
              return
            }
            containers.forEach((container) => {
              container.style.zIndex = "999999"
              container.style.pointerEvents = "auto"
              container.style.visibility = "visible"
              container.style.display = "block"
            })
          }
          applyFix()
          setTimeout(applyFix, 100)
          setTimeout(applyFix, 300)
        }

        inputElement.addEventListener("focus", () => {
          if (cancelled) return
          isPlaceSelectedRef.current = false
          pacContainerFix()
        })
        inputElement.addEventListener("input", () => {
          if (cancelled) return
          isPlaceSelectedRef.current = false
          pacContainerFix()
        })
      } catch (e) {
        debugError(e)
        setIsGoogleMapsValid(false)
        setLocationError("Unable to load Google Places Autocomplete.")
      }
    }

    init().catch(() => {})

    return () => {
      cancelled = true
      if (autocomplete) {
        try {
          window.google?.maps?.event?.clearInstanceListeners(autocomplete)
        } catch {}
      }
      if (locationSearchInputRef.current) {
        locationSearchInputRef.current.removeAttribute("data-google-places-initialized")
      }
      placesAutocompleteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isGoogleMapsValid) {
      setLocationSuggestions([])
      setIsSearchingLocation(false)
      return
    }

    const q = String(locationSearchValue || "").trim()
    if (q.length < 3) {
      setLocationSuggestions([])
      setIsSearchingLocation(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingLocation(true)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=4&q=${encodeURIComponent(q)}&countrycodes=in`
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        const json = await res.json()
        const mapped = (Array.isArray(json) ? json : []).map((result) => ({
          id: result.place_id,
          display: result.display_name || "",
          lat: Number(result.lat),
          lng: Number(result.lon),
          addr: result.address || {},
          place_id: result.place_id,
        }))
        setLocationSuggestions(mapped)
      } catch (e) {
        debugError(e)
      } finally {
        setIsSearchingLocation(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [locationSearchValue, isGoogleMapsValid])

  useEffect(() => {
    if (window.google?.maps && !isMapsSdkReady) {
      setIsMapsSdkReady(true)
    }
  }, [isMapsSdkReady])

  const detectHighwayForLocation = useCallback(async (lat, lng) => {
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setHighwayInfo({ loading: false, status: null, highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    setHighwayInfo((prev) => ({ ...prev, loading: true }))
    try {
      const res = await highwayAPI.detectHighway(latNum, lngNum)
      const data = res?.data?.data
      if (res?.data?.success && data) {
        setHighwayInfo({
          loading: false,
          status: data.status,
          highwayId: data.highwayId || null,
          highwayName: data.highwayName || null,
          highwayRef: data.highwayRef || null,
          distanceMeters: data.distanceMeters ?? null,
          thresholdMeters: data.thresholdMeters ?? null,
        })
      } else {
        setHighwayInfo({ loading: false, status: "OUT_OF_SERVICE", highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      }
    } catch {
      setHighwayInfo((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    if (detailsForm.isHighwayRestaurant !== true) {
      setHighwayInfo({ loading: false, status: null, highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    const lat = locationForm.latitude
    const lng = locationForm.longitude
    if (!lat || !lng) {
      setHighwayInfo({ loading: false, status: null, highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    detectHighwayForLocation(lat, lng)
  }, [detailsForm.isHighwayRestaurant, locationForm.latitude, locationForm.longitude, detectHighwayForLocation])

  const autoDetectedHighwayRef = extractHighwayRef(highwayInfo.highwayRef || highwayInfo.highwayName || "")

  useEffect(() => {
    if (!autoDetectedHighwayRef) return
    setLocationForm((prev) => {
      const currentHighwayRef = String(prev.highwayRef || "")
      if (isHighwayRefDirty && currentHighwayRef && currentHighwayRef !== lastAutoRoadNameRef.current) return prev
      if (currentHighwayRef === autoDetectedHighwayRef) {
        lastAutoRoadNameRef.current = autoDetectedHighwayRef
        return prev
      }
      lastAutoRoadNameRef.current = autoDetectedHighwayRef
      return { ...prev, highwayRef: autoDetectedHighwayRef }
    })
  }, [
    autoDetectedHighwayRef,
    isHighwayRefDirty,
  ])

  const reverseGeocodePinnedLocation = async (lat, lng) => {
    if (!window.google?.maps?.Geocoder) return null
    if (!pinGeocoderRef.current) pinGeocoderRef.current = new window.google.maps.Geocoder()
    return new Promise((resolve) => {
      pinGeocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return resolve(null)
        const place = results[0]
        const parsed = parseGoogleAddressComponents(place.address_components || [])
        resolve({ formattedAddress: place.formatted_address || "", placeId: place.place_id || "", ...parsed })
      })
    })
  }

  const syncPinnedLocation = async (lat, lng) => {
    const roundedLat = Number(Number(lat).toFixed(6))
    const roundedLng = Number(Number(lng).toFixed(6))
    if (!Number.isFinite(roundedLat) || !Number.isFinite(roundedLng)) return
    const geoDetails = await reverseGeocodePinnedLocation(roundedLat, roundedLng)
    setLocationForm((prev) => ({
      ...prev,
      formattedAddress: geoDetails?.formattedAddress || prev.formattedAddress || `${roundedLat}, ${roundedLng}`,
      addressLine1: geoDetails?.formattedAddress || prev.addressLine1 || `${roundedLat}, ${roundedLng}`,
      area: geoDetails?.area || prev.area,
      city: geoDetails?.city || prev.city,
      state: geoDetails?.state || prev.state,
      pincode: geoDetails?.pincode || prev.pincode,
      latitude: roundedLat,
      longitude: roundedLng,
      placeId: geoDetails?.placeId || prev.placeId || "",
      roadName: geoDetails?.roadName || prev.roadName || prev.area || "",
    }))
    if (geoDetails?.formattedAddress) {
      setLocationSearchValue(geoDetails.formattedAddress)
    }
    setIsRoadNameDirty(false)
  }

  useEffect(() => {
    const lat = Number(locationForm.latitude)
    const lng = Number(locationForm.longitude)
    if (!isMapsSdkReady || !Number.isFinite(lat) || !Number.isFinite(lng) || !pinMapContainerRef.current || !window.google?.maps) return undefined
    const center = { lat, lng }
    if (!pinMapRef.current) {
      pinMapRef.current = new window.google.maps.Map(pinMapContainerRef.current, { center, zoom: 16, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: "greedy" })
      pinMarkerRef.current = new window.google.maps.Marker({ map: pinMapRef.current, position: center, draggable: true, title: "Restaurant Pin", animation: window.google.maps.Animation?.DROP })
      pinMarkerRef.current.addListener("dragend", async (event) => {
        await syncPinnedLocation(event?.latLng?.lat?.(), event?.latLng?.lng?.())
      })
      pinMapRef.current.addListener("click", async (event) => {
        const nextLat = event?.latLng?.lat?.()
        const nextLng = event?.latLng?.lng?.()
        if (pinMarkerRef.current && Number.isFinite(nextLat) && Number.isFinite(nextLng)) pinMarkerRef.current.setPosition({ lat: nextLat, lng: nextLng })
        await syncPinnedLocation(nextLat, nextLng)
      })
    } else {
      pinMapRef.current.setCenter(center)
      pinMarkerRef.current?.setPosition(center)
      pinMarkerRef.current?.setDraggable(true)
    }
    return undefined
  }, [locationForm.latitude, locationForm.longitude, isMapsSdkReady])

  const currentZoneLabel = useMemo(() => {
    const zid = normalizeZoneId(locationForm.zoneId)
    if (!zid) return ""
    const z = zones.find((x) => normalizeZoneId(x?._id || x?.id) === zid)
    return z?.name || z?.zoneName || ""
  }, [locationForm.zoneId, zones])

  const handleSaveDetails = async () => {
    if (!restaurantId) return
    try {
      setSavingDetails(true)

      const cuisines = String(detailsForm.cuisinesText || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)

      const payload = {
        name: detailsForm.name,
        isHighwayRestaurant: detailsForm.isHighwayRestaurant === true,
        pureVegRestaurant: detailsForm.pureVegRestaurant === true,
        ownerName: detailsForm.ownerName,
        ownerEmail: detailsForm.ownerEmail,
        ownerPhone: detailsForm.ownerPhone,
        primaryContactNumber: detailsForm.primaryContactNumber,
        email: detailsForm.email,
        cuisines,
        offer: detailsForm.offer,
        openingTime: detailsForm.openingTime,
        closingTime: detailsForm.closingTime,
        isActive: detailsForm.isActive !== false,
        takeawaySettings: {
          isEnabled: detailsForm.takeawayEnabled === true,
        },
        facilities: detailsForm.facilities,
      }

      const res = await adminAPI.updateRestaurant(restaurantId, payload)
      const updated = res?.data?.data?.restaurant || res?.data?.data || null
      if (updated) {
        setRestaurant((prev) => ({ ...(prev || {}), ...updated }))
      }
      alert("Restaurant details updated successfully")
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update restaurant details")
    } finally {
      setSavingDetails(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!restaurantId) return

    const latitude = Number(locationForm.latitude)
    const longitude = Number(locationForm.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !locationForm.formattedAddress) {
      alert("Please select a location from dropdown")
      return
    }

    try {
      setSavingLocation(true)
      const payload = {
        zoneId: locationForm.zoneId,
        latitude,
        longitude,
        coordinates: [longitude, latitude],
        formattedAddress: locationForm.formattedAddress || "",
        address: locationForm.formattedAddress || "",
        addressLine1: locationForm.addressLine1 || locationForm.formattedAddress || "",
        addressLine2: locationForm.addressLine2 || "",
        area: locationForm.area || "",
        city: locationForm.city || "",
        state: locationForm.state || "",
        landmark: locationForm.landmark || "",
        pincode: locationForm.pincode || "",
        zipCode: locationForm.pincode || "",
        postalCode: locationForm.pincode || "",
        roadName: locationForm.roadName || "",
        placeId: locationForm.placeId || "",
        highwayRef: detailsForm.isHighwayRestaurant === true ? (locationForm.highwayRef || "") : "",
        highwayName: detailsForm.isHighwayRestaurant === true ? (highwayInfo.highwayName || "") : "",
        isHighwayRestaurant: detailsForm.isHighwayRestaurant === true,
        ...(detailsForm.isHighwayRestaurant === true && highwayInfo.status === "IN_SERVICE" && highwayInfo.highwayId ? { highwayId: String(highwayInfo.highwayId) } : {}),
      }

      const res = await adminAPI.updateRestaurantLocation(restaurantId, payload)
      const updatedRestaurant = res?.data?.data?.restaurant || null
      if (updatedRestaurant) {
        setRestaurant((prev) => ({ ...(prev || {}), ...updatedRestaurant }))
      }
      alert("Restaurant location updated successfully")
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update restaurant location")
    } finally {
      setSavingLocation(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/food/restaurants")}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Restaurant</h1>
              <p className="text-sm text-slate-500">
                {restaurant?.name || restaurant?.restaurantName || restaurantId}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white p-4 sm:p-6 rounded-md border border-slate-200 space-y-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-black">Basic restaurant details</h2>
                <Button onClick={handleSaveDetails} disabled={savingDetails}>
                  {savingDetails ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Details"
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-700">Restaurant name*</Label>
                  <Input
                    value={detailsForm.name}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                    placeholder="Enter restaurant name"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Pure veg restaurant?*</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, pureVegRestaurant: true }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === true
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200"
                        }`}
                    >
                      Yes, Pure Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, pureVegRestaurant: false }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === false
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200"
                        }`}
                    >
                      No, Mixed Menu
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    This helps users filter restaurants by dietary preference.
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Restaurant type*</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, isHighwayRestaurant: true }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.isHighwayRestaurant === true
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-white text-gray-700 border-gray-200"
                        }`}
                    >
                      Highway Restaurant
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, isHighwayRestaurant: false }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.isHighwayRestaurant === false
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200"
                        }`}
                    >
                      Normal Restaurant
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Highway restaurants require road verification. Normal restaurants skip road detection.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-black mb-4">Owner details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-700">Full name*</Label>
                    <Input
                      value={detailsForm.ownerName}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, ownerName: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                      placeholder="Owner full name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">Email address*</Label>
                    <Input
                      type="email"
                      value={detailsForm.ownerEmail}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                      placeholder="owner@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">Phone number*</Label>
                    <Input
                      value={detailsForm.ownerPhone}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, ownerPhone: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">Primary contact number*</Label>
                    <Input
                      value={detailsForm.primaryContactNumber}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, primaryContactNumber: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                      placeholder="Restaurant's primary contact number"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-black mb-4">Restaurant details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-700">Primary email</Label>
                    <Input
                      value={detailsForm.email}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">Offer</Label>
                    <Input
                      value={detailsForm.offer}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, offer: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-gray-700">Cuisines (comma separated)</Label>
                    <Input
                      value={detailsForm.cuisinesText}
                      onChange={(e) => setDetailsForm((p) => ({ ...p, cuisinesText: e.target.value }))}
                      className="mt-1 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">Takeaway (Pickup) Enabled</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailsForm((p) => ({ ...p, takeawayEnabled: true }))}
                        className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === true
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-200"
                          }`}
                      >
                        Enabled
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailsForm((p) => ({ ...p, takeawayEnabled: false }))}
                        className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === false
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200"
                          }`}
                      >
                        Disabled
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                  <Label className="text-sm font-bold text-slate-800 mb-3 block">Facilities</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Parking Available</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, parking: true }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.parking === true
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, parking: false }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.parking === false
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>WiFi Available</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, wifi: true }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.wifi === true
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, wifi: false }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.wifi === false
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>Family Friendly</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, familyFriendly: true }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.familyFriendly === true
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, familyFriendly: false }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.familyFriendly === false
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>EV Charging Available</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, evCharging: true }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.evCharging === true
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, evCharging: false }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.evCharging === false
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>Washroom Available</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, washroom: true }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.washroom === true
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsForm((p) => ({
                            ...p,
                            facilities: { ...p.facilities, washroom: false }
                          }))}
                          className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.facilities?.washroom === false
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
              </div>
            </section>

            <section className="bg-white p-4 sm:p-6 rounded-md border border-slate-200 space-y-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-black">Restaurant contact & location</h2>
                </div>
                <Button onClick={handleSaveLocation} disabled={savingLocation}>
                  {savingLocation ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Location"
                  )}
                </Button>
              </div>

              {locationError ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {locationError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-700">Search location</Label>
                  <div className="relative">
                    <Input
                      key={isGoogleMapsValid ? "google-input" : "fallback-input"}
                      ref={isGoogleMapsValid ? locationSearchInputRef : null}
                      value={locationSearchValue}
                      onChange={(e) => setLocationSearchValue(e.target.value)}
                      placeholder="Start typing your restaurant address..."
                      className="mt-1 bg-white text-sm"
                      style={{ color: "#000", WebkitTextFillColor: "#000" }}
                    />
                    {!isGoogleMapsValid && isSearchingLocation && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Select a suggestion from the dropdown to fill address + coordinates.
                  </p>

                  {!isGoogleMapsValid && locationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                      {locationSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => {
                            const { lat, lng, display, addr } = suggestion
                            const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.locality || ""
                            const city = addr.city || addr.town || addr.village || ""
                            const state = addr.state || ""
                            const pincode = addr.postcode || ""
                            const roadName = [addr.house_number, addr.road].filter(Boolean).join(" ").trim() || addr.road || ""

                            isPlaceSelectedRef.current = true
                            setLocationForm((prev) => ({
                              ...prev,
                              formattedAddress: display,
                              addressLine1: display,
                              area: area || prev.area,
                              city: city || prev.city,
                              state: state || prev.state,
                              pincode: pincode || prev.pincode,
                              latitude: lat,
                              longitude: lng,
                              placeId: suggestion.place_id || "",
                              roadName: roadName || prev.roadName || "",
                            }))
                            setLocationSearchValue(display)
                            setLocationSuggestions([])
                            setIsRoadNameDirty(false)
                          }}
                          className="w-full border-b border-gray-100 px-4 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-orange-50 last:border-none"
                        >
                          <span className="truncate">{suggestion.display}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {detailsForm.isHighwayRestaurant === true && (highwayInfo.loading || highwayInfo.status) && (
                    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${highwayInfo.loading ? "bg-slate-50 border-slate-200 text-slate-600" : highwayInfo.status === "IN_SERVICE" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                      {highwayInfo.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          <span>Checking NH/SH proximity...</span>
                        </div>
                      ) : highwayInfo.status === "IN_SERVICE" ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Restaurant location verified. Within 2 km of NH/SH.</span>
                          </div>
                          <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                            <p>Nearest NH/SH: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                            {highwayInfo.highwayName && <p>Road Label: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                            {highwayInfo.highwayId && <p>Highway ID: <span className="font-medium text-slate-900">{String(highwayInfo.highwayId)}</span></p>}
                            <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Not within 2 km from NH or SH.</span>
                          </div>
                          {highwayInfo.highwayRef && (
                            <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                              <p>Nearest NH/SH: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                              {highwayInfo.highwayName && <p>Road Label: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                              {highwayInfo.highwayId && <p>Highway ID: <span className="font-medium text-slate-900">{String(highwayInfo.highwayId)}</span></p>}
                              <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {detailsForm.isHighwayRestaurant !== true && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs">
                      Normal restaurant selected. Highway detection is skipped.
                    </div>
                  )}

                  {Number.isFinite(Number(locationForm.latitude)) && Number.isFinite(Number(locationForm.longitude)) && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Pin preview</p>
                          <p className="text-[11px] text-gray-500">Tap on the map or drag the pin to save the exact restaurant coordinates.</p>
                        </div>
                        <MapPin className="h-4 w-4 text-restaurant-primary" />
                      </div>
                      {isMapsSdkReady ? (
                        <div ref={pinMapContainerRef} className="h-[220px] w-full" />
                      ) : (
                        <iframe src={`https://www.google.com/maps?q=${locationForm.latitude},${locationForm.longitude}&hl=en&z=16&output=embed`} width="100%" height="220" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Restaurant road preview map fallback" className="w-full" />
                      )}
                      <div className="border-t border-gray-200 bg-white px-4 py-2 text-[11px] text-gray-600">Coordinates saved: <span className="font-semibold text-gray-900">{Number(locationForm.latitude).toFixed(6)}, {Number(locationForm.longitude).toFixed(6)}</span></div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-gray-700">Primary contact number*</Label>
                  <Input
                    value={detailsForm.primaryContactNumber}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, primaryContactNumber: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                    placeholder="Restaurant's primary contact number"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Area / Sector / Locality*</Label>
                  <Input
                    value={locationForm.area}
                    onChange={(e) => setLocationForm((p) => ({ ...p, area: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">City*</Label>
                  <Input
                    value={locationForm.city}
                    onChange={(e) => setLocationForm((p) => ({ ...p, city: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Shop no. / building no.</Label>
                  <Input
                    value={locationForm.addressLine1}
                    onChange={(e) => setLocationForm((p) => ({ ...p, addressLine1: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                    placeholder="Shop no. / building no. (optional)"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Floor / tower</Label>
                  <Input
                    value={locationForm.addressLine2}
                    onChange={(e) => setLocationForm((p) => ({ ...p, addressLine2: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                    placeholder="Floor / tower (optional)"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">State</Label>
                  <Input
                    value={locationForm.state}
                    onChange={(e) => setLocationForm((p) => ({ ...p, state: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Pin code</Label>
                  <Input
                    value={locationForm.pincode}
                    onChange={(e) => setLocationForm((p) => ({ ...p, pincode: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-700">Nearby landmark</Label>
                  <Input
                    value={locationForm.landmark}
                    onChange={(e) => setLocationForm((p) => ({ ...p, landmark: e.target.value }))}
                    className="mt-1 bg-white text-sm"
                    placeholder="Nearby landmark (optional)"
                  />
                </div>
                {detailsForm.isHighwayRestaurant === true && (
                <>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-700">Road label*</Label>
                  <Input
                    value={locationForm.roadName || ""}
                    onChange={(e) => {
                      setIsRoadNameDirty(true)
                      setLocationForm((p) => ({ ...p, roadName: e.target.value }))
                    }}
                    className="mt-1 bg-white text-sm"
                    placeholder="Auto-detected road name"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">This keeps the actual road or street name near the restaurant.</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-700">NH / SH reference</Label>
                  <Input
                    value={locationForm.highwayRef || ""}
                    onChange={(e) => {
                      setIsHighwayRefDirty(true)
                      setLocationForm((p) => ({ ...p, highwayRef: e.target.value.toUpperCase() }))
                    }}
                    className="mt-1 bg-white text-sm"
                    placeholder="Auto-filled if road is NH/SH"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Examples: `NH-52`, `SH-27`. Leave empty for normal roads.</p>
                </div>
                </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

