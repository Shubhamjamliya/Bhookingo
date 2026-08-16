import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { adminAPI, highwayAPI } from "@food/api"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { Label } from "@food/components/ui/label"
import RestaurantAddressHighwaySection from "@food/components/address/RestaurantAddressHighwaySection"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { getFacilityAvailability } from "@food/utils/facilityHelpers"
import { ArrowLeft, Loader2 } from "lucide-react"

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
  const location =
    restaurant?.location ||
    restaurant?.onboarding?.step1?.location ||
    {}

  const rawRestaurantType = String(restaurant?.restaurantType || "").toLowerCase()
  const hasHighwaySignals = Boolean(
    restaurant?.isHighwayRestaurant === true ||
    restaurant?.highwayRef ||
    restaurant?.highwayName ||
    location?.highwayRef ||
    location?.highwayName
  )

  return {
    name: restaurant?.name || restaurant?.restaurantName || "",
    restaurantType:
      rawRestaurantType === "normal"
        ? "normal"
        : (rawRestaurantType === "highway" || hasHighwaySignals ? "highway" : "normal"),
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
      parking: getFacilityAvailability(restaurant.facilities, "parking"),
      wifi: getFacilityAvailability(restaurant.facilities, "wifi"),
      familyFriendly: getFacilityAvailability(restaurant.facilities, "familyFriendly"),
      evCharging: getFacilityAvailability(restaurant.facilities, "evCharging"),
      washroom: getFacilityAvailability(restaurant.facilities, "washroom")
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
      setHighwayInfo({ loading: false, status: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
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
          highwayName: data.highwayName || null,
          highwayRef: data.highwayRef || null,
          distanceMeters: data.distanceMeters ?? null,
          thresholdMeters: data.thresholdMeters ?? null,
        })
      } else {
        setHighwayInfo({ loading: false, status: "OUT_OF_SERVICE", highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      }
    } catch {
      setHighwayInfo((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    if (detailsForm.restaurantType === "normal") {
      setHighwayInfo({ loading: false, status: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    const lat = locationForm.latitude
    const lng = locationForm.longitude
    if (!lat || !lng) {
      setHighwayInfo({ loading: false, status: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    detectHighwayForLocation(lat, lng)
  }, [detailsForm.restaurantType, locationForm.latitude, locationForm.longitude, detectHighwayForLocation])

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
        restaurantType: detailsForm.restaurantType === "normal" ? "normal" : "highway",
        isHighwayRestaurant: detailsForm.restaurantType !== "normal",
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
        isHighwayRestaurant: detailsForm.restaurantType !== "normal",
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
        highwayRef: detailsForm.restaurantType !== "normal" ? (locationForm.highwayRef || "") : "",
        highwayName: detailsForm.restaurantType !== "normal" ? (highwayInfo.highwayName || "") : "",
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
                      onClick={() => setDetailsForm((p) => ({ ...p, restaurantType: "highway" }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.restaurantType !== "normal"
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-white text-gray-700 border-gray-200"
                        }`}
                    >
                      Highway Restaurant
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, restaurantType: "normal" }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.restaurantType === "normal"
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
                  <h2 className="text-lg font-semibold text-black">Restaurant Location Address</h2>
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
              <RestaurantAddressHighwaySection
                sectionDescription="Use the same address selection flow as onboarding so route discovery can place the restaurant correctly on travel roads."
                isGoogleMapsValid={isGoogleMapsValid}
                isSearchingLocation={isSearchingLocation}
                locationSearchValue={locationSearchValue}
                onLocationSearchChange={(value) => setLocationSearchValue(value)}
                locationSearchInputRef={locationSearchInputRef}
                locationSuggestions={locationSuggestions}
                locationSuggestionsVisible={!isGoogleMapsValid && locationSuggestions.length > 0}
                searchPlaceholder="Start typing your restaurant address..."
                searchHelpText="Select a suggestion from the dropdown to fill address + coordinates."
                isHighwayRestaurant={detailsForm.restaurantType !== "normal"}
                highwayInfo={highwayInfo}
                pinMapContainerRef={pinMapContainerRef}
                isMapsSdkReady={isMapsSdkReady}
                location={locationForm}
                renderCityField={
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-gray-700">City*</Label>
                      {locationForm.city?.trim() ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Auto-detected
                        </span>
                      ) : null}
                    </div>
                    <Input
                      value={locationForm.city}
                      onChange={(e) => setLocationForm((p) => ({ ...p, city: e.target.value }))}
                      className="bg-white text-sm"
                      placeholder="City*"
                    />
                    <p className="text-[11px] text-gray-500">
                      This is auto-filled from the selected location. You can change it if needed.
                    </p>
                  </div>
                }
                extraHighwayField={
                  detailsForm.restaurantType !== "normal" ? (
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
                  ) : null
                }
                onLocationFieldChange={(field, value) => setLocationForm((p) => ({ ...p, [field]: value }))}
                onRoadNameChange={(value) => {
                  setIsRoadNameDirty(true)
                  setLocationForm((p) => ({ ...p, roadName: value }))
                }}
                normalizePincode={(value) => value}
                cardClassName="space-y-4"
              />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

