import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import Lenis from "lenis"
import {
  ArrowLeft,
  User,
  Edit,
  Building,
  CreditCard,
  FileText,
  Upload,
  X,
  ImageIcon,
  Check,
  Clock,
  Calendar as CalendarIcon,
  Sparkles,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import { restaurantAPI, uploadAPI, highwayAPI } from "@food/api"
import OptimizedImage from "@food/components/OptimizedImage"
import { ImageSourcePicker } from "@food/components/ImageSourcePicker"
import { isFlutterBridgeAvailable } from "@food/utils/imageUploadUtils"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { formatRoadDistance } from "@food/utils/formatRoadDistance"
import { HIGHWAY_DETECTION_COPY } from "@food/utils/highwayDetectionCopy"
import { toast } from "sonner"
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

const timeStringToMinutes = (value = "") => {
  const raw = String(value || "").trim()
  if (!/^\d{2}:\d{2}$/.test(raw)) return null
  const [hours, minutes] = raw.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

const normalizeTimeValue = (value) => {
  if (!value) return ""
  const raw = String(value).trim()
  if (!raw) return ""

  const to24Hour = (h, m, period) => {
    let hours = Number(h)
    const minutes = Number(m)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ""
    if (minutes < 0 || minutes > 59) return ""
    const p = String(period || "").toUpperCase()
    if (p === "AM") {
      if (hours === 12) hours = 0
    } else if (p === "PM") {
      if (hours !== 12) hours += 12
    }
    if (hours < 0 || hours > 23) return ""
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":").map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return ""
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  if (/^\d{1}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":")
    return to24Hour(h, m, "")
  }

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (ampm) {
    return to24Hour(ampm[1], ampm[2], ampm[3])
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return timeToString(parsed)
  }
  return ""
}

const stringToTime = (timeString) => {
  const normalized = normalizeTimeValue(timeString)
  if (!normalized || !normalized.includes(":")) {
    return null
  }
  const [hours, minutes] = normalized.split(":").map(Number)
  return new Date(2000, 0, 1, hours || 0, minutes || 0)
}

const timeToString = (date) => {
  if (!date) return ""
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

const PAN_NUMBER_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GST_NUMBER_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const FSSAI_NUMBER_REGEX = /^\d{14}$/
const BANK_ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/
const IFSC_CODE_REGEX = /^[A-Z0-9]{11}$/
const OWNER_NAME_REGEX = /^[A-Za-z ]+$/
const ACCOUNT_HOLDER_NAME_REGEX = /^[A-Za-z ]+$/
const GST_LEGAL_NAME_REGEX = /^[A-Za-z ]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizePincode = (value) => String(value || "").replace(/\D/g, "").slice(0, 6)

const isGoogleMapsUrl = (urlString = "") => {
  try {
    const url = new URL(urlString)
    const host = url.hostname.replace(/^www\./, "")
    const path = url.pathname || ""
    return (
      host === "google.com" ||
      host.endsWith("google.com") ||
      host === "maps.app.goo.gl" ||
      (host === "goo.gl" && path.startsWith("/maps"))
    )
  } catch {
    return false
  }
}

const extractCoordsFromUrl = (url) => {
  const atMatch = url.match(/@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

  const match3d = url.match(/!3d(-?\d+\.\d+)/)
  const match4d = url.match(/!4d(-?\d+\.\d+)/)
  const match2d = url.match(/!2d(-?\d+\.\d+)/)
  if (match3d && (match4d || match2d)) {
    return { lat: parseFloat(match3d[1]), lng: parseFloat(match4d ? match4d[1] : match2d[1]) }
  }

  try {
    const urlObj = new URL(url)
    const q = urlObj.searchParams.get("q") || urlObj.searchParams.get("query")
    if (q) {
      const qMatch = q.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
      if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
    }
  } catch {}

  const generalMatch = url.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (generalMatch) {
    const lat = parseFloat(generalMatch[1])
    const lng = parseFloat(generalMatch[2])
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng }
  }

  return null
}

const extractPlaceNameFromUrl = (url) => {
  const placeNameMatch = url.match(/\/place\/([^/]+)/)
  if (placeNameMatch && placeNameMatch[1]) {
    const segment = placeNameMatch[1]
    if (!segment.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
      try {
        return decodeURIComponent(segment.replace(/\+/g, " "))
      } catch {
        return segment.replace(/\+/g, " ")
      }
    }
  }
  return ""
}

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const ALL_CUISINES = [
  "Burger",
  "Chinese",
  "Momos",
  "North Indian",
  "Pizza",
  "Rolls",
  "Sandwich",
  "Shawarma",
  "South Indian",
  "Biryani",
  "Desserts",
  "Ice Cream",
  "Fast Food",
  "Cafe",
  "Italian",
  "Mexican",
  "Thai",
  "Seafood",
  "Salad",
  "Healthy Food",
  "Juices",
  "Beverages",
  "Punjabi",
  "Gujarati",
  "Rajasthani",
  "Mughlai",
  "Street Food",
  "Bakery",
]

const formatNameToCapital = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const parseGoogleAddressComponents = (components = []) => {
  const get = (types) =>
    components.find((component) => types.some((type) => component.types?.includes(type)))?.long_name || ""

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


const buildFallbackAddress = (location = {}, apiData = {}) => {
  const parts = [
    location.addressLine1,
    location.addressLine2,
    location.area || apiData.area,
    location.city || apiData.city,
    location.state || apiData.state,
    location.pincode || apiData.pincode,
    location.landmark,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  return parts.join(", ")
}

async function loadGooglePlaces() {
  if (window.google?.maps?.places?.Autocomplete) return true
  const apiKey = await getGoogleMapsApiKey()
  if (!apiKey) return false

  window.gm_authFailure = () => {}

  const existing = document.getElementById("restaurant-owner-google-maps-script")
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
    script.id = "restaurant-owner-google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return !!window.google?.maps?.places?.Autocomplete
}

export default function EditOwner() {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const goBack = useRestaurantBackNavigation()

  // Tabs structure
  const TABS = [
    { id: "owner", label: "Owner Details", icon: User },
    { id: "restaurant", label: "Restaurant Info", icon: Building },
    { id: "address", label: "Address", icon: MapPin },
    { id: "kyc", label: "Bank & KYC", icon: CreditCard },
    { id: "docs", label: "FSSAI & Docs", icon: FileText },
  ]
  const [activeTab, setActiveTab] = useState("owner")

  // Master Form Data
  const [formData, setFormData] = useState({
    // Owner details
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    profileImage: null,

    // Restaurant details
    restaurantName: "",
    pureVegRestaurant: false,
    primaryContactNumber: "",
    locationSource: "google_places",

    location: {
      placeId: "",
      formattedAddress: "",
      addressLine1: "",
      addressLine2: "",
      area: "",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "",
      landmark: "",
      roadName: "",
      latitude: "",
      longitude: "",
    },
    cuisines: [],
    openingTime: "",
    closingTime: "",
    openDays: [],

    // Bank & KYC
    panNumber: "",
    nameOnPan: "",
    panImage: null,
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "Saving",
    gstRegistered: false,
    gstNumber: "",
    gstLegalName: "",
    gstAddress: "",
    gstImage: null,

    // Documents & FSSAI
    fssaiNumber: "",
    fssaiExpiry: "",
    fssaiImage: null,
    menuImages: [],
  })

  const [initialData, setInitialData] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Photo Picker helpers
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false)
  const [activeImageField, setActiveImageField] = useState(null)
  const fileInputRef = useRef(null)
  const [locationError, setLocationError] = useState("")
  const [highwayInfo, setHighwayInfo] = useState({
    loading: false,
    status: null,
    highwayName: null,
    highwayRef: null,
    distanceMeters: null,
    thresholdMeters: null,
  })
  const [isRoadNameDirty, setIsRoadNameDirty] = useState(false)
  const [isMapsSdkReady, setIsMapsSdkReady] = useState(() => Boolean(window.google?.maps))
  const [locationSearchValue, setLocationSearchValue] = useState("")
  const [locationPredictions, setLocationPredictions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [mapsLinkValue, setMapsLinkValue] = useState("")
  const [isProcessingLink, setIsProcessingLink] = useState(false)
  const [isGoogleMapsValid, setIsGoogleMapsValid] = useState(true)
  const locationSearchInputRef = useRef(null)
  const placesAutocompleteRef = useRef(null)
  const autocompleteServiceRef = useRef(null)
  const placesServiceRef = useRef(null)
  const isPlaceSelectedRef = useRef(false)
  const pinMapContainerRef = useRef(null)
  const pinMapRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const pinGeocoderRef = useRef(null)
  const lastAutoRoadNameRef = useRef("")

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)
    return () => {
      lenis.destroy()
    }
  }, [])



  // Fetch restaurant details
  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true)
        const response = await restaurantAPI.refreshCurrentRestaurant()
        const apiData = response?.data?.data?.restaurant || response?.data?.restaurant

        if (apiData) {
          // Backend can return location in flat profile fields or onboarding step data.
          const onboardingLocation = apiData.onboarding?.step1?.location || {}
          const originalLocation = apiData.originalData?.location || {}
          const loc = apiData.location || onboardingLocation || originalLocation || {}
          const fallbackFormattedAddress = loc.formattedAddress || loc.address || apiData.address || buildFallbackAddress(loc, apiData) || buildFallbackAddress(onboardingLocation, apiData) || ""
          const fallbackAddressLine1 = loc.addressLine1 || onboardingLocation.addressLine1 || originalLocation.addressLine1 || fallbackFormattedAddress || apiData.addressLine1 || apiData.address || ""
          const fallbackLatitude = loc.latitude ?? onboardingLocation.latitude ?? originalLocation.latitude ?? (Array.isArray(loc.coordinates) ? loc.coordinates[1] : "")
          const fallbackLongitude = loc.longitude ?? onboardingLocation.longitude ?? originalLocation.longitude ?? (Array.isArray(loc.coordinates) ? loc.coordinates[0] : "")

          // Helper to extract URL from image field (can be string URL or {url, publicId} object)
          const toImgUrl = (field) => {
            if (!field) return null
            if (typeof field === "string") return field
            if (field.url) return field.url
            return null
          }

          // menuImages come as array of {url, publicId} objects or string URLs
          const menuImagesArr = Array.isArray(apiData.menuImages)
            ? apiData.menuImages.map((m) => (typeof m === "string" ? m : m?.url || "")).filter(Boolean)
            : []

          const mappedData = {
            ownerName: apiData.ownerName || "",
            ownerEmail: apiData.ownerEmail || "",
            ownerPhone: (apiData.ownerPhone || "").replace(/\D/g, "").slice(-10),
            profileImage: toImgUrl(apiData.profileImage),

            restaurantName: apiData.restaurantName || apiData.name || "",
            pureVegRestaurant: Boolean(apiData.pureVegRestaurant),
            primaryContactNumber: (apiData.primaryContactNumber || "").replace(/\D/g, "").slice(-10),
            locationSource: apiData.locationSource || "google_places",

            location: {
              placeId: loc.placeId || onboardingLocation.placeId || originalLocation.placeId || "",
              formattedAddress: fallbackFormattedAddress,
              addressLine1: fallbackAddressLine1,
              addressLine2: loc.addressLine2 || onboardingLocation.addressLine2 || originalLocation.addressLine2 || "",
              area: loc.area || onboardingLocation.area || originalLocation.area || apiData.area || "",
              city: loc.city || onboardingLocation.city || originalLocation.city || apiData.city || "Indore",
              state: loc.state || onboardingLocation.state || originalLocation.state || apiData.state || "Madhya Pradesh",
              pincode: loc.pincode || onboardingLocation.pincode || originalLocation.pincode || apiData.pincode || "",
              landmark: loc.landmark || onboardingLocation.landmark || originalLocation.landmark || "",
              roadName: loc.roadName || onboardingLocation.roadName || originalLocation.roadName || "",
              latitude: fallbackLatitude,
              longitude: fallbackLongitude,
            },
            cuisines: Array.isArray(apiData.cuisines) 
              ? apiData.cuisines.flatMap(c => typeof c === "string" ? c.split(",").map(s => s.trim()) : c).map(c => ALL_CUISINES.find(ac => ac.toLowerCase() === String(c).toLowerCase()) || c) 
              : [],
            openingTime: apiData.openingTime || "",
            closingTime: apiData.closingTime || "",
            openDays: Array.isArray(apiData.openDays) 
              ? apiData.openDays.flatMap(d => typeof d === "string" ? d.split(",").map(s => s.trim()) : d).map(d => daysOfWeek.find(dw => dw.toLowerCase() === String(d).toLowerCase()) || d) 
              : [],

            panNumber: apiData.panNumber || "",
            nameOnPan: apiData.nameOnPan || "",
            panImage: toImgUrl(apiData.panImage),
            accountNumber: apiData.accountNumber || "",
            confirmAccountNumber: apiData.accountNumber || "",
            ifscCode: apiData.ifscCode || "",
            accountHolderName: apiData.accountHolderName || "",
            accountType: apiData.accountType || "Saving",
            gstRegistered: Boolean(apiData.gstRegistered),
            gstNumber: apiData.gstNumber || "",
            gstLegalName: apiData.gstLegalName || "",
            gstAddress: apiData.gstAddress || "",
            gstImage: toImgUrl(apiData.gstImage),

            fssaiNumber: apiData.fssaiNumber || "",
            fssaiExpiry: apiData.fssaiExpiry ? String(apiData.fssaiExpiry).split("T")[0] : "",
            fssaiImage: toImgUrl(apiData.fssaiImage),
            menuImages: menuImagesArr,
          }

          setFormData(mappedData)
          setLocationSearchValue(fallbackFormattedAddress || fallbackAddressLine1 || "")
          setInitialData(JSON.parse(JSON.stringify(mappedData))) // deep copy
        }
      } catch (err) {
        console.error("Error loading restaurant data:", err)
        toast.error("Failed to load restaurant profile details")
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurantData()
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setLocationError("")
      try {
        const loaded = await loadGooglePlaces()
        if (cancelled) return
        if (!loaded || !window.google?.maps?.places) {
          setLocationError("Unable to load Google Places Autocomplete.")
          return
        }

        setIsMapsSdkReady(true)

        if (!autocompleteServiceRef.current && window.google?.maps?.places?.AutocompleteService) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        }

        if (!placesServiceRef.current && window.google?.maps?.places?.PlacesService) {
          const serviceHost = document.createElement("div")
          placesServiceRef.current = new window.google.maps.places.PlacesService(serviceHost)
        }
      } catch {
        if (!cancelled) {
          setLocationError("Unable to load Google Places Autocomplete.")
        }
      }
    }

    init().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isMapsSdkReady || !autocompleteServiceRef.current) {
      setLocationPredictions([])
      setIsSearchingLocation(false)
      return
    }

    if (isPlaceSelectedRef.current) {
      setLocationPredictions([])
      setIsSearchingLocation(false)
      return
    }

    const query = String(locationSearchValue || "").trim()
    if (query.length < 3) {
      setLocationPredictions([])
      setIsSearchingLocation(false)
      return
    }

    let cancelled = false
    setIsSearchingLocation(true)

    const timerId = window.setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "in" },
          types: ["geocode", "establishment"],
        },
        (predictions, status) => {
          if (cancelled) return

          const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
          if (status === okStatus && Array.isArray(predictions)) {
            setLocationPredictions(predictions.slice(0, 5))
          } else {
            setLocationPredictions([])
          }
          setIsSearchingLocation(false)
        }
      )
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [locationSearchValue, isMapsSdkReady])

  useEffect(() => {
    if (window.google?.maps && !isMapsSdkReady) {
      setIsMapsSdkReady(true)
    }
  }, [isMapsSdkReady])

  useEffect(() => {
    const lat = Number(formData.location?.latitude)
    const lng = Number(formData.location?.longitude)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setHighwayInfo({
        loading: false,
        status: null,
        highwayName: null,
        highwayRef: null,
        distanceMeters: null,
        thresholdMeters: null,
      })
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
            highwayName: data.highwayName || null,
            highwayRef: data.highwayRef || null,
            distanceMeters: data.distanceMeters ?? null,
            thresholdMeters: data.thresholdMeters ?? null,
          })
        } else {
          setHighwayInfo({
            loading: false,
            status: "OUT_OF_SERVICE",
            highwayName: null,
            highwayRef: null,
            distanceMeters: null,
            thresholdMeters: null,
          })
        }
      } catch {
        if (!cancelled) {
          setHighwayInfo({
            loading: false,
            status: "OUT_OF_SERVICE",
            highwayName: null,
            highwayRef: null,
            distanceMeters: null,
            thresholdMeters: null,
          })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [formData.location?.latitude, formData.location?.longitude])

  const autoDetectedRoadLabel = (() => {
    if (highwayInfo.highwayRef) {
      return `${highwayInfo.highwayRef}${highwayInfo.highwayName ? ` - ${highwayInfo.highwayName}` : ""}`
    }
    if (highwayInfo.highwayName) {
      return String(highwayInfo.highwayName)
    }
    return ""
  })()

  useEffect(() => {
    if (!autoDetectedRoadLabel) return
    setFormData((prev) => {
      const currentRoadName = String(prev.location?.roadName || "")
      if (isRoadNameDirty && currentRoadName && currentRoadName !== lastAutoRoadNameRef.current) return prev
      if (currentRoadName === autoDetectedRoadLabel) {
        lastAutoRoadNameRef.current = autoDetectedRoadLabel
        return prev
      }
      lastAutoRoadNameRef.current = autoDetectedRoadLabel
      return {
        ...prev,
        location: {
          ...prev.location,
          roadName: autoDetectedRoadLabel,
        },
      }
    })
  }, [autoDetectedRoadLabel, isRoadNameDirty])

  const reverseGeocodePinnedLocation = async (lat, lng) => {
    if (!window.google?.maps?.Geocoder) return null
    if (!pinGeocoderRef.current) {
      pinGeocoderRef.current = new window.google.maps.Geocoder()
    }

    return new Promise((resolve) => {
      pinGeocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          resolve(null)
          return
        }
        const place = results[0]
        const parsed = parseGoogleAddressComponents(place.address_components || [])
        resolve({
          formattedAddress: place.formatted_address || "",
          placeId: place.place_id || "",
          ...parsed,
        })
      })
    })
  }

  const syncPinnedLocation = async (lat, lng) => {
    const roundedLat = Number(Number(lat).toFixed(6))
    const roundedLng = Number(Number(lng).toFixed(6))
    if (!Number.isFinite(roundedLat) || !Number.isFinite(roundedLng)) return

    const geoDetails = await reverseGeocodePinnedLocation(roundedLat, roundedLng)
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        formattedAddress: geoDetails?.formattedAddress || prev.location.formattedAddress || `${roundedLat}, ${roundedLng}`,
        addressLine1: geoDetails?.formattedAddress || prev.location.addressLine1 || `${roundedLat}, ${roundedLng}`,
        area: geoDetails?.area || prev.location.area,
        city: geoDetails?.city || prev.location.city,
        state: geoDetails?.state || prev.location.state,
        pincode: geoDetails?.pincode || prev.location.pincode,
        latitude: roundedLat,
        longitude: roundedLng,
        placeId: geoDetails?.placeId || prev.location.placeId || "",
        roadName: geoDetails?.roadName || prev.location.roadName || prev.location.area || "",
      },
    }))
    setIsRoadNameDirty(false)
  }

  useEffect(() => {
    const lat = Number(formData.location?.latitude)
    const lng = Number(formData.location?.longitude)
    if (!isMapsSdkReady || !Number.isFinite(lat) || !Number.isFinite(lng) || !pinMapContainerRef.current || !window.google?.maps) {
      return undefined
    }

    const center = { lat, lng }
    if (!pinMapRef.current) {
      pinMapRef.current = new window.google.maps.Map(pinMapContainerRef.current, {
        center,
        zoom: 16,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      })
      pinMarkerRef.current = new window.google.maps.Marker({
        map: pinMapRef.current,
        position: center,
        draggable: true,
        title: "Restaurant Pin",
        animation: window.google.maps.Animation?.DROP,
      })
      pinMarkerRef.current.addListener("dragend", async (event) => {
        await syncPinnedLocation(event?.latLng?.lat?.(), event?.latLng?.lng?.())
      })
      pinMapRef.current.addListener("click", async (event) => {
        const nextLat = event?.latLng?.lat?.()
        const nextLng = event?.latLng?.lng?.()
        if (pinMarkerRef.current && Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
          pinMarkerRef.current.setPosition({ lat: nextLat, lng: nextLng })
        }
        await syncPinnedLocation(nextLat, nextLng)
      })
    } else {
      pinMapRef.current.setCenter(center)
      pinMarkerRef.current?.setPosition(center)
      pinMarkerRef.current?.setDraggable(true)
    }

    return undefined
  }, [formData.location?.latitude, formData.location?.longitude, isMapsSdkReady])

  // Check for unsaved changes
  const hasChanges = useMemo(() => (initialData ? JSON.stringify(formData) !== JSON.stringify(initialData) : false), [formData, initialData])

  // Field change helpers
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLocationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }))
  }

  const handleLocationPredictionSelect = (prediction) => {
    if (!prediction?.place_id || !placesServiceRef.current) return

    isPlaceSelectedRef.current = true
    setLocationSearchValue(prediction.description || "")
    setLocationPredictions([])
    setIsSearchingLocation(false)

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "address_components", "geometry", "place_id"],
      },
      (place, status) => {
        const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
        if (status !== okStatus || !place?.geometry) {
          return
        }

        const formattedAddress = place?.formatted_address || prediction.description || ""
        const parsedAddress = parseGoogleAddressComponents(place?.address_components || [])
        const lat = place?.geometry?.location?.lat?.()
        const lng = place?.geometry?.location?.lng?.()

        setFormData((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            formattedAddress: formattedAddress || prev.location.formattedAddress,
            addressLine1: formattedAddress || prev.location.addressLine1,
            area: parsedAddress.area || prev.location.area,
            city: parsedAddress.city || prev.location.city,
            state: parsedAddress.state || prev.location.state,
            pincode: parsedAddress.pincode || prev.location.pincode,
            roadName: parsedAddress.roadName || prev.location.roadName || "",
            placeId: place?.place_id || prev.location.placeId || "",
            latitude: Number.isFinite(lat) ? Number(lat.toFixed(6)) : prev.location.latitude,
            longitude: Number.isFinite(lng) ? Number(lng.toFixed(6)) : prev.location.longitude,
          },
        }))
        setIsRoadNameDirty(false)
      }
    )
  }

  const handleMapsLinkChange = async (e) => {
    const value = e.target.value
    setMapsLinkValue(value)
    if (!value.trim()) return

    let urlStr = value.trim()
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = `https://${urlStr}`
    }

    if (!isGoogleMapsUrl(urlStr)) {
      toast.error("Invalid Google Maps link. Please enter a valid Google Maps URL.")
      return
    }

    setIsProcessingLink(true)
    try {
      let resolvedUrl = urlStr
      let backendData = null
      const response = await restaurantAPI.resolveMapsLink({ url: urlStr, link: urlStr })
      if (response?.data?.success) {
        if (response?.data?.url) resolvedUrl = response.data.url
        if (response?.data?.data) backendData = response.data.data
      }

      let lat = backendData?.lat || backendData?.latitude
      let lng = backendData?.lng || backendData?.longitude

      if (!lat || !lng) {
        const coords = extractCoordsFromUrl(resolvedUrl)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }

      if (!lat || !lng) {
        toast.error("Unable to detect location from this link.")
        return
      }

      const applyLocationData = (locDetails) => {
        const extractedPlaceName = extractPlaceNameFromUrl(resolvedUrl)
        setFormData((prev) => ({
          ...prev,
          restaurantName: extractedPlaceName || prev.restaurantName,
          locationSource: "google_maps_link",
          location: {
            ...prev.location,
            formattedAddress: locDetails.formattedAddress || prev.location.formattedAddress,
            addressLine1: locDetails.formattedAddress || prev.location.addressLine1 || "",
            area: locDetails.area || prev.location.area,
            city: locDetails.city || prev.location.city,
            state: locDetails.state || prev.location.state,
            pincode: locDetails.pincode || prev.location.pincode,
            roadName: locDetails.roadName || prev.location.roadName || "",
            latitude: lat,
            longitude: lng,
            placeId: locDetails.placeId || prev.location.placeId || "",
          },
        }))

        setLocationSearchValue(locDetails.formattedAddress || "")
        setIsRoadNameDirty(false)
        toast.success("Location details populated from Google Maps link")
      }

      if (backendData?.formattedAddress) {
        applyLocationData(backendData)
      } else if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const place = results[0]
            const parsedAddress = parseGoogleAddressComponents(place?.address_components || [])
            applyLocationData({
              formattedAddress: place.formatted_address || "",
              area: parsedAddress.area,
              city: parsedAddress.city,
              state: parsedAddress.state,
              pincode: parsedAddress.pincode,
              roadName: parsedAddress.roadName,
              placeId: place.place_id || "",
            })
          } else {
            applyLocationData({ formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
          }
        })
      } else {
        applyLocationData({ formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
      }
    } catch (error) {
      toast.error(error?.message || "Unable to process Google Maps link")
    } finally {
      setIsProcessingLink(false)
    }
  }

  const handleLocationSearchBlur = () => {
    window.setTimeout(() => {
      setLocationPredictions([])
    }, 120)

    const trimmedValue = String(locationSearchValue || "").trim()
    if (!trimmedValue) return

    setFormData((prev) => {
      if (prev.location?.formattedAddress === trimmedValue) return prev
      return {
        ...prev,
        location: {
          ...prev.location,
          formattedAddress: trimmedValue,
          addressLine1: prev.location?.addressLine1 || trimmedValue,
        },
      }
    })
  }

  // Cuisines helper
  const handleCuisineToggle = (cuisine) => {
    setFormData((prev) => {
      const isSelected = prev.cuisines.includes(cuisine)
      if (isSelected) {
        return {
          ...prev,
          cuisines: prev.cuisines.filter((c) => c !== cuisine),
        }
      } else {
        if (prev.cuisines.length >= 8) {
          toast.error("You can select up to 8 cuisines only")
          return prev
        }
        return {
          ...prev,
          cuisines: [...prev.cuisines, cuisine],
        }
      }
    })
  }

  // Open Days helper
  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const isSelected = prev.openDays.includes(day)
      if (isSelected) {
        return {
          ...prev,
          openDays: prev.openDays.filter((d) => d !== day),
        }
      } else {
        return {
          ...prev,
          openDays: [...prev.openDays, day],
        }
      }
    })
  }

  // File picker handler
  const handlePhotoClick = (field) => {
    setActiveImageField(field)
    setIsPhotoPickerOpen(true)
  }

  const handlePhotoSelect = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Max 5MB allowed.")
      return
    }

    if (activeImageField === "menuImages") {
      setFormData((prev) => ({
        ...prev,
        menuImages: [...prev.menuImages, file],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [activeImageField]: file,
      }))
    }
    setIsPhotoPickerOpen(false)
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      handlePhotoSelect(file)
    }
    event.target.value = "" // reset
  }

  const handleRemoveImage = (field, index = null) => {
    if (field === "menuImages" && index !== null) {
      setFormData((prev) => ({
        ...prev,
        menuImages: prev.menuImages.filter((_, idx) => idx !== index),
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: null,
      }))
    }
  }

  // Get image preview URL
  const getPreviewUrl = (value) => {
    if (!value) return ""
    if (typeof value === "string") return value
    if (value instanceof File || value instanceof Blob) {
      try {
        return URL.createObjectURL(value)
      } catch {
        return ""
      }
    }
    return value.url || ""
  }

  // Validation function
  const validateForm = () => {
    const errors = []

    // 1. Owner Details validation
    if (!formData.ownerName?.trim()) {
      errors.push({ tab: "owner", field: "ownerName", message: "Owner name is required" })
    } else if (!OWNER_NAME_REGEX.test(formData.ownerName.trim())) {
      errors.push({ tab: "owner", field: "ownerName", message: "Owner name must contain only letters" })
    }

    if (!formData.ownerEmail?.trim()) {
      errors.push({ tab: "owner", field: "ownerEmail", message: "Owner email is required" })
    } else if (!EMAIL_REGEX.test(formData.ownerEmail.trim())) {
      errors.push({ tab: "owner", field: "ownerEmail", message: "Please enter a valid email address" })
    }

    if (!formData.ownerPhone?.trim()) {
      errors.push({ tab: "owner", field: "ownerPhone", message: "Mobile phone number is required" })
    } else if (!/^\d{10}$/.test(formData.ownerPhone.replace(/\D/g, ""))) {
      errors.push({ tab: "owner", field: "ownerPhone", message: "Mobile number must be exactly 10 digits" })
    }

    if (!formData.profileImage) {
      errors.push({ tab: "owner", field: "profileImage", message: "Profile photo is required" })
    }

    // 2. Restaurant details validation
    if (!formData.restaurantName?.trim()) {
      errors.push({ tab: "restaurant", field: "restaurantName", message: "Restaurant name is required" })
    }

    if (!formData.primaryContactNumber?.trim()) {
      errors.push({ tab: "restaurant", field: "primaryContactNumber", message: "Primary contact number is required" })
    } else if (!/^\d{10}$/.test(formData.primaryContactNumber.replace(/\D/g, ""))) {
      errors.push({ tab: "restaurant", field: "primaryContactNumber", message: "Primary contact must be exactly 10 digits" })
    }



    if (!formData.location?.addressLine1?.trim()) {
      errors.push({ tab: "restaurant", field: "addressLine1", message: "Address details are required" })
    }

    if (!formData.location?.area?.trim()) {
      errors.push({ tab: "restaurant", field: "area", message: "Area/Locality is required" })
    }

    if (!formData.location?.pincode?.trim()) {
      errors.push({ tab: "restaurant", field: "pincode", message: "Pincode is required" })
    } else if (!/^\d{6}$/.test(formData.location.pincode.replace(/\D/g, ""))) {
      errors.push({ tab: "restaurant", field: "pincode", message: "Pincode must be exactly 6 digits" })
    }

    if (!formData.location?.roadName?.trim()) {
      errors.push({ tab: "restaurant", field: "roadName", message: "Road / Highway name is required" })
    }

    if (!formData.openingTime || !formData.closingTime) {
      errors.push({ tab: "restaurant", field: "timings", message: "Opening & closing timings are required" })
    }

    if (!formData.openDays || formData.openDays.length === 0) {
      errors.push({ tab: "restaurant", field: "openDays", message: "Select at least one open day" })
    }


    // 3. Bank & KYC validation
    if (!formData.panNumber?.trim()) {
      errors.push({ tab: "kyc", field: "panNumber", message: "PAN card number is required" })
    } else if (!PAN_NUMBER_REGEX.test(formData.panNumber.trim().toUpperCase())) {
      errors.push({ tab: "kyc", field: "panNumber", message: "Invalid PAN card format (e.g. ABCDE1234F)" })
    }

    if (!formData.nameOnPan?.trim()) {
      errors.push({ tab: "kyc", field: "nameOnPan", message: "Name on PAN card is required" })
    }

    if (!formData.panImage) {
      errors.push({ tab: "kyc", field: "panImage", message: "PAN card copy upload is required" })
    }

    if (!formData.accountNumber?.trim()) {
      errors.push({ tab: "kyc", field: "accountNumber", message: "Bank account number is required" })
    } else if (!BANK_ACCOUNT_NUMBER_REGEX.test(formData.accountNumber.trim())) {
      errors.push({ tab: "kyc", field: "accountNumber", message: "Bank account number must be 9 to 18 digits" })
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      errors.push({ tab: "kyc", field: "confirmAccountNumber", message: "Bank account confirmation does not match" })
    }

    if (!formData.ifscCode?.trim()) {
      errors.push({ tab: "kyc", field: "ifscCode", message: "IFSC code is required" })
    } else if (!IFSC_CODE_REGEX.test(formData.ifscCode.trim().toUpperCase())) {
      errors.push({ tab: "kyc", field: "ifscCode", message: "Invalid IFSC code format (11 digits alphanumeric)" })
    }

    if (!formData.accountHolderName?.trim()) {
      errors.push({ tab: "kyc", field: "accountHolderName", message: "Account holder name is required" })
    } else if (!ACCOUNT_HOLDER_NAME_REGEX.test(formData.accountHolderName.trim())) {
      errors.push({ tab: "kyc", field: "accountHolderName", message: "Account holder name must contain only letters" })
    }

    if (formData.gstRegistered) {
      if (!formData.gstNumber?.trim()) {
        errors.push({ tab: "kyc", field: "gstNumber", message: "GSTIN is required when registered" })
      } else if (!GST_NUMBER_REGEX.test(formData.gstNumber.trim().toUpperCase())) {
        errors.push({ tab: "kyc", field: "gstNumber", message: "Invalid GSTIN format (15 characters)" })
      }
      if (!formData.gstLegalName?.trim()) {
        errors.push({ tab: "kyc", field: "gstLegalName", message: "GST Legal name is required" })
      } else if (!GST_LEGAL_NAME_REGEX.test(formData.gstLegalName.trim())) {
        errors.push({ tab: "kyc", field: "gstLegalName", message: "GST Legal name must contain only letters" })
      }
      if (!formData.gstAddress?.trim()) {
        errors.push({ tab: "kyc", field: "gstAddress", message: "GST Registered address is required" })
      }
      if (!formData.gstImage) {
        errors.push({ tab: "kyc", field: "gstImage", message: "GST certificate upload is required" })
      }
    }

    // 4. Documents & FSSAI validation
    if (!formData.fssaiNumber?.trim()) {
      errors.push({ tab: "docs", field: "fssaiNumber", message: "FSSAI number is required" })
    } else if (!FSSAI_NUMBER_REGEX.test(formData.fssaiNumber.trim())) {
      errors.push({ tab: "docs", field: "fssaiNumber", message: "FSSAI number must be exactly 14 digits" })
    }

    if (!formData.fssaiExpiry) {
      errors.push({ tab: "docs", field: "fssaiExpiry", message: "FSSAI expiry date is required" })
    } else {
      const today = new Date().toISOString().split("T")[0]
      if (formData.fssaiExpiry < today) {
        errors.push({ tab: "docs", field: "fssaiExpiry", message: "FSSAI expiry date cannot be in the past" })
      }
    }

    if (!formData.fssaiImage) {
      errors.push({ tab: "docs", field: "fssaiImage", message: "FSSAI copy upload is required" })
    }

    if (!formData.menuImages || formData.menuImages.length === 0) {
      errors.push({ tab: "docs", field: "menuImages", message: "At least one menu image is required" })
    }

    return errors
  }

  // Upload handler wrapper
  const uploadSingleFile = async (file, folder) => {
    if (!file) return null
    if (typeof file === "string") return { url: file } // already uploaded
    try {
      const res = await uploadAPI.uploadMedia(file, { folder })
      return res?.data?.data || res?.data || null
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Upload failed"
      throw new Error(errorMsg)
    }
  }

  // Save changes handler
  const handleSave = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      // Surface first error, shift to its corresponding tab
      const firstError = validationErrors[0]
      setActiveTab(firstError.tab)
      toast.error(firstError.message)
      return
    }

    try {
      setSaving(true)
      toast.info("Uploading images and updating profile...")

      // 1. Upload images in parallel
      const [profRes, panRes, gstRes, fssaiRes] = await Promise.all([
        uploadSingleFile(formData.profileImage, "food/restaurants/profile"),
        uploadSingleFile(formData.panImage, "food/restaurants/pan"),
        formData.gstRegistered
          ? uploadSingleFile(formData.gstImage, "food/restaurants/gst")
          : Promise.resolve(null),
        uploadSingleFile(formData.fssaiImage, "food/restaurants/fssai"),
      ])

      // 2. Upload menu images
      const menuImagesPayload = await Promise.all(
        formData.menuImages.map(async (img) => {
          if (img instanceof File || img instanceof Blob) {
            const res = await uploadSingleFile(img, "food/restaurants/menu")
            return res?.url || ""
          }
          return typeof img === "string" ? img : img?.url || ""
        })
      )

      // 3. Construct update payload
      const updatePayload = {
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        ownerPhone: formData.ownerPhone.trim(),
        profileImage: profRes?.url || "",

        restaurantName: formData.restaurantName.trim(),
        pureVegRestaurant: formData.pureVegRestaurant,
        primaryContactNumber: formData.primaryContactNumber.trim(),
        locationSource: formData.locationSource || "google_places",

        location: {
          placeId: formData.location.placeId || "",
          formattedAddress: formData.location.formattedAddress || "",
          addressLine1: formData.location.addressLine1.trim(),
          addressLine2: formData.location.addressLine2.trim(),
          area: formData.location.area.trim(),
          city: formData.location.city.trim(),
          state: formData.location.state.trim(),
          pincode: formData.location.pincode.trim(),
          landmark: formData.location.landmark.trim(),
          roadName: formData.location.roadName.trim(),
          latitude: formData.location.latitude ? parseFloat(formData.location.latitude) : null,
          longitude: formData.location.longitude ? parseFloat(formData.location.longitude) : null,
        },
        cuisines: formData.cuisines,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        openDays: formData.openDays,

        panNumber: formData.panNumber.trim().toUpperCase(),
        nameOnPan: formData.nameOnPan.trim(),
        panImage: panRes?.url || "",
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        accountHolderName: formData.accountHolderName.trim(),
        accountType: formData.accountType,
        gstRegistered: formData.gstRegistered,
        gstNumber: formData.gstRegistered ? formData.gstNumber.trim().toUpperCase() : "",
        gstLegalName: formData.gstRegistered ? formData.gstLegalName.trim() : "",
        gstAddress: formData.gstRegistered ? formData.gstAddress.trim() : "",
        gstImage: formData.gstRegistered ? gstRes?.url || "" : "",

        fssaiNumber: formData.fssaiNumber.trim(),
        fssaiExpiry: formData.fssaiExpiry,
        fssaiImage: fssaiRes?.url || "",
        menuImages: menuImagesPayload.filter(Boolean),
      }

      const response = await restaurantAPI.updateProfile(updatePayload)

      if (response?.data?.success || response?.data?.data) {
        toast.success("Profile details updated and submitted for approval")
        window.dispatchEvent(new Event("ownerDataUpdated"))
        setInitialData(JSON.parse(JSON.stringify(formData))) // update initial references
        goBack()
      } else {
        throw new Error(response?.data?.message || "Failed to save profile changes")
      }
    } catch (error) {
      console.error("Error saving profile details:", error)
      toast.error(error.message || "Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-restaurant-primary border-gray-200 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Loading profile details...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-28">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-50 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-gray-900">Edit Profile & Contact Details</h1>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              Restaurant Control Panel
            </span>
          </div>
        </div>

        {/* Tab Switcher - Horizontal scroll on mobile */}
        <div className="bg-white border-b border-gray-100 sticky top-[53px] z-40">
          <div className="flex overflow-x-auto scrollbar-none px-4 gap-5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "border-restaurant-primary text-restaurant-primary scale-105"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-restaurant-primary" : "text-gray-400"}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Container */}
        <div className="px-4 py-6 max-w-xl mx-auto space-y-6">
          {/* TAB 1: OWNER DETAILS */}
          {activeTab === "owner" && (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3">
                <Label className="text-xs font-bold text-gray-800 uppercase tracking-wide self-start">
                  Owner Profile Photo
                </Label>
                <div className="relative mt-2">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    {formData.profileImage ? (
                      <OptimizedImage
                        src={getPreviewUrl(formData.profileImage)}
                        alt="Owner Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  {formData.profileImage && (
                    <button
                      onClick={() => handleRemoveImage("profileImage")}
                      className="absolute -top-1 -right-1 bg-gradient-to-br from-restaurant-primary to-restaurant-secondary text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhotoClick("profileImage")}
                  className="mt-1 border-restaurant-primary text-restaurant-primary hover:bg-red-50 text-xs font-semibold px-4"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Choose Photo
                </Button>
              </div>

              {/* Name & Email Fields */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) =>
                        handleInputChange(
                          "ownerName",
                          formatNameToCapital(e.target.value.replace(/[^A-Za-z ]/g, ""))
                        )
                      }
                      placeholder="Enter owner full name"
                      className="w-full text-sm h-11 focus-visible:border-black focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Owner Email Address
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => handleInputChange("ownerEmail", e.target.value)}
                      placeholder="Enter owner email"
                      className="w-full text-sm h-11 focus-visible:border-black focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Input
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(e) =>
                        handleInputChange(
                          "ownerPhone",
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      placeholder="Enter 10-digit mobile number"
                      inputMode="numeric"
                      disabled={true}
                      className="w-full text-sm h-11 focus-visible:border-black focus-visible:ring-0 bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURANT INFO */}
          {activeTab === "restaurant" && (
            <div className="space-y-6">
              {/* General details */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">General Details</h3>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Restaurant Name
                  </label>
                  <Input
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => handleInputChange("restaurantName", e.target.value)}
                    placeholder="Enter restaurant name"
                    className="w-full text-sm h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Primary Contact Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.primaryContactNumber}
                    onChange={(e) => handleInputChange("primaryContactNumber", e.target.value)}
                    placeholder="Enter primary contact number"
                    className="w-full text-sm h-11"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wide">
                    Menu Type
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3">
                    This helps users filter restaurants by dietary preference.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange("pureVegRestaurant", true)}
                      className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-full border transition-all ${
                        formData.pureVegRestaurant === true
                          ? "bg-green-600 text-white border-green-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                      }`}
                    >
                      🥦 Yes, Pure Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("pureVegRestaurant", false)}
                      className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-full border transition-all ${
                        formData.pureVegRestaurant === false
                          ? "bg-gradient-to-br from-restaurant-primary to-restaurant-secondary text-white border-transparent shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:border-restaurant-primary"
                      }`}
                    >
                      🍖 No, Mixed Menu
                    </button>
                  </div>
                </div>


              </div>

              {/* Operational details */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Operation & Timings</h3>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-800" />
                        <span className="text-xs font-medium text-gray-900">Opening Time</span>
                      </div>
                      <MobileTimePicker
                        ampm={true}
                        value={stringToTime(formData.openingTime)}
                        onChange={(newValue) => {
                          if (!newValue) {
                            handleInputChange("openingTime", "")
                            return
                          }
                          const nextOpening = timeToString(newValue)
                          const closingMinutes = timeStringToMinutes(formData.closingTime)
                          const openingMinutes = timeStringToMinutes(nextOpening)
                          if (openingMinutes !== null && closingMinutes !== null) {
                            if (openingMinutes === closingMinutes) {
                              toast.error("Opening time and closing time cannot be same")
                              return
                            }
                            if (closingMinutes < openingMinutes) {
                              toast.error("Closing time cannot be less than opening time")
                              return
                            }
                          }
                          handleInputChange("openingTime", nextOpening)
                        }}
                        slotProps={{
                          textField: {
                            variant: "outlined",
                            size: "small",
                            placeholder: "Select time",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                height: "36px",
                                fontSize: "12px",
                                backgroundColor: "white",
                                "& fieldset": { borderColor: "#e5e7eb" },
                                "&:hover fieldset": { borderColor: "#d1d5db" },
                                "&.Mui-focused fieldset": { borderColor: "#000" },
                              },
                              "& .MuiInputBase-input": { padding: "8px 12px", fontSize: "12px" },
                            },
                          },
                        }}
                        format="hh:mm a"
                      />
                    </div>

                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-800" />
                        <span className="text-xs font-medium text-gray-900">Closing Time</span>
                      </div>
                      <MobileTimePicker
                        ampm={true}
                        value={stringToTime(formData.closingTime)}
                        onChange={(newValue) => {
                          if (!newValue) {
                            handleInputChange("closingTime", "")
                            return
                          }
                          const nextClosing = timeToString(newValue)
                          const openingMinutes = timeStringToMinutes(formData.openingTime)
                          const closingMinutes = timeStringToMinutes(nextClosing)
                          if (openingMinutes !== null && closingMinutes !== null) {
                            if (openingMinutes === closingMinutes) {
                              toast.error("Opening time and closing time cannot be same")
                              return
                            }
                            if (closingMinutes < openingMinutes) {
                              toast.error("Closing time cannot be less than opening time")
                              return
                            }
                          }
                          handleInputChange("closingTime", nextClosing)
                        }}
                        slotProps={{
                          textField: {
                            variant: "outlined",
                            size: "small",
                            placeholder: "Select time",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                height: "36px",
                                fontSize: "12px",
                                backgroundColor: "white",
                                "& fieldset": { borderColor: "#e5e7eb" },
                                "&:hover fieldset": { borderColor: "#d1d5db" },
                                "&.Mui-focused fieldset": { borderColor: "#000" },
                              },
                              "& .MuiInputBase-input": { padding: "8px 12px", fontSize: "12px" },
                            },
                          },
                        }}
                        format="hh:mm a"
                      />
                    </div>
                  </div>
                </LocalizationProvider>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wide flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-restaurant-primary" />
                    Operational Days
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {daysOfWeek.map((day) => {
                      const isActive = formData.openDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDayToggle(day)}
                          className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-restaurant-primary text-white shadow-sm"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                        >
                          {day.slice(0, 1)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 30-40 mins"
                    className="w-full text-sm h-11"
                  />
                </div>
              </div>

              {/* Cuisines Grid */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-gray-900">Cuisines Served</h3>
                  <span className="text-[10px] bg-restaurant-primary/10 text-restaurant-primary font-bold px-2 py-0.5 rounded">
                    MAX 8 SELECTED
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {ALL_CUISINES.map((cuisine) => {
                    const isSelected = formData.cuisines.includes(cuisine)
                    return (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => handleCuisineToggle(cuisine)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between border text-left transition-all ${
                          isSelected
                            ? "border-restaurant-primary bg-red-50/50 text-restaurant-primary"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{cuisine}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-restaurant-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESS */}
          {activeTab === "address" && (
            <div className="space-y-6">
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Address Details</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Use the same address selection flow as onboarding so route discovery can place the restaurant correctly on travel roads.
                  </p>
                </div>

                <div className="relative">
                  <Label className="text-xs text-gray-700">Search location</Label>
                  <div className="relative mt-1">
                    <Input
                      ref={locationSearchInputRef}
                      value={locationSearchValue}
                      onChange={(e) => {
                        isPlaceSelectedRef.current = false
                        setFormData((prev) => ({ ...prev, locationSource: "google_places" }))
                        setLocationSearchValue(e.target.value)
                      }}
                      onBlur={handleLocationSearchBlur}
                      className="bg-white text-sm"
                      placeholder="Search and select restaurant address..."
                      autoComplete="off"
                    />
                    {isSearchingLocation && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      </div>
                    )}
                  </div>

                  {locationPredictions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[999999] overflow-hidden max-h-60 overflow-y-auto">
                      {locationPredictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleLocationPredictionSelect(prediction)
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-orange-50 border-b border-gray-100 last:border-none"
                        >
                          <span className="block truncate">{prediction.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500 mt-1">
                    Search to auto-fill Area, City, State, Pincode and coordinates.
                  </p>
                </div>

                <div className="flex items-center my-2">
                  <hr className="flex-grow border-t border-gray-200" />
                  <span className="px-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">OR</span>
                  <hr className="flex-grow border-t border-gray-200" />
                </div>

                <div>
                  <Label className="text-xs text-gray-700">Google Maps Location Link (Optional)</Label>
                  <div className="relative mt-1">
                    <Input
                      value={mapsLinkValue}
                      onChange={handleMapsLinkChange}
                      className="bg-white text-sm pr-10"
                      placeholder="Paste Google Maps URL here"
                      disabled={isProcessingLink}
                    />
                    {isProcessingLink && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-restaurant-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    You can either search the restaurant above or paste a Google Maps location link.
                  </p>
                </div>

                {formData.locationSource && (
                  <div className="mt-1 text-xs flex items-center gap-1.5 font-medium text-slate-600 bg-slate-50/70 border border-slate-100 rounded px-2.5 py-1.5 w-fit">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Location Source:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      formData.locationSource === "google_maps_link"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {formData.locationSource === "google_maps_link" ? "Google Maps Link" : "Google Search"}
                    </span>
                  </div>
                )}

                <Input
                  value={formData.location?.addressLine1 || ""}
                  onChange={(e) => handleLocationChange("addressLine1", e.target.value)}
                  className="bg-white text-sm"
                  placeholder="Shop no. / building no. (optional)"
                />
                <Input
                  value={formData.location?.addressLine2 || ""}
                  onChange={(e) => handleLocationChange("addressLine2", e.target.value)}
                  className="bg-white text-sm"
                  placeholder="Floor / tower (optional)"
                />
                <Input
                  value={formData.location?.landmark || ""}
                  onChange={(e) => handleLocationChange("landmark", e.target.value)}
                  className="bg-white text-sm"
                  placeholder="Nearby landmark (optional)"
                />
                <Input
                  value={formData.location?.area || ""}
                  onChange={(e) => handleLocationChange("area", e.target.value)}
                  className="bg-white text-sm"
                  placeholder="Area / Sector / Locality*"
                />
                <Select
                  value={formData.location?.city || ""}
                  onValueChange={(value) => handleLocationChange("city", value)}
                >
                  <SelectTrigger className="bg-white text-sm text-gray-700">
                    <SelectValue placeholder="Select City*" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indore">Indore</SelectItem>
                    <SelectItem value="Bhopal">Bhopal</SelectItem>
                    <SelectItem value="Gwalior">Gwalior</SelectItem>
                    <SelectItem value="Jabalpur">Jabalpur</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Ahmedabad">Ahmedabad</SelectItem>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="Chennai">Chennai</SelectItem>
                    <SelectItem value="Kolkata">Kolkata</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={formData.location?.state || ""}
                    onChange={(e) => handleLocationChange("state", e.target.value)}
                    className="bg-white text-sm"
                    placeholder="State"
                  />
                  <Input
                    value={formData.location?.pincode || ""}
                    onChange={(e) => handleLocationChange("pincode", normalizePincode(e.target.value))}
                    className="bg-white text-sm"
                    placeholder="Pincode"
                  />
                </div>

                <p className="text-[11px] text-gray-500 mt-1">
                  Please ensure that this address is the same as mentioned on your FSSAI license.
                </p>
              </section>

              <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{HIGHWAY_DETECTION_COPY.sectionTitle}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    We auto-detect the nearest NH or SH from the selected address. You can point the location on the map and refine the saved road label if needed.
                  </p>
                </div>

                {(highwayInfo.loading || highwayInfo.status) && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      highwayInfo.loading
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : highwayInfo.status === "IN_SERVICE"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {highwayInfo.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                        <span>{HIGHWAY_DETECTION_COPY.checking}</span>
                      </div>
                    ) : highwayInfo.status === "IN_SERVICE" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{HIGHWAY_DETECTION_COPY.success}</span>
                        </div>
                        <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                          <p>{HIGHWAY_DETECTION_COPY.nearestLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                          {highwayInfo.highwayName && <p>{HIGHWAY_DETECTION_COPY.roadLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                          {Number.isFinite(Number(highwayInfo.distanceMeters)) && <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>{HIGHWAY_DETECTION_COPY.error}</span>
                        </div>
                        {highwayInfo.highwayRef && (
                          <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                            <p>{HIGHWAY_DETECTION_COPY.nearestLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                            {highwayInfo.highwayName && <p>{HIGHWAY_DETECTION_COPY.roadLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>}
                            {Number.isFinite(Number(highwayInfo.distanceMeters)) && <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {Number.isFinite(Number(formData.location?.latitude)) && Number.isFinite(Number(formData.location?.longitude)) && (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Pin preview</p>
                        <p className="text-[11px] text-gray-500">Tap on the map or drag the pin to save the exact restaurant coordinates.</p>
                      </div>
                      <MapPin className="h-4 w-4 text-restaurant-primary" />
                    </div>
                    <div ref={pinMapContainerRef} className="h-[220px] w-full" />
                    <div className="border-t border-gray-200 bg-white px-4 py-2 text-[11px] text-gray-600 space-y-1">
                      <div>
                        Coordinates saved: <span className="font-semibold text-gray-900">{Number(formData.location?.latitude).toFixed(6)}, {Number(formData.location?.longitude).toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-700">Road / Highway name*</Label>
                  <Input
                    value={formData.location?.roadName || ""}
                    onChange={(e) => {
                      setIsRoadNameDirty(true)
                      handleLocationChange("roadName", e.target.value)
                    }}
                    className="mt-1 bg-white text-sm"
                    placeholder="Auto-detected road / highway"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    This is auto-filled from the detected NH / SH and you can still edit it to match the exact road shown on the pin.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: BANK & KYC */}
          {activeTab === "kyc" && (
            <div className="space-y-6">
              {/* PAN details */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">PAN Card Information</h3>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    PAN Card Number
                  </label>
                  <Input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())}
                    placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)"
                    maxLength={10}
                    className="w-full text-sm h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Name on PAN Card
                  </label>
                  <Input
                    type="text"
                    value={formData.nameOnPan}
                    onChange={(e) => handleInputChange("nameOnPan", e.target.value)}
                    placeholder="Enter exact name on PAN card"
                    className="w-full text-sm h-11"
                  />
                </div>

                {/* PAN Image */}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center gap-3">
                  <Label className="text-xs font-semibold text-gray-600 self-start">
                    PAN Card Upload
                  </Label>
                  {formData.panImage ? (
                    <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                      <OptimizedImage
                        src={getPreviewUrl(formData.panImage)}
                        alt="PAN Copy"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage("panImage")}
                        className="absolute top-1.5 right-1.5 bg-restaurant-primary text-white rounded-full p-1 shadow-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-1" />
                      <span className="text-[11px] text-gray-500">No document uploaded</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhotoClick("panImage")}
                    className="w-full border-gray-300 text-gray-700 bg-white"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload PAN
                  </Button>
                </div>
              </div>

              {/* Bank Account */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Bank Account Info</h3>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Account Holder Name
                  </label>
                  <Input
                    type="text"
                    value={formData.accountHolderName}
                    onChange={(e) =>
                      handleInputChange(
                        "accountHolderName",
                        formatNameToCapital(e.target.value.replace(/[^A-Za-z ]/g, ""))
                      )
                    }
                    placeholder="Name as in bank records"
                    className="w-full text-sm h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Bank Account Number
                  </label>
                  <Input
                    type="password"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      handleInputChange("accountNumber", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter account number"
                    className="w-full text-sm h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Confirm Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.confirmAccountNumber}
                    onChange={(e) =>
                      handleInputChange("confirmAccountNumber", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Re-enter account number"
                    className="w-full text-sm h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                      IFSC Code
                    </label>
                    <Input
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => handleInputChange("ifscCode", e.target.value.toUpperCase())}
                      placeholder="11-digit IFSC"
                      maxLength={11}
                      className="w-full text-sm h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                      Account Type
                    </label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(val) => handleInputChange("accountType", val)}
                    >
                      <SelectTrigger className="w-full text-sm h-11 bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Saving">Saving</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* GST details */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-gray-900">GST Registration</h3>
                  <button
                    type="button"
                    onClick={() => handleInputChange("gstRegistered", !formData.gstRegistered)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.gstRegistered ? "bg-restaurant-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.gstRegistered ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {formData.gstRegistered && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                        GSTIN (GST Number)
                      </label>
                      <Input
                        type="text"
                        value={formData.gstNumber}
                        onChange={(e) =>
                          handleInputChange("gstNumber", e.target.value.toUpperCase())
                        }
                        placeholder="e.g. 22AAAAA1111A1Z1"
                        maxLength={15}
                        className="w-full text-sm h-11"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                        GST Legal Business Name
                      </label>
                      <Input
                        type="text"
                        value={formData.gstLegalName}
                        onChange={(e) => handleInputChange("gstLegalName", e.target.value)}
                        placeholder="Legal firm / business name"
                        className="w-full text-sm h-11"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                        GST Registered Address
                      </label>
                      <Input
                        type="text"
                        value={formData.gstAddress}
                        onChange={(e) => handleInputChange("gstAddress", e.target.value)}
                        placeholder="Registered business address"
                        className="w-full text-sm h-11"
                      />
                    </div>

                    {/* GST Image */}
                    <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center gap-3">
                      <Label className="text-xs font-semibold text-gray-600 self-start">
                        GST Registration Copy
                      </Label>
                      {formData.gstImage ? (
                        <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                          <OptimizedImage
                            src={getPreviewUrl(formData.gstImage)}
                            alt="GST Copy"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveImage("gstImage")}
                            className="absolute top-1.5 right-1.5 bg-restaurant-primary text-white rounded-full p-1 shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-4">
                          <ImageIcon className="w-10 h-10 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500">No document uploaded</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePhotoClick("gstImage")}
                        className="w-full border-gray-300 text-gray-700 bg-white"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload GST Certificate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS & FSSAI */}
          {activeTab === "docs" && (
            <div className="space-y-6">
              {/* FSSAI license details */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">
                  FSSAI License details
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    FSSAI License Number
                  </label>
                  <Input
                    type="text"
                    value={formData.fssaiNumber}
                    onChange={(e) =>
                      handleInputChange("fssaiNumber", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 14-digit license number"
                    maxLength={14}
                    className="w-full text-sm h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.fssaiExpiry}
                    onChange={(e) => handleInputChange("fssaiExpiry", e.target.value)}
                    className="w-full text-sm h-11 bg-white border border-gray-200 rounded-lg px-3 focus-visible:outline-none focus-visible:border-black"
                  />
                </div>

                {/* FSSAI Image */}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center gap-3">
                  <Label className="text-xs font-semibold text-gray-600 self-start">
                    FSSAI Copy Upload
                  </Label>
                  {formData.fssaiImage ? (
                    <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                      <OptimizedImage
                        src={getPreviewUrl(formData.fssaiImage)}
                        alt="FSSAI Copy"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage("fssaiImage")}
                        className="absolute top-1.5 right-1.5 bg-restaurant-primary text-white rounded-full p-1 shadow-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-1" />
                      <span className="text-[11px] text-gray-500">No document uploaded</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhotoClick("fssaiImage")}
                    className="w-full border-gray-300 text-gray-700 bg-white"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload FSSAI License
                  </Button>
                </div>
              </div>

              {/* Menu Images Grid */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-gray-900">Menu & Photos</h3>
                  <span className="text-[10px] bg-blue-50 text-restaurant-primary font-bold px-2 py-0.5 rounded">
                    {formData.menuImages.length} / 10 PHOTOS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {formData.menuImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                    >
                      <OptimizedImage
                        src={getPreviewUrl(img)}
                        alt={`Menu photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage("menuImages", idx)}
                        className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {formData.menuImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => handlePhotoClick("menuImages")}
                      className="aspect-[4/3] rounded-xl border border-dashed border-gray-300 hover:border-restaurant-primary bg-gray-50/70 hover:bg-red-50/10 flex flex-col items-center justify-center gap-1.5 transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-gray-200">
                        <ImageIcon className="w-4.5 h-4.5 text-gray-600" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                        Add Menu Photo
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save/Update Button fixed bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-40">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading || saving}
            className="w-full py-3 h-12 text-sm font-bold tracking-wide rounded-xl shadow-lg transition-all bg-gradient-to-r from-restaurant-primary to-restaurant-secondary text-white shadow-[0_8px_20px_rgba(184,11,61,0.3)] disabled:opacity-50 disabled:shadow-none hover:from-[#A10935] hover:to-[#4F0016] active:scale-[0.98]"
          >
            {saving ? "Uploading & Saving details..." : "Save Profile Details"}
          </Button>
        </div>
      </div>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handlePhotoSelect}
        title={`Upload ${
          activeImageField === "profileImage"
            ? "Owner photo"
            : activeImageField === "panImage"
            ? "PAN copy"
            : activeImageField === "gstImage"
            ? "GST copy"
            : activeImageField === "fssaiImage"
            ? "FSSAI copy"
            : "Menu photo"
        }`}
        description="Choose file from gallery or snap with camera"
        fileNamePrefix={`${activeImageField || "photo"}`}
        galleryInputRef={fileInputRef}
      />
    </>
  )
}
