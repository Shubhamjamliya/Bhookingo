import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { adminAPI, highwayAPI } from "@food/api"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { Label } from "@food/components/ui/label"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
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
    latitude: hasValidCoords ? lat : "",
    longitude: hasValidCoords ? lng : "",
  }
}

const normalizeDetailsFormFromRestaurant = (restaurant) => {
  return {
    name: restaurant?.name || restaurant?.restaurantName || "",
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
  const [isMapsSdkReady, setIsMapsSdkReady] = useState(() => Boolean(window.google?.maps))

  const locationSearchInputRef = useRef(null)
  const placesAutocompleteRef = useRef(null)
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
    if (!locationSearchInputRef.current) return
    if (placesAutocompleteRef.current) return

    let cancelled = false
    const init = async () => {
      setLocationError("")
      const loaded = await loadGooglePlaces()
      if (cancelled) return
      if (!loaded || !window.google?.maps?.places?.Autocomplete) {
        setLocationError("Unable to load Google Places Autocomplete.")
        return
      }

      placesAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationSearchInputRef.current,
        {
          fields: ["formatted_address", "address_components", "geometry"],
          // Omit `types: ["geocode"]` — that biases Autocomplete toward Geocoding API (geocode/json) traffic.
          componentRestrictions: { country: "in" },
        },
      )

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

      placesAutocompleteRef.current.addListener("place_changed", () => {
        const place = placesAutocompleteRef.current.getPlace()
        const parsed = parsePlace(place)
        setLocationForm((prev) => ({
          ...prev,
          formattedAddress: parsed.formattedAddress || prev.formattedAddress,
          addressLine1: parsed.formattedAddress || prev.addressLine1,
          area: parsed.area || prev.area,
          city: parsed.city || prev.city,
          state: parsed.state || prev.state,
          pincode: parsed.pincode || prev.pincode,
          roadName: parsed.roadName || prev.roadName || "",
          placeId: parsed.placeId || prev.placeId || "",
          latitude: parsed.latitude !== "" ? parsed.latitude : prev.latitude,
          longitude: parsed.longitude !== "" ? parsed.longitude : prev.longitude,
        }))
      })
    }

    requestAnimationFrame(init)
    return () => {
      cancelled = true
      placesAutocompleteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (window.google?.maps && !isMapsSdkReady) {
      setIsMapsSdkReady(true)
    }
  }, [isMapsSdkReady])

  useEffect(() => {
    const lat = Number(locationForm.latitude)
    const lng = Number(locationForm.longitude)
    const address = locationForm.formattedAddress || locationForm.addressLine1 || ""
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address.trim()) {
      setHighwayInfo({ loading: false, status: null, highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
      return
    }

    let cancelled = false
    const run = async () => {
      setHighwayInfo((prev) => ({ ...prev, loading: true }))
      try {
        const res = await highwayAPI.detectHighway(lat, lng)
        const data = res?.data?.data
        if (cancelled) return
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
        if (!cancelled) {
          setHighwayInfo({ loading: false, status: "OUT_OF_SERVICE", highwayId: null, highwayName: null, highwayRef: null, distanceMeters: null, thresholdMeters: null })
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [locationForm.latitude, locationForm.longitude, locationForm.formattedAddress, locationForm.addressLine1])

  const autoDetectedRoadLabel = (() => {
    if (highwayInfo.highwayRef) return `${highwayInfo.highwayRef}${highwayInfo.highwayName ? ` - ${highwayInfo.highwayName}` : ""}`
    if (highwayInfo.highwayName) return String(highwayInfo.highwayName)
    return ""
  })()

  useEffect(() => {
    if (!autoDetectedRoadLabel) return
    setLocationForm((prev) => {
      const currentRoadName = String(prev.roadName || "")
      if (isRoadNameDirty && currentRoadName && currentRoadName !== lastAutoRoadNameRef.current) return prev
      if (currentRoadName === autoDetectedRoadLabel) {
        lastAutoRoadNameRef.current = autoDetectedRoadLabel
        return prev
      }
      lastAutoRoadNameRef.current = autoDetectedRoadLabel
      return { ...prev, roadName: autoDetectedRoadLabel }
    })
  }, [autoDetectedRoadLabel, isRoadNameDirty])

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

    if (!locationForm.zoneId) {
      alert("Please select a zone")
      return
    }
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
        ...(highwayInfo.status === "IN_SERVICE" && highwayInfo.highwayId ? { highwayId: String(highwayInfo.highwayId) } : {}),
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
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Basic Details</h2>
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
                  <Label>Restaurant Name</Label>
                  <Input value={detailsForm.name} onChange={(e) => setDetailsForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Pure Veg</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, pureVegRestaurant: true }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === true
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-slate-700 border-slate-300"
                        }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, pureVegRestaurant: false }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === false
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300"
                        }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
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
                              : "bg-white text-slate-700 border-slate-300"
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
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-300"
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
                              : "bg-white text-slate-700 border-slate-300"
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
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-300"
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
                              : "bg-white text-slate-700 border-slate-300"
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
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-300"
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
                              : "bg-white text-slate-700 border-slate-300"
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
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-300"
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
                              : "bg-white text-slate-700 border-slate-300"
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
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-300"
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Primary Email</Label>
                  <Input value={detailsForm.email} onChange={(e) => setDetailsForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Owner Name</Label>
                  <Input value={detailsForm.ownerName} onChange={(e) => setDetailsForm((p) => ({ ...p, ownerName: e.target.value }))} />
                </div>
                <div>
                  <Label>Owner Email</Label>
                  <Input value={detailsForm.ownerEmail} onChange={(e) => setDetailsForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
                </div>
                <div>
                  <Label>Owner Phone</Label>
                  <Input value={detailsForm.ownerPhone} onChange={(e) => setDetailsForm((p) => ({ ...p, ownerPhone: e.target.value }))} />
                </div>
                <div>
                  <Label>Primary Contact Number</Label>
                  <Input value={detailsForm.primaryContactNumber} onChange={(e) => setDetailsForm((p) => ({ ...p, primaryContactNumber: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Cuisines (comma separated)</Label>
                  <Input value={detailsForm.cuisinesText} onChange={(e) => setDetailsForm((p) => ({ ...p, cuisinesText: e.target.value }))} />
                </div>
                <div>
                  <Input
                    type="number"
                  />
                </div>
                <div>
                  <Label>Offer</Label>
                  <Input value={detailsForm.offer} onChange={(e) => setDetailsForm((p) => ({ ...p, offer: e.target.value }))} />
                </div>
                <div>
                  <Label>Takeaway (Pickup) Enabled</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, takeawayEnabled: true }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === true
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-slate-700 border-slate-300"
                        }`}
                    >
                      Enabled
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsForm((p) => ({ ...p, takeawayEnabled: false }))}
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === false
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300"
                        }`}
                    >
                      Disabled
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Location</h2>
                  {currentZoneLabel ? (
                    <p className="text-xs text-slate-500 mt-1">Current Zone: {currentZoneLabel}</p>
                  ) : null}
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
                  <Label>Service Zone</Label>
                  <select
                    value={locationForm.zoneId || ""}
                    onChange={(e) => setLocationForm((p) => ({ ...p, zoneId: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                    disabled={zonesLoading}
                  >
                    <option value="">{zonesLoading ? "Loading zones..." : "Select a zone"}</option>
                    {zones.map((z) => {
                      const zid = normalizeZoneId(z?._id || z?.id)
                      const label = z?.name || z?.zoneName || zid
                      return (
                        <option key={zid} value={zid}>
                          {label}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Label>Search location</Label>
                  <Input
                    ref={locationSearchInputRef}
                    placeholder="Start typing your restaurant address..."
                    className="mt-1 bg-white text-sm text-black! dark:text-white! placeholder:text-gray-500 dark:placeholder:text-gray-400 caret-black dark:caret-white"
                    style={{ color: "#000", WebkitTextFillColor: "#000" }}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select a suggestion from the dropdown to fill address + coordinates.
                  </p>

                  {(highwayInfo.loading || highwayInfo.status) && (
                    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${highwayInfo.loading ? "bg-slate-50 border-slate-200 text-slate-600" : highwayInfo.status === "IN_SERVICE" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                      {highwayInfo.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          <span>Checking highway proximity...</span>
                        </div>
                      ) : highwayInfo.status === "IN_SERVICE" ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Restaurant location verified. Located within highway range.</span>
                          </div>
                          <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                            <p>Nearest Highway: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                            {highwayInfo.highwayName && <p>Highway Name: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                            {highwayInfo.highwayId && <p>Highway ID: <span className="font-medium text-slate-900">{String(highwayInfo.highwayId)}</span></p>}
                            <p>Distance: <span className="font-medium text-slate-900">{(highwayInfo.distanceMeters / 1000).toFixed(1)} KM</span></p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Restaurant must be within 2 KM of a highway.</span>
                          </div>
                          {highwayInfo.highwayRef && (
                            <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                              <p>Nearest Highway: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                              {highwayInfo.highwayName && <p>Highway Name: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                              {highwayInfo.highwayId && <p>Highway ID: <span className="font-medium text-slate-900">{String(highwayInfo.highwayId)}</span></p>}
                              <p>Distance: <span className="font-medium text-slate-900">{(highwayInfo.distanceMeters / 1000).toFixed(1)} KM</span></p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {Number.isFinite(Number(locationForm.latitude)) && Number.isFinite(Number(locationForm.longitude)) && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Pin preview</p>
                          <p className="text-[11px] text-gray-500">Tap on the map or drag the pin to save the exact restaurant coordinates.</p>
                        </div>
                        <MapPin className="h-4 w-4 text-[#B80B3D]" />
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

                <div className="md:col-span-2">
                  <Label>Formatted Address</Label>
                  <Input value={locationForm.formattedAddress} readOnly className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>Area</Label>
                  <Input value={locationForm.area} readOnly className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={locationForm.city} readOnly className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={locationForm.state} readOnly className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={locationForm.pincode} readOnly className="mt-1 bg-slate-50" />
                </div>
                <div className="md:col-span-2">
                  <Label>Road / Highway name</Label>
                  <Input
                    value={locationForm.roadName || ""}
                    onChange={(e) => {
                      setIsRoadNameDirty(true)
                      setLocationForm((p) => ({ ...p, roadName: e.target.value }))
                    }}
                    className="mt-1"
                    placeholder="Auto-detected road / highway"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">This is auto-filled from the detected NH / SH and you can still edit it if needed.</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Landmark</Label>
                  <Input
                    value={locationForm.landmark}
                    onChange={(e) => setLocationForm((p) => ({ ...p, landmark: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

