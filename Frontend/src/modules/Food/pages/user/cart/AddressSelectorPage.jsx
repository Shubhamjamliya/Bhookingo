import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Plus, MapPin, MoreHorizontal, Navigation, Home, Building2, Briefcase, Phone, X, Crosshair, Search, Link2, Clipboard, UserCheck } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { Textarea } from "@food/components/ui/textarea"
import { useLocation as useGeoLocation } from "@food/hooks/useLocation"
import { useProfile } from "@food/context/ProfileContext"
import { toast } from "sonner"
import api, { locationAPI, userAPI } from "@food/api"
import { Loader } from '@googlemaps/js-api-loader'
import AnimatedPage from "@food/components/user/AnimatedPage"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import ReceiverDetailsModal from "../address/components/ReceiverDetailsModal"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

// Enable Maps if API Key is available, otherwise fallback to coordinates-only mode
const MAPS_ENABLED = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const deltaLat = (lat2 - lat1) * Math.PI / 180
  const deltaLon = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Get icon based on address type/label
const getAddressIcon = (address) => {
  const label = (address.label || address.additionalDetails || "").toLowerCase()
  if (label.includes("home")) return Home
  if (label.includes("work") || label.includes("office")) return Briefcase
  if (label.includes("building") || label.includes("apt")) return Building2
  return Home
}

function GoogleMapsIcon({ className = "w-5 h-5" }) {
  return (
    <img src="/assets/images/gmap.png" alt="Google Maps" className={`${className} object-contain`} />
  )
}

export default function AddressSelectorPage() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const { location, loading, requestLocation } = useGeoLocation()
  const { addresses = [], addAddress, updateAddress, setDefaultAddress, userProfile, isAuthenticated, loading: profileLoading, setReceiverDetails, clearReceiverDetails } = useProfile()
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showMapsLinkModal, setShowMapsLinkModal] = useState(false)
  const [mapsLinkInput, setMapsLinkInput] = useState("")
  const [isResolvingLink, setIsResolvingLink] = useState(false)
  const [resolvedLinkData, setResolvedLinkData] = useState(null)
  const [showReceiverPromptModal, setShowReceiverPromptModal] = useState(false)
  const [showReceiverDetailsModal, setShowReceiverDetailsModal] = useState(false)

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        if (text) {
          setMapsLinkInput(text)
          toast.success("Pasted from clipboard")
        }
      }
    } catch {
      toast.error("Clipboard permission denied")
    }
  }

  const handleResolveMapsLink = async () => {
    if (!mapsLinkInput || !mapsLinkInput.trim()) {
      toast.error("Please paste a Google Maps location link.")
      return
    }
    try {
      setIsResolvingLink(true)
      const urlMatch = mapsLinkInput.match(/(https?:\/\/[^\s]+)/i)
      const cleanLink = urlMatch ? urlMatch[1] : mapsLinkInput.trim()

      console.log("[AddressSelector] [STEP 5 & 7] Resolving Google Maps link payload:", { originalInput: mapsLinkInput.trim(), link: cleanLink })
      const res = await api.post("/food/location/resolve-maps-link", { link: cleanLink })
      console.log("[AddressSelector] [STEP 6] Resolved link response from backend:", res.data)
      if (res.data?.success && res.data?.data) {
        setResolvedLinkData(res.data.data)
        setShowMapsLinkModal(false)
        setShowReceiverPromptModal(true)
      } else {
        toast.error(res.data?.message || "Couldn't read this link. Try manual entry.")
      }
    } catch (err) {
      console.error("[AddressSelector] Resolve maps link error:", err)
      toast.error(err.response?.data?.message || "We couldn't read this link. Please check it and try again, or enter address manually.")
    } finally {
      setIsResolvingLink(false)
    }
  }

  const handleReceiverPromptResponse = (isForSomeoneElse) => {
    setShowReceiverPromptModal(false)
    if (isForSomeoneElse) {
      setShowReceiverDetailsModal(true)
    } else {
      // Use as user's own location
      clearReceiverDetails()
      if (resolvedLinkData) {
        const lat = Number(resolvedLinkData.latitude ?? resolvedLinkData.lat)
        const lng = Number(resolvedLinkData.longitude ?? resolvedLinkData.lng)
        const addressText = resolvedLinkData.formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        
        const finalLoc = {
          latitude: lat,
          longitude: lng,
          city: resolvedLinkData.city || "Selected Location",
          state: resolvedLinkData.state || "",
          country: resolvedLinkData.country || "India",
          area: resolvedLinkData.area || "",
          address: addressText,
          formattedAddress: addressText
        }

        console.log("[AddressSelector] [STEP 4 & 8] Saving manual resolved location to storage & state:", finalLoc)

        try {
          localStorage.setItem("userLocation", JSON.stringify(finalLoc))
          sessionStorage.setItem("user_selected_location", JSON.stringify(finalLoc))
          sessionStorage.setItem("manual_location_update", "true")
          window.dispatchEvent(new CustomEvent("userLocationUpdated"))
        } catch (e) {
          console.error("Failed to save location to storage:", e)
        }

        toast.success("Location set successfully!")
        goBack()
      }
    }
  }

  const handleSaveReceiverDetails = (details) => {
    if (!resolvedLinkData) return
    const lat = Number(resolvedLinkData.latitude ?? resolvedLinkData.lat)
    const lng = Number(resolvedLinkData.longitude ?? resolvedLinkData.lng)
    const addressText = resolvedLinkData.formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    
    const receiverPayload = {
      isForSomeoneElse: true,
      receiverName: details.receiverName,
      receiverPhone: details.receiverPhone,
      consentConfirmed: details.consentConfirmed,
      receiverLat: lat,
      receiverLng: lng,
      receiverAddressText: addressText,
      sourceType: "GOOGLE_MAPS_LINK",
      rawGoogleMapsLink: mapsLinkInput
    }

    setReceiverDetails(receiverPayload)

    // Save as address for future reuse
    addAddress({
      label: "Other",
      street: addressText,
      city: resolvedLinkData.city || "Destination City",
      state: resolvedLinkData.state || "State",
      latitude: lat,
      longitude: lng,
      isForReceiver: true,
      receiverName: details.receiverName,
      receiverPhone: details.receiverPhone,
      sourceType: "GOOGLE_MAPS_LINK",
      rawGoogleMapsLink: mapsLinkInput,
      resolvedLat: lat,
      resolvedLng: lng,
      resolvedFormattedAddress: addressText
    })

    const finalLoc = {
      latitude: lat,
      longitude: lng,
      city: resolvedLinkData.city || "Destination City",
      state: resolvedLinkData.state || "",
      country: resolvedLinkData.country || "India",
      area: resolvedLinkData.area || "",
      address: addressText,
      formattedAddress: addressText
    }

    try {
      sessionStorage.setItem("user_selected_location", JSON.stringify(finalLoc))
      window.dispatchEvent(new CustomEvent("userLocationUpdated"))
    } catch (e) {
      console.error("Failed to save receiver location to storage:", e)
    }

    toast.success(`Ordering for ${details.receiverName}!`)
    goBack()
  }
  const [mapPosition, setMapPosition] = useState([22.7196, 75.8577]) // Default Indore coordinates [lat, lng]
  const [addressFormData, setAddressFormData] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    additionalDetails: "",
    label: "Home",
    phone: "",
  })
  const [isFetchingLocationState, setIsFetchingLocationState] = useState(false)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const mapContainerRef = useRef(null)
  const googleMapRef = useRef(null) // Google Maps instance
  const greenMarkerRef = useRef(null) // Green marker for address selection
  const userLocationMarkerRef = useRef(null) // Blue dot marker for user location
  const blueDotCircleRef = useRef(null) // Accuracy circle for Google Maps
  const [currentAddress, setCurrentAddress] = useState("")
  const [addressAutocompleteValue, setAddressAutocompleteValue] = useState("")
  const [keywordAddressSuggestions, setKeywordAddressSuggestions] = useState([])
  const [isKeywordSearching, setIsKeywordSearching] = useState(false)
  const [lockMapToAutocomplete, setLockMapToAutocomplete] = useState(true)
  const [GOOGLE_MAPS_API_KEY, setGOOGLE_MAPS_API_KEY] = useState(null)
  const [formScrollTop, setFormScrollTop] = useState(0)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const [baseMapHeight, setBaseMapHeight] = useState(320)
  const formBodyRef = useRef(null)
  const manualFieldRefs = useRef({})
  
  const ENABLE_LOCATION_REVERSE_GEOCODE = import.meta.env.VITE_ENABLE_LOCATION_REVERSE_GEOCODE !== "false"
  const ENABLE_NOMINATIM_SEARCH = import.meta.env.VITE_ENABLE_NOMINATIM_SEARCH !== "false"
  const getAddressId = (address) => address?.id || address?._id || null

  const handleBack = () => {
    goBack()
  }

  const addressAutocompleteSuggestions = useMemo(() => {
    const q = String(addressAutocompleteValue || "").trim().toLowerCase()
    if (!q) return []
    const list = Array.isArray(addresses) ? addresses : []
    return list
      .map((addr) => {
        const text = [
          addr?.label,
          addr?.additionalDetails,
          addr?.street,
          addr?.city,
          addr?.state,
          addr?.zipCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return { addr, text }
      })
      .filter((x) => x.text.includes(q))
      .slice(0, 6)
      .map((x) => x.addr)
  }, [addresses, addressAutocompleteValue])

  // Load Google Maps API key
  useEffect(() => {
    if (!MAPS_ENABLED) return
    import('@food/utils/googleMapsApiKey.js').then(({ getGoogleMapsApiKey }) => {
      getGoogleMapsApiKey().then(key => {
        setGOOGLE_MAPS_API_KEY(key)
      })
    })
  }, [])

  // Nominatim search
  useEffect(() => {
    const q = String(addressAutocompleteValue || "").trim()
    if (!ENABLE_NOMINATIM_SEARCH || q.length < 3) {
      setKeywordAddressSuggestions([])
      setIsKeywordSearching(false)
      return
    }

    const t = setTimeout(async () => {
      try {
        setIsKeywordSearching(true)
        const refLat = location?.latitude ?? 22.7196
        const refLng = location?.longitude ?? 75.8577
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        const json = await res.json()
        const mapped = (Array.isArray(json) ? json : []).map(r => ({
          id: r.place_id || r.osm_id,
          display: r.display_name || "",
          lat: Number(r.lat),
          lng: Number(r.lon),
          address: r.address || {},
        }))
        const withDistance = mapped
          .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng))
          .map(x => ({ ...x, distanceMeters: calculateDistance(refLat, refLng, x.lat, x.lng) }))
          .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
          .slice(0, 4)
        setKeywordAddressSuggestions(withDistance)
      } catch (e) {
        setKeywordAddressSuggestions([])
      } finally {
        setIsKeywordSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [addressAutocompleteValue, location, ENABLE_NOMINATIM_SEARCH])

  // Map Initialization logic
  useEffect(() => {
    if (!MAPS_ENABLED || !showAddressForm || !GOOGLE_MAPS_API_KEY) return

    let isMounted = true
    setMapLoading(true)

    const initializeGoogleMap = async () => {
      try {
        // Retry a few times if the container ref isn't immediately populated in the DOM
        let retries = 0
        while (!mapContainerRef.current && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 50))
          retries++
        }

        if (!isMounted || !mapContainerRef.current) {
          setMapLoading(false)
          return
        }

        const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: "weekly" })
        const google = await loader.load()
        if (!isMounted || !mapContainerRef.current) return

        const initialPos = { lat: mapPosition[0], lng: mapPosition[1] }
        
        const map = new google.maps.Map(mapContainerRef.current, {
          center: initialPos,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] }
          ]
        })
        googleMapRef.current = map

        // Update coordinates on map idle (center of the map is the chosen location)
        map.addListener("idle", () => {
          const center = map.getCenter()
          const lat = center.lat()
          const lng = center.lng()
          setMapPosition([lat, lng])
          handleMapMoveEnd(lat, lng)
        })

        setMapLoading(false)
      } catch (err) {
        debugError("Map init error:", err)
        setMapLoading(false)
      }
    }
    initializeGoogleMap()
    return () => { isMounted = false }
  }, [showAddressForm, GOOGLE_MAPS_API_KEY])

  const handleUseCurrentLocation = async () => {
    try {
      setIsFetchingLocationState(true)
      clearReceiverDetails()
      
      // Fetch fresh location via requestLocation
      const loc = await requestLocation()
      
      if (loc) {
        localStorage.setItem("userLocation", JSON.stringify(loc))
        sessionStorage.setItem("manual_location_update", "true")
        window.dispatchEvent(new CustomEvent("userLocationUpdated"))
        // Go back instantly after successful location lock!
        handleBack()
      } else {
        setIsFetchingLocationState(false)
      }
    } catch (e) {
      setIsFetchingLocationState(false)
      toast.error("Failed to get current location", { id: "geo" })
    }
  }

  const handleSelectSavedAddress = async (address) => {
    const id = getAddressId(address)
    if (id) {
      sessionStorage.setItem("manual_location_update", "true")
      
      // Perform optimistic default address set instantly
      setDefaultAddress(id)
      
      try { 
        window.dispatchEvent(new CustomEvent("userLocationUpdated"))
        // Go back immediately!
        handleBack()
      } catch (e) {
        console.error("Failed to select saved address:", e)
      }
    }
  }

  const handleSelectOuterSuggestion = (s) => {
    setIsFetchingLocationState(true)
    try {
      const lat = s.lat
      const lng = s.lng
      const display = s.display
      const a = s.address || {}
      
      const displayParts = display ? display.split(",").map(p => p.trim()).filter(Boolean) : []
      
      // Robust city extraction
      let city = a.city || a.town || a.village || a.hamlet || a.county || a.state_district || a.district || a.municipality || ""
      if (!city && displayParts.length > 0) {
        city = displayParts[0]
      }
      if (!city) {
        city = "Indore"
      }

      // Robust area extraction
      let area = a.suburb || a.neighbourhood || a.sublocality || a.quarter || ""
      if (!area && displayParts.length > 1 && city !== displayParts[0]) {
        area = displayParts[0]
      }

      // Robust state extraction
      let state = a.state || ""
      if (!state && displayParts.length > 1) {
        const potentialStates = displayParts.slice(0, -1).filter(p => !/^\d+$/.test(p))
        if (potentialStates.length > 0) {
          state = potentialStates[potentialStates.length - 1]
        }
      }
      if (!state) {
        state = "Madhya Pradesh"
      }

      if (lat && lng) {
        const finalLoc = {
          latitude: lat,
          longitude: lng,
          city: city,
          state: state,
          country: "India",
          area: area,
          address: display || "Selected Location",
          formattedAddress: display || "Selected Location"
        }

        // Save to local storage
        localStorage.setItem("userLocation", JSON.stringify(finalLoc))
        sessionStorage.setItem("manual_location_update", "true")
        
        // Dispatch update event
        window.dispatchEvent(new CustomEvent("userLocationUpdated"))
        
        handleBack()
      } else {
        toast.error("Could not resolve location coordinates")
      }
    } catch (err) {
      console.error("Error selecting search suggestion:", err)
      toast.error("Failed to select location")
    } finally {
      setIsFetchingLocationState(false)
    }
  }

  const handleAddAddressClick = () => {
    if (!isAuthenticated) {
      toast.info("Please login to add an address")
      navigate("/user/auth/login")
      return
    }
    setAddressAutocompleteValue("")
    setKeywordAddressSuggestions([])
    setShowAddressForm(true)
  }

  const handleCancelAddressForm = () => {
    setAddressAutocompleteValue("")
    setKeywordAddressSuggestions([])
    setShowAddressForm(false)
  }

  const scrollFieldIntoView = useCallback((fieldName) => {
    const el = manualFieldRefs.current?.[fieldName]
    if (!el) return
    setTimeout(() => {
      try {
        const scrollHost = formBodyRef.current
        if (!scrollHost) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          return
        }
        const hostRect = scrollHost.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const viewportHeight =
          typeof window !== "undefined" && window.visualViewport
            ? window.visualViewport.height
            : window.innerHeight
        const safeBottom = viewportHeight - keyboardInset - 90
        const overBy = elRect.bottom - safeBottom
        if (overBy > 0) {
          scrollHost.scrollTo({
            top: scrollHost.scrollTop + overBy + 24,
            behavior: "smooth",
          })
          return
        }
        if (elRect.top < hostRect.top + 70) {
          const upBy = hostRect.top + 70 - elRect.top
          scrollHost.scrollTo({
            top: Math.max(0, scrollHost.scrollTop - upBy - 12),
            behavior: "smooth",
          })
          return
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      } catch {
        // Ignore scrolling errors.
      }
    }, 120)
  }, [keyboardInset])

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  const handleMapMoveEnd = async (lat, lng) => {
    if (!ENABLE_LOCATION_REVERSE_GEOCODE) return
    try {
      // Use Nominatim for free reverse geocoding on the client side
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      const response = await fetch(url, { 
        headers: { 
          "Accept-Language": "en",
          "User-Agent": "Bhookingo-Food-App" 
        } 
      })
      const json = await response.json()
      
      if (json && json.address) {
        const addr = json.address
        const formatted = json.display_name
        
        // Extract meaningful street/area info
        const street = [
          addr.road,
          addr.suburb,
          addr.neighbourhood,
          addr.house_number
        ].filter(Boolean).slice(0, 2).join(", ") || addr.amenity || addr.industrial || ""

        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ""
        const state = addr.state || ""
        const postcode = addr.postcode || ""

        setCurrentAddress(formatted)
        setAddressFormData(prev => ({
          ...prev,
          street: street || formatted.split(",")[0] || prev.street,
          city: city || prev.city,
          state: state || prev.state,
          zipCode: postcode || prev.zipCode,
        }))
      }
    } catch (e) {
      debugError("Reverse geocode error:", e)
    }
  }

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
       toast.info("Please login to save an address")
       navigate("/user/auth/login")
       return
    }
    if (!addressFormData.street || !addressFormData.city) {
      toast.error("Please fill required fields")
      return
    }
    setLoadingAddress(true)
    try {
      const payload = {
        ...addressFormData,
        label: addressFormData.label === "Work" ? "Office" : addressFormData.label,
        location: { type: "Point", coordinates: [mapPosition[1], mapPosition[0]] },
        latitude: mapPosition[0],
        longitude: mapPosition[1]
      }
      const created = await addAddress(payload)
      if (created) {
        const id = getAddressId(created)
        if (id) await setDefaultAddress(id)
        try { 
          sessionStorage.setItem("manual_location_update", "true");
          window.dispatchEvent(new CustomEvent("userLocationUpdated"))
        } catch {}
        // toast.success("Address saved")
        handleBack()
      }
    } catch (error) {
      toast.error("Failed to save address")
    } finally {
      setLoadingAddress(false)
    }
  }

  useEffect(() => {
    if (!showAddressForm) return
    const updateBaseMapHeight = () => {
      const vh = typeof window !== "undefined" ? window.innerHeight : 800
      const target = Math.round(vh * 0.45)
      setBaseMapHeight(Math.max(260, Math.min(420, target)))
    }
    updateBaseMapHeight()
    window.addEventListener("resize", updateBaseMapHeight)
    return () => window.removeEventListener("resize", updateBaseMapHeight)
  }, [showAddressForm])

  useEffect(() => {
    if (!showAddressForm) return
    setFormScrollTop(0)
  }, [showAddressForm])

  useEffect(() => {
    if (!showAddressForm || typeof window === "undefined" || !window.visualViewport) return
    const viewport = window.visualViewport
    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardInset(inset > 0 ? inset : 0)
    }
    updateKeyboardInset()
    viewport.addEventListener("resize", updateKeyboardInset)
    viewport.addEventListener("scroll", updateKeyboardInset)
    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset)
      viewport.removeEventListener("scroll", updateKeyboardInset)
    }
  }, [showAddressForm])

  if (showAddressForm) {
    const mapHeight = baseMapHeight 
    return (
      <AnimatedPage
        className="fixed inset-0 z-50 bg-surface dark:bg-[#0a0a0a] flex flex-col h-screen overflow-hidden"
      >
        <div className="flex-shrink-0 bg-surface dark:bg-[#1a1a1a] border-b border-border dark:border-gray-800 px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancelAddressForm} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        <div
          ref={formBodyRef}
          onScroll={(e) => {
            setFormScrollTop(e.currentTarget.scrollTop)
          }}
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: `${96 + keyboardInset}px` }}
        >
          {/* Map Section - Parallax enabled */}
          <div
            className="flex-shrink-0 relative z-0"
            style={{ 
              height: `${mapHeight}px`,
              transform: `translateY(${formScrollTop * 0.4}px)`,
              opacity: clamp(1 - (formScrollTop / 500), 0.4, 1)
            }}
          >
            <div className="absolute top-4 left-4 right-4 z-20">
              <div className="relative group shadow-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <Input
                  value={addressAutocompleteValue}
                  onChange={(e) => setAddressAutocompleteValue(e.target.value)}
                  placeholder="Search area, street, landmark..."
                  className="pl-12 pr-10 h-14 bg-surface dark:bg-[#1a1a1a] border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-zinc-500 dark:focus:border-zinc-500 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 font-medium text-sm transition-all shadow-sm w-full"
                />
                {addressAutocompleteValue && (
                  <button 
                    onClick={() => setAddressAutocompleteValue("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {isKeywordSearching && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--primary)] border-t-transparent" />
                  </div>
                )}

                {keywordAddressSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-border dark:border-gray-800 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-gray-50 dark:bg-gray-800/50">Suggestions</p>
                    {keywordAddressSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          const { lat, lng, display, address: a } = s
                          setMapPosition([lat, lng])
                          if (googleMapRef.current) {
                            googleMapRef.current.panTo({ lat, lng })
                            googleMapRef.current.setZoom(17)
                          }
                          setAddressAutocompleteValue(display)
                          const city = a.city || a.town || a.village || a.county || ""
                          const state = a.state || ""
                          const zipCode = a.postcode || ""
                          setAddressFormData((prev) => ({
                            ...prev,
                            street: display || prev.street,
                            city: city || prev.city,
                            state: state || prev.state,
                            zipCode: zipCode || prev.zipCode,
                          }))
                          setKeywordAddressSuggestions([])
                        }}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-[var(--primary)]/5 dark:hover:bg-[var(--primary)]/10 transition-colors text-left border-b border-gray-50 dark:border-gray-800 last:border-none"
                      >
                        <MapPin className="h-4 w-4 text-text-secondary mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                           <p className="text-sm font-semibold text-text-primary dark:text-white truncate">{s.display}</p>
                           <p className="text-xs text-text-secondary dark:text-text-secondary truncate">{s.address?.city || s.address?.state}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div ref={mapContainerRef} className="w-full h-full bg-gray-100 dark:bg-gray-800" />
            
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="relative mb-8 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center p-2 mb-[-6px] shadow-sm animate-bounce-short">
                     <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center border-2 border-white">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                     </div>
                  </div>
                  <div className="w-1.5 h-6 bg-green-600 border-x border-white shadow-xl rounded-b-full shadow-green-900/40" />
                  <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[1px] transform scale-x-150 absolute bottom-[-4px]" />
               </div>
            </div>

            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
              </div>
            )}
            
            <div className="absolute bottom-10 right-4 z-10">
              <Button 
                  onClick={handleUseCurrentLocation} 
                  className="bg-white text-text-primary hover:bg-gray-100 shadow-xl border border-border rounded-full h-12 px-6"
              >
                <Navigation className="h-4 w-4 mr-2 text-[var(--primary)]" /> Use My Location
              </Button>
            </div>
          </div>

          <div className="relative bg-surface dark:bg-[#0a0a0a] rounded-t-[32px] -mt-8 z-10 p-4 space-y-6 shadow-[0_-12px_24px_-10px_rgba(0,0,0,0.1)]">
            <div className="bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10 border border-[var(--primary)]/10 dark:border-[var(--primary)]/20 rounded-xl p-4 flex gap-3">
               <MapPin className="h-5 w-5 text-[var(--primary)] mt-0.5" />
               <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)]/80 uppercase mb-1">Pinnned Location</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{currentAddress || "Select a location on map"}</p>
               </div>
            </div>

            <div>
              <Label className="text-sm font-bold mb-2 block">Primary Address (Street / Area / Landmark)</Label>
              <Input 
                placeholder="Search or drag to update street/area" 
                value={addressFormData.street} 
                onChange={e => setAddressFormData({...addressFormData, street: e.target.value})}
                onFocus={() => scrollFieldIntoView("street")}
                ref={(el) => { manualFieldRefs.current.street = el }}
                className="mb-4 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                required
              />

              <Label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Secondary Address (House No. / Flat / Floor)</Label>
              <Input 
                placeholder="E.g. Flat 402, 4th Floor, Bhookingo Building" 
                value={addressFormData.additionalDetails} 
                onChange={e => setAddressFormData({...addressFormData, additionalDetails: e.target.value})}
                onFocus={() => scrollFieldIntoView("additionalDetails")}
                ref={(el) => { manualFieldRefs.current.additionalDetails = el }}
                className="h-12 rounded-xl border-border dark:border-gray-800 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">City</Label>
                <Input 
                  value={addressFormData.city} 
                  onChange={e => setAddressFormData({...addressFormData, city: e.target.value})} 
                  onFocus={() => scrollFieldIntoView("city")}
                  ref={(el) => { manualFieldRefs.current.city = el }}
                  className="h-12 rounded-xl"
                  required 
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">State</Label>
                <Input 
                  value={addressFormData.state} 
                  onChange={e => setAddressFormData({...addressFormData, state: e.target.value})} 
                  onFocus={() => scrollFieldIntoView("state")}
                  ref={(el) => { manualFieldRefs.current.state = el }}
                  className="h-12 rounded-xl"
                  required 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Pincode / ZIP</Label>
              <Input 
                placeholder="Pincode" 
                value={addressFormData.zipCode || ""} 
                onChange={e => setAddressFormData({...addressFormData, zipCode: e.target.value})} 
                onFocus={() => scrollFieldIntoView("zipCode")}
                ref={(el) => { manualFieldRefs.current.zipCode = el }}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
               <Label className="text-sm font-bold mb-2 block">Save address as</Label>
               <div className="flex gap-2">
                 {["Home", "Work", "Other"].map(l => (
                   <Button 
                     key={l}
                     variant={addressFormData.label === l ? "default" : "outline"}
                     onClick={() => setAddressFormData({...addressFormData, label: l})}
                     className="flex-1"
                     style={addressFormData.label === l ? {backgroundColor: 'var(--primary)', color: 'white'} : {}}
                   >
                     {l}
                   </Button>
                 ))}
               </div>
            </div>
          </div>
        </div>

        <div
          className="fixed left-0 right-0 p-4 bg-surface dark:bg-[#1a1a1a] border-t dark:border-gray-800 transition-[bottom] duration-150"
          style={{ bottom: `${keyboardInset}px` }}
        >
          <Button 
            className="w-full h-12 text-white font-bold text-lg" 
            style={{backgroundColor: 'var(--primary)'}}
            onClick={handleAddressFormSubmit}
            disabled={loadingAddress}
          >
            {loadingAddress ? "Saving..." : "Save Address \u0026 Proceed"}
          </Button>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="min-h-screen bg-surface dark:bg-[#0a0a0a] flex flex-col">
      <div className="flex-shrink-0 bg-surface dark:bg-[#1a1a1a] border-b border-border dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Select Location</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Search Bar */}
        <div className="p-4 bg-surface dark:bg-[#0a0a0a] border-b dark:border-gray-800/10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <Input
              value={addressAutocompleteValue}
              onChange={(e) => setAddressAutocompleteValue(e.target.value)}
              placeholder="Search for area, street name..."
              className="pl-12 pr-10 h-14 bg-surface dark:bg-[#1a1a1a] border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-zinc-500 dark:focus:border-zinc-500 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 font-medium text-sm transition-all shadow-sm w-full"
            />
            {addressAutocompleteValue && (
              <button 
                onClick={() => setAddressAutocompleteValue("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions List */}
        {keywordAddressSuggestions.length > 0 && (
          <div className="mx-4 mt-2 mb-4 bg-surface dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-850 z-50 animate-in fade-in duration-200">
            {keywordAddressSuggestions.map((s) => {
              const title = s.display.split(",")[0] || s.display
              const subtitle = s.display.split(",").slice(1).join(",").trim() || s.display
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectOuterSuggestion(s)}
                  className="w-full px-4 py-3.5 flex items-start gap-3.5 hover:bg-[var(--primary)]/5 dark:hover:bg-[var(--primary)]/10 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary-light/10 dark:bg-red-950/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4.5 w-4.5 text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-2.5 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {isKeywordSearching && (
          <div className="mx-4 mt-2 mb-4 p-4 flex items-center justify-center gap-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--primary)] border-t-transparent" />
            Searching location...
          </div>
        )}

        {/* Action Rows: Use Current Location & Add Address */}
        <div className="bg-surface dark:bg-[#0a0a0a] border-b border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/40">
          <button 
            onClick={handleUseCurrentLocation}
            className="w-full flex items-center gap-4 py-4 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-full bg-primary-light/10 dark:bg-red-950/10 flex items-center justify-center flex-shrink-0">
              <Crosshair className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--primary)] text-[15px]">Use current location</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{currentAddress || "Enable GPS for accuracy"}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
          </button>

          <button 
            onClick={handleAddAddressClick}
            className="w-full flex items-center gap-4 py-4 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-full bg-primary-light/10 dark:bg-red-950/10 flex items-center justify-center flex-shrink-0">
              <Plus className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--primary)] text-[15px]">Enter address manually</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
          </button>

          <button 
            onClick={() => setShowMapsLinkModal(true)}
            className="w-full flex items-center gap-4 py-4 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all text-left bg-red-50/30 dark:bg-red-950/10"
          >
            <div className="h-10 w-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <GoogleMapsIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">Paste Google Maps location link</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">Quickly resolve location from a shared maps URL</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400 flex-shrink-0" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Saved Addresses</h2>
          </div>

          <div className="space-y-4">
            {profileLoading && addresses.length === 0 ? (
              // Skeleton loading state
              [1, 2].map((i) => (
                <div key={i} className="w-full flex items-start gap-4 p-4 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : addresses.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                 <MapPin className="h-12 w-12 mx-auto mb-2 text-text-secondary" />
                 <p>No addresses saved yet</p>
              </div>
            ) : (
              addresses.map((addr, idx) => {
                const Icon = getAddressIcon(addr)
                const isReceiver = addr.isForReceiver === true || Boolean(addr.receiverPhone)
                return (
                  <button
                    key={getAddressId(addr) || idx}
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="w-full flex items-start gap-4 p-4 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl hover:bg-[#DC262610] dark:hover:bg-[#DC262620] transition-colors text-left group border border-transparent hover:border-orange-500/20"
                  >
                    <div className="h-10 w-10 rounded-full bg-surface dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="h-5 w-5 text-text-secondary dark:text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-text-primary dark:text-white capitalize">{addr.label || "Address"}</p>
                        {isReceiver && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                            For: {addr.receiverName || "Someone else"} {addr.receiverPhone ? `(${addr.receiverPhone})` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary dark:text-text-secondary line-clamp-2 mt-0.5">
                        {[addr.additionalDetails, addr.street, addr.city, addr.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="h-6 w-6 rounded-full border border-border dark:border-gray-700 mt-2 flex items-center justify-center group-hover:border-[var(--primary)] shrink-0">
                       <ChevronRight className="h-3 w-3 text-text-secondary group-hover:text-[var(--primary)]" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Modal 1: Paste Google Maps Link Modal */}
        {showMapsLinkModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-3xl p-5 space-y-4 border border-gray-100 dark:border-neutral-800 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold shadow-sm">
                    <GoogleMapsIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">Paste Google Maps Link</h3>
                </div>
                <button onClick={() => setShowMapsLinkModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-400 mb-1.5">
                  Google Maps Location URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/... or https://maps.google.com/..."
                    value={mapsLinkInput}
                    onChange={(e) => setMapsLinkInput(e.target.value)}
                    className="w-full pl-3.5 pr-24 py-3 text-xs rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center gap-1 hover:bg-orange-200"
                  >
                    <Clipboard className="w-3 h-3" /> Paste
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1.5">
                  Ask the person to open Google Maps &rarr; tap Share &rarr; Copy link, then paste it here.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMapsLinkModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  disabled={isResolvingLink || !mapsLinkInput.trim()}
                  onClick={handleResolveMapsLink}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-40"
                >
                  {isResolvingLink ? "Fetching Location..." : "Fetch Location"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: "Is this order for someone else?" Prompt */}
        {showReceiverPromptModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-3xl p-6 text-center space-y-4 border border-gray-100 dark:border-neutral-800 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-500 mx-auto flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Is this order for someone else?</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  Specify receiver details so they get SMS updates & pickup OTP directly.
                </p>
              </div>
              {resolvedLinkData?.formattedAddress && (
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 text-xs text-gray-600 dark:text-neutral-300 text-left line-clamp-2">
                  📍 {resolvedLinkData.formattedAddress}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleReceiverPromptResponse(false)}
                  className="w-full py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  No, for Me
                </button>
                <button
                  type="button"
                  onClick={() => handleReceiverPromptResponse(true)}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                >
                  Yes, Someone Else
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Receiver Details Form Modal */}
        <ReceiverDetailsModal
          isOpen={showReceiverDetailsModal}
          onClose={() => setShowReceiverDetailsModal(false)}
          addressText={resolvedLinkData?.formattedAddress || ""}
          onSave={handleSaveReceiverDetails}
        />
      </div>
      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1s infinite ease-in-out;
        }
      `}</style>
      
      {isFetchingLocationState && (
        <div className="fixed inset-0 z-[10000] bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="relative">
            <div className="w-10 h-10 border-[3px] border-border/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-10 h-10 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-[13px] font-bold text-gray-800 dark:text-gray-200 tracking-tight animate-pulse">Fetching Location...</p>
        </div>
      )}
    </AnimatedPage>
  )
}
