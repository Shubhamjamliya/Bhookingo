import { Link, useLocation as useRouteLocation } from "react-router-dom"
import { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, ShoppingCart, Wallet, User } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { useLocation } from "@food/hooks/useLocation"
import { useCart } from "@food/context/CartContext"
import { useLocationSelector } from "./UserLayout"
import { FaLocationDot } from "react-icons/fa6"
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings"
import bhookingoLogo from "@backend-uploads/logos/2026/07/e997aea1-c104-473d-9491-2b471c01f36f.webp"
import { Avatar, AvatarFallback, AvatarImage } from "@food/components/ui/avatar"
import { useProfile } from "@food/context/ProfileContext"
import { isModuleAuthenticated } from "@food/utils/auth"

export default function PageNavbar({
  textColor = "white",
  zIndex = 20,
  showProfile = false,
  showLogo = true,
  showCart = true,
  showWallet = true,
  onNavClick,
  variant = "default" // "default", "reddish", or "transparent"
}) {
  const routerLocation = useRouteLocation()
  const { userProfile } = useProfile()
  const { location, loading, requestLocation } = useLocation()
  const { getCartCount } = useCart()
  const { openLocationSelector } = useLocationSelector()
  const cartCount = getCartCount()
  const [logoUrl, setLogoUrl] = useState(null)
  const [companyName, setCompanyName] = useState(null)
  const autoLocationAttemptedRef = useRef(false)
  const requestLocationRef = useRef(requestLocation)
  const enableLocationDebugLogs = true
  const debugLog = (...args) => {
    if (enableLocationDebugLogs && import.meta.env.DEV) {
      console.log("[PageNavbar]", ...args)
    }
  }

  useEffect(() => {
    requestLocationRef.current = requestLocation
  }, [requestLocation])

  // Auto-trigger location fetch once when location is missing/placeholder and permission is already granted.
  useEffect(() => {
    if (autoLocationAttemptedRef.current || loading || !requestLocationRef.current) return

    // If we already have stored coordinates, do not auto-geocode again.
    // We only update location when the user changes it manually.
    try {
      const storedRaw = localStorage.getItem("userLocation")
      const stored = storedRaw ? JSON.parse(storedRaw) : null
      const lat = Number(stored?.latitude)
      const lng = Number(stored?.longitude)
      const hasStoredCoords = Number.isFinite(lat) && Number.isFinite(lng)
      if (hasStoredCoords) return
    } catch {
      // ignore parsing errors and continue to auto-fetch as fallback for first open
    }

    const hasMissingOrPlaceholderLocation =
      !location ||
      location.formattedAddress === "Select location" ||
      location.city === "Current Location"

    if (!hasMissingOrPlaceholderLocation) return
    // Reserve a single background attempt to avoid repeated checks on re-renders.
    autoLocationAttemptedRef.current = true

    let cancelled = false
    const timeoutId = setTimeout(async () => {
      try {
        let isGranted = false
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' })
          isGranted = result.state === 'granted'
        }

        if (!isGranted) {
          debugLog("?? Geolocation permission not granted; waiting for user action")
          return
        }
        const fetchedLocation = await requestLocationRef.current()
        if (cancelled) return

        if (fetchedLocation &&
          fetchedLocation.formattedAddress !== "Select location" &&
          fetchedLocation.city !== "Current Location") {
          debugLog("? Location fetched successfully:", fetchedLocation)
        } else {
          debugLog("Location fetch returned placeholder, user may need to select manually")
        }
      } catch (err) {
        if (!cancelled) {
          debugLog("Location fetch failed:", err)
        }
      }
    }, 1200)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [location, loading])

  // Reset one-time auto-attempt if location becomes valid, so future invalid states can retry.
  useEffect(() => {
    if (location &&
      location.formattedAddress !== "Select location" &&
      location.city !== "Current Location") {
      autoLocationAttemptedRef.current = false
    }
  }, [location])

  // Load business settings logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // First check cache
        let cached = getCachedSettings()
        if (cached) {
          if (cached.logo?.url) {
            setLogoUrl(cached.logo.url)
          }
          if (cached.companyName) {
            setCompanyName(cached.companyName)
          }
        }

        // Always try to load fresh data to ensure we have the latest
        const settings = await loadBusinessSettings()
        if (settings) {
          if (settings.logo?.url) {
            setLogoUrl(settings.logo.url)
          }
          if (settings.companyName) {
            setCompanyName(settings.companyName)
          }
        }
      } catch (error) {
        debugError('Error loading logo:', error)
      }
    }

    // Load immediately
    loadLogo()

    // Listen for business settings updates
    const handleSettingsUpdate = () => {
      const cached = getCachedSettings()
      if (cached) {
        if (cached.logo?.url) {
          setLogoUrl(cached.logo.url)
        }
        if (cached.companyName) {
          setCompanyName(cached.companyName)
        }
      }
    }
    window.addEventListener('businessSettingsUpdated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('businessSettingsUpdated', handleSettingsUpdate)
    }
  }, [])

  // Function to extract location parts for display
  // Main location: First 2 parts only (e.g., "Mama Loca, G-2")
  // Sub location: City and State (e.g., "New Palasia, Indore")
  const getLocationDisplay = (fullAddress, city, state, area) => {
    if (!fullAddress) {
      // Fallback: Use area and city/state if available
      if (area) {
        return {
          main: area,
          sub: city && state ? `${city}, ${state}` : city || state || ""
        }
      }
      if (city) {
        return {
          main: city,
          sub: state || ""
        }
      }
      return { main: "Select location", sub: "" }
    }

    // Split address by comma
    const parts = fullAddress.split(',').map(part => part.trim()).filter(part => part.length > 0)

    // Main location: First 2 parts only (e.g., "Mama Loca, G-2")
    let mainLocation = ""
    if (parts.length >= 2) {
      mainLocation = parts.slice(0, 2).join(', ')
    } else if (parts.length >= 1) {
      mainLocation = parts[0]
    }

    // Sub location: City and State (prefer from location object, fallback to address parts)
    let subLocation = ""
    if (city && state) {
      subLocation = `${city}, ${state}`
    } else if (city) {
      subLocation = city
    } else if (state) {
      subLocation = state
    }

    return {
      main: mainLocation || "Select location",
      sub: subLocation
    }
  }
  // Get display location parts
  // Priority: formattedAddress (complete) > address > area/city
  // IMPORTANT: Sub location ALWAYS uses city and state from location object, never from address parts
  const locationDisplay = useMemo(() => {
    const isCoordinates = (str) => {
      if (!str) return false
      return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(str.trim())
    }

    let areaDisplay = location?.area && location.area.trim() !== "" && location.area !== "Select location"
      ? location.area.trim()
      : ""

    if (!areaDisplay && location?.address && !isCoordinates(location.address) && location.address !== "Select location") {
      const parts = location.address.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length > 0 && parts[0].toLowerCase() !== location?.city?.toLowerCase()) {
        areaDisplay = parts[0]
      }
    }

    if (!areaDisplay && location?.formattedAddress && !isCoordinates(location.formattedAddress) && location.formattedAddress !== "Select location") {
      const parts = location.formattedAddress.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length > 0) {
        areaDisplay = parts[0]
      }
    }

    if (!areaDisplay) {
      areaDisplay = location?.city || "Select Location"
    }

    const cityDisplay = location?.city || ""
    const fullAddressDisplay = location?.address || location?.formattedAddress || ""

    return {
      area: areaDisplay,
      city: cityDisplay,
      address: fullAddressDisplay
    }
  }, [location])

  const { area: areaName, city: cityName, address: fullAddress } = locationDisplay
  const savedAddressLabel = useMemo(() => {
    if (location?.label && String(location.label).trim()) {
      return String(location.label).trim()
    }
    try {
      const stored = localStorage.getItem("userLocation")
      if (!stored) return ""
      const parsed = JSON.parse(stored)
      return parsed?.label && String(parsed.label).trim() ? String(parsed.label).trim() : ""
    } catch {
      return ""
    }
  }, [location?.label])

  const displayArea = useMemo(() => {
    let name = areaName || "Select Location"
    if (/^-?\d+(\.\d+)?$/.test(name.trim())) {
      return "Current Location"
    }
    return name
  }, [areaName])

  const displayAddress = useMemo(() => {
    if (savedAddressLabel) return `Delivering to ${savedAddressLabel}`
    
    let addr = fullAddress || ""
    if (cityName) {
      addr = addr.replace(new RegExp(`,?\\s*${cityName}\\s*`, 'gi'), '').trim()
    }
    if (areaName && areaName.length > 3) {
      addr = addr.replace(new RegExp(`^${areaName},?\\s*`, 'i'), '').trim()
    }
    if (/^-?\d+\.\d+,\s*-?\\s*\d+\.\d+$/.test(fullAddress.trim()) || /^-?\d+\.\d+,\s*-?\\s*\d+\.\d+$/.test(addr.trim()) || !addr || addr === ",") {
      return "Pinpoint location"
    }
    return addr
  }, [fullAddress, cityName, areaName, savedAddressLabel])
  const displayCity = cityName

  const handleLocationClick = () => {
    // Open location selector overlay
    openLocationSelector()
  }

  const isReddish = variant === "reddish"
  const isTransparent = variant === "transparent"
  const finalTextColorClass = (isReddish || isTransparent) ? "text-[#1a1a1a]" : (textColor === "white" ? "text-white" : "text-[var(--primary)]")
  const finalIconColor = (isReddish || isTransparent) ? "text-[#1a1a1a]" : (textColor === "white" ? "text-white" : "text-[var(--primary)]")
  
  const initials = useMemo(() => {
    if (!userProfile) return ""
    const name = userProfile.firstName || userProfile.name || ""
    return name[0]?.toUpperCase() || "U"
  }, [userProfile])

  const zIndexClass = zIndex === 50 ? "z-50" : "z-20"

  return (
    <nav
      className={`relative ${zIndexClass} w-full px-3 sm:px-4 md:px-6 lg:px-8 py-0.5 sm:py-1 transition-all duration-300 ${isReddish ? "bg-gradient-to-r from-white via-[#f8fafc] to-white shadow-sm border-b border-border" : (variant === "transparent" ? "bg-transparent shadow-none" : "bg-transparent shadow-none")} border-0`}
      onClick={onNavClick}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">

        {/* Left: Company Logo */}
        {showLogo && (
          <Link to="/food/user" className="flex-shrink-0 mr-3 sm:mr-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName || "Company Logo"}
                className="h-9 w-auto sm:h-12 md:h-14 object-contain scale-[1.6] sm:scale-[1.8] origin-left"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : companyName ? (
              <span className={`text-lg font-bold ${finalTextColorClass}`}>
                {companyName}
              </span>
            ) : (
              <img
                src={bhookingoLogo}
                alt="Logo"
                className="h-9 w-auto sm:h-12 md:h-14 object-contain scale-[1.6] sm:scale-[1.8] origin-left"
              />
            )}
          </Link>
        )}

        {/* Center/Left: Location Selector */}
        <div className={`flex-1 flex items-center ${(isReddish || isTransparent) ? "justify-start" : "justify-center absolute left-1/2 -translate-x-1/2"} min-w-0`}>
          <Button
            variant="ghost"
            onClick={handleLocationClick}
            disabled={loading}
            className={`h-auto px-0 py-0 hover:bg-transparent transition-colors flex-shrink-0 ${(isReddish || isTransparent) ? "flex items-center gap-1.5" : ""}`}
          >
            {loading ? (
              <span className={`text-sm font-bold ${finalTextColorClass}`}>
                Loading...
              </span>
            ) : (
              <div className={`flex flex-col ${(isReddish || isTransparent) ? "items-start" : "items-center"} min-w-0`}>
                <div className="flex items-center justify-start gap-1">
                  <span className={`text-[15px] sm:text-[17px] font-black ${finalTextColorClass} truncate max-w-[140px] sm:max-w-[200px] leading-none`}>
                    {displayArea}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${finalIconColor} flex-shrink-0`} strokeWidth={3.5} />
                </div>
                {(displayAddress || displayCity) && (
                  <span className={`text-[10px] sm:text-[12px] font-bold text-text-secondary truncate max-w-[140px] sm:max-w-[200px] ${(isReddish || isTransparent) ? "text-left" : "text-center"} leading-tight mt-0.5`}>
                    {displayAddress}{displayAddress && displayCity ? ", " : ""}{displayCity}
                  </span>
                )}
              </div>
            )}
          </Button>
        </div>

        {/* Right: Actions (Wallet & Cart) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          {showWallet && (
            <Link 
              to="/food/user/wallet" 
              state={{ from: routerLocation.pathname }}
              onClick={(e) => {
                if (!isModuleAuthenticated('user')) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('show-login-required'));
                }
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 hover:opacity-80 transition-opacity"
                title="Wallet"
              >
                <div className={`h-full w-full rounded-full ${(isReddish || isTransparent) ? (isTransparent ? "bg-gradient-to-br from-[var(--primary-light)] via-[var(--primary)] to-[var(--primary-dark)] shadow-sm" : "bg-surface shadow-sm") : "bg-white/10"} flex items-center justify-center border ${(isReddish || isTransparent) ? (isTransparent ? "border-white/10" : "border-border/50") : "border-white/20"}`}>
                  <Wallet className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${isTransparent ? "text-white" : finalIconColor}`} strokeWidth={2.5} />
                </div>
              </Button>
            </Link>
          )}

          {showCart && (
            <Link to="/food/user/cart" state={{ from: routerLocation.pathname }}>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 hover:opacity-80 transition-opacity"
                title="Cart"
              >
                <div className={`h-full w-full rounded-full ${(isReddish || isTransparent) ? "bg-surface shadow-sm" : "bg-white/10"} flex items-center justify-center border ${(isReddish || isTransparent) ? "border-border/50" : "border-white/20"}`}>
                  <ShoppingCart className={`h-5 w-5 sm:h-6 sm:w-6 ${finalIconColor}`} strokeWidth={2.5} />
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-[10px] font-bold h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1a1a]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          {showProfile && (
            <Link 
              to="/food/user/profile" 
              state={{ from: routerLocation.pathname }}
              onClick={(e) => {
                if (!isModuleAuthenticated('user')) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('show-login-required'));
                }
              }}
            >
              <Avatar className="h-9 w-9 rounded-full border border-white transition-all active:scale-95 shadow-none overflow-hidden cursor-pointer transform-gpu translate-z-0">
                <AvatarImage 
                  src={userProfile?.profileImage?.url || userProfile?.profileImage} 
                  alt="Profile" 
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white font-bold text-sm uppercase">
                  {(userProfile?.name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}



