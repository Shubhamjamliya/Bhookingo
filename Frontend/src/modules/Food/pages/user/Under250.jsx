import { Link, useNavigate } from "react-router-dom"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Star, Clock, MapPin, ArrowDownUp, Timer, ArrowRight, ChevronDown, Bookmark, Share2, Plus, Minus, X, UtensilsCrossed, Wallet, ShieldCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Card, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { useLocationSelector } from "@food/components/user/UserLayout"
import { useLocation } from "@food/hooks/useLocation"
import { useHighway as useZone } from "@food/hooks/useHighway"
import { useCart } from "@food/context/CartContext"
import PageNavbar from "@food/components/user/PageNavbar"
import { useProfile } from "@food/context/ProfileContext"
import { Avatar, AvatarFallback, AvatarImage } from "@food/components/ui/avatar"
import { getRestaurantAvailabilityStatus } from "@food/utils/restaurantAvailability"
import under250Banner from "@food/assets/under250_banner.jpg"
import homeBannerRed from "@food/assets/home-banner-red-clean.png"
import AddToCartAnimation from "@food/components/user/AddToCartAnimation"
import OptimizedImage from "@food/components/OptimizedImage"
import api from "@food/api"
import { restaurantAPI, adminAPI } from "@food/api"
import { isModuleAuthenticated } from "@food/utils/auth"
import { flattenMenuItems, getMenuFromResponse } from "@food/utils/menuItems"
import { calculateDistance, formatDistance, checkRestaurantBookingEligibility } from "@food/utils/common"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}
const RUPEE_SYMBOL = "\u20B9"
const UNDER_250_FILTERS_STORAGE_KEY = "food-under-250-filters"

const readUnder250Filters = () => {
  if (typeof window === "undefined") {
    return {
      selectedSort: null,
      activeCategory: null,
      under30MinsFilter: false,
    }
  }

  try {
    const raw = window.localStorage.getItem(UNDER_250_FILTERS_STORAGE_KEY)
    if (!raw) {
      return {
        selectedSort: null,
        activeCategory: null,
        under30MinsFilter: false,
      }
    }

    const parsed = JSON.parse(raw)
    return {
      selectedSort: typeof parsed?.selectedSort === "string" ? parsed.selectedSort : null,
      activeCategory: typeof parsed?.activeCategory === "string" ? parsed.activeCategory : null,
      under30MinsFilter: parsed?.under30MinsFilter === true,
    }
  } catch {
    return {
      selectedSort: null,
      activeCategory: null,
      under30MinsFilter: false,
    }
  }
}


export default function Under250() {
  const initialFiltersRef = useRef(readUnder250Filters())
  const { location } = useLocation()
  const { zoneId, zoneStatus, isInService, isOutOfService } = useZone(location)
  const { showGlobalLoader, openLocationSelector } = useLocationSelector()
  const { userProfile } = useProfile()

  const displayArea = useMemo(() => {
    let name = location?.area || location?.city || "Current Location"
    if (/^-?\d+(\.\d+)?$/.test(name.trim())) {
      return "Current Location"
    }
    return name
  }, [location?.area, location?.city])

  const displayCity = location?.city || "Indore"
  const displayAddress = useMemo(() => {
    let addr = location?.address || location?.formattedAddress || ""
    if (displayCity) {
      addr = addr.replace(new RegExp(`,?\\s*${displayCity}\\s*`, 'gi'), '').trim()
    }
    if (location?.area && location?.area.length > 3) {
      addr = addr.replace(new RegExp(`^${location?.area},?\\s*`, 'i'), '').trim()
    }
    if (/^-?\d+\.\d+,\s*-?\\s*\d+\.\d+$/.test(addr.trim()) || !addr || addr === ",") {
      return "Pinpoint location"
    }
    return addr
  }, [location?.address, location?.formattedAddress, displayCity, location?.area])

  const navigate = useNavigate()
  const { addToCart, updateQuantity, removeFromCart, getCartItem, cart } = useCart()
  const [activeCategory, setActiveCategory] = useState(initialFiltersRef.current.activeCategory)
  const [showSortPopup, setShowSortPopup] = useState(false)
  const [selectedSort, setSelectedSort] = useState(initialFiltersRef.current.selectedSort)
  const [draftSelectedSort, setDraftSelectedSort] = useState(initialFiltersRef.current.selectedSort)
  const [under30MinsFilter, setUnder30MinsFilter] = useState(initialFiltersRef.current.under30MinsFilter)
  const [showItemDetail, setShowItemDetail] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemDetailQuantity, setItemDetailQuantity] = useState(1)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [quantities, setQuantities] = useState({})
  const [bookmarkedItems, setBookmarkedItems] = useState(new Set())
  const [viewCartButtonBottom, setViewCartButtonBottom] = useState("bottom-[92px]")
  const lastScrollY = useRef(0)
  const scrollLockYRef = useRef(0)
  const itemDetailContentRef = useRef(null)
  const itemDetailGestureRef = useRef({
    startY: 0,
    dragging: false,
  })
  const [categories, setCategories] = useState([])
  const [bannerImages, setBannerImages] = useState([])
  const [loadingBanner, setLoadingBanner] = useState(true)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [under250Restaurants, setUnder250Restaurants] = useState([])
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [hasScrolledPastBanner, setHasScrolledPastBanner] = useState(false)
  const [under250PriceLimit, setUnder250PriceLimit] = useState(250)
  const bannerShellRef = useRef(null)
  const stickyHeaderRef = useRef(null)
  const autoSlideIntervalRef = useRef(null)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  const touchEndXRef = useRef(0)
  const touchEndYRef = useRef(0)
  const isBannerSwipingRef = useRef(false)

  const sortOptions = [
    { id: null, label: 'Relevance' },
    { id: 'rating-high', label: 'Rating: High to Low' },
    { id: 'distance-low', label: 'Distance: Low to High' },
  ]

  const handleClearAll = () => {
    setSelectedSort(null)
    setDraftSelectedSort(null)
    setUnder30MinsFilter(false)
    setActiveCategory(null)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(UNDER_250_FILTERS_STORAGE_KEY)
    }
  }

  const handleApply = () => {
    setSelectedSort(draftSelectedSort)
    setShowSortPopup(false)
  }



  // Helper function to parse distance (e.g., "0.4 km" -> 0.4)
  const parseDistance = (distance) => {
    if (typeof distance === "number" && Number.isFinite(distance)) return distance
    if (!distance) return 999 // Default high value for sorting
    const value = String(distance)
    const match = value.match(/(\d+\.?\d*)/)
    if (match) {
      const numericValue = parseFloat(match[1])
      return value.toLowerCase().includes("m") && !value.toLowerCase().includes("km")
        ? numericValue / 1000
        : numericValue
    }
    return 999
  }

  // Sort and filter restaurants based on selected sort and filters
  const sortedAndFilteredRestaurants = useMemo(() => {
    let filtered = under250Restaurants.map(r => ({ ...r, menuItems: [...(r.menuItems || [])] }))

    // Apply category filter
    if (activeCategory) {
      const selectedCat = categories.find(cat => cat.id === activeCategory)
      if (selectedCat) {
        const catNameLower = selectedCat.name.toLowerCase()
        filtered = filtered.map(restaurant => {
          const matches = restaurant.menuItems.filter(item => 
            (item.category || "").toLowerCase() === catNameLower ||
            (item.sectionName || "").toLowerCase() === catNameLower ||
            (item.subsectionName || "").toLowerCase() === catNameLower
          )
          if (matches.length > 0) {
            return { ...restaurant, menuItems: matches }
          }
          return null
        }).filter(Boolean)
      }
    }

    // Apply "Under 30 mins" filter
    if (under30MinsFilter) {
      filtered = filtered.filter(restaurant => {
      })
    }

    // Apply sorting
    if (selectedSort === 'rating-high') {
      filtered.sort((a, b) => {
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingB !== ratingA) {
          return ratingB - ratingA
        }
        // Secondary sort by number of dishes
        return (b.menuItems?.length || 0) - (a.menuItems?.length || 0)
      })

    } else if (selectedSort === 'distance-low') {
      filtered.sort((a, b) => {
        const distA = Number.isFinite(a.distanceInKm) ? a.distanceInKm : parseDistance(a.distance)
        const distB = Number.isFinite(b.distanceInKm) ? b.distanceInKm : parseDistance(b.distance)
        if (distA !== distB) {
          return distA - distB
        }
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0)
        }
        return (a.originalIndex || 0) - (b.originalIndex || 0)
      })
    } else {
      // Default: Relevance (keep original order from backend - already sorted by rating)
      // No additional sorting needed
    }

    return filtered
  }, [under250Restaurants, selectedSort, under30MinsFilter, activeCategory, categories])

  // Fetch under-50 banner from public API
  useEffect(() => {
    let cancelled = false
    setLoadingBanner(true)
    api.get('/food/hero-banners/under-250/public')
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data
        const list = Array.isArray(data?.banners) ? data.banners : (Array.isArray(data) ? data : [])
        const images = list
          .map((banner) => (typeof banner?.imageUrl === "string" ? banner.imageUrl.trim() : ""))
          .filter(Boolean)
        setBannerImages(images)
      })
      .catch(() => {
        if (!cancelled) setBannerImages([])
      })
      .finally(() => {
        if (!cancelled) setLoadingBanner(false)
      })
    return () => { cancelled = true }
  }, [])

  // Fetch landing settings to get dynamic price limit
  useEffect(() => {
    let cancelled = false
    api.get('/food/landing/settings/public')
      .then((res) => {
        if (cancelled) return
        const settings = res?.data?.data
        if (settings && typeof settings.under250PriceLimit === 'number') {
          setUnder250PriceLimit(settings.under250PriceLimit)
        }
      })
      .catch(() => {
        // Default to 250 if fetch fails
        setUnder250PriceLimit(250)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setCurrentBannerIndex((prev) => {
      if (bannerImages.length === 0) return 0
      return Math.min(prev, bannerImages.length - 1)
    })
  }, [bannerImages.length])

  useEffect(() => {
    if (typeof window === "undefined") return

    bannerImages.forEach((src) => {
      if (!src) return
      const img = new window.Image()
      img.src = src
    })
  }, [bannerImages])

  const startBannerAutoSlide = useCallback(() => {
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current)
    }

    if (bannerImages.length <= 1) return

    autoSlideIntervalRef.current = setInterval(() => {
      if (!isBannerSwipingRef.current) {
        setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length)
      }
    }, 3500)
  }, [bannerImages.length])

  const resetBannerAutoSlide = useCallback(() => {
    startBannerAutoSlide()
  }, [startBannerAutoSlide])

  useEffect(() => {
    startBannerAutoSlide()

    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current)
      }
    }
  }, [startBannerAutoSlide])

  const handleBannerTouchStart = useCallback((event) => {
    if (bannerImages.length <= 1) return
    touchStartXRef.current = event.touches[0].clientX
    touchStartYRef.current = event.touches[0].clientY
    touchEndXRef.current = event.touches[0].clientX
    touchEndYRef.current = event.touches[0].clientY
    isBannerSwipingRef.current = true
  }, [bannerImages.length])

  const handleBannerTouchMove = useCallback((event) => {
    if (!isBannerSwipingRef.current) return
    touchEndXRef.current = event.touches[0].clientX
    touchEndYRef.current = event.touches[0].clientY
  }, [])

  const handleBannerTouchEnd = useCallback(() => {
    if (!isBannerSwipingRef.current || bannerImages.length <= 1) {
      isBannerSwipingRef.current = false
      return
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current
    const deltaY = Math.abs(touchEndYRef.current - touchStartYRef.current)
    const minSwipeDistance = 40

    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
      setCurrentBannerIndex((prev) => {
        if (deltaX > 0) {
          return (prev - 1 + bannerImages.length) % bannerImages.length
        }
        return (prev + 1) % bannerImages.length
      })
      resetBannerAutoSlide()
    }

    isBannerSwipingRef.current = false
  }, [bannerImages.length, resetBannerAutoSlide])

  // Fetch restaurants with dishes under ₹250 from backend
  useEffect(() => {
    let cancelled = false;

    const fetchRestaurantsUnder250 = async () => {
      try {
        setLoadingRestaurants(true)
        // Use the new coordinates-based location lookup
        const response = await restaurantAPI.getRestaurantsUnder250({
          lat: location?.latitude || 22.7196,
          lng: location?.longitude || 75.8577,
          radiusKm: 50
        })
        
        if (cancelled) return;

        const data = response?.data?.data;
        const restaurantsRaw = Array.isArray(data?.restaurants) ? data.restaurants : [];
        
        const userLat = Number(location?.latitude)
        const userLng = Number(location?.longitude)
        
        // Final transformation of backend data for UI
        const restaurants = restaurantsRaw.map(restaurant => {
          const restaurantId = restaurant?.restaurantId || restaurant?.id || restaurant?._id;
          
          // Distance calculation if needed
          const restaurantLocation = restaurant?.location;
          const restaurantLat = Number(
            restaurantLocation?.latitude ??
            (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[1] : null)
          );
          const restaurantLng = Number(
            restaurantLocation?.longitude ??
            (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[0] : null)
          );
          const distanceInKm = (
            Number.isFinite(userLat) &&
            Number.isFinite(userLng) &&
            Number.isFinite(restaurantLat) &&
            Number.isFinite(restaurantLng)
          )
            ? calculateDistance(userLat, userLng, restaurantLat, restaurantLng)
            : null;

          const fallbackDistance =
            typeof restaurant?.distance === "number"
              ? formatDistance(restaurant.distance)
              : (restaurant?.distance || "");

          return {
            ...restaurant,
            id: String(restaurantId),
            restaurantId: String(restaurantId),
            name: restaurant?.restaurantName || restaurant?.name || "Restaurant",
            rating: Number(restaurant?.rating || 0),
            totalRatings: Number(restaurant?.totalRatings || restaurant?.ratingCount || 0),
            distance: distanceInKm !== null ? formatDistance(distanceInKm) : fallbackDistance,
            distanceInKm,
            // Backend already filtered and attached menuItems
            menuItems: (restaurant.menuItems || []).map(item => ({
              ...item,
              id: String(item.id || item._id),
              price: Number(item.price || 0),
              image:
                item?.image ||
                restaurant?.profileImage?.url ||
                restaurant?.profileImage ||
                ""
            }))
          };
        });

        setUnder250Restaurants(restaurants);
        setLoadingRestaurants(false);
      } catch (error) {
        if (!cancelled) {
          debugError('Error fetching restaurants under 250:', error)
          setUnder250Restaurants([])
          setLoadingRestaurants(false)
        }
      }
    }

    fetchRestaurantsUnder250()
    return () => { cancelled = true; };
  }, [zoneId, isOutOfService, location?.latitude, location?.longitude, under250PriceLimit])

  // Fetch categories from backend (no static fallback list)
  useEffect(() => {
    let cancelled = false

    const fetchCategories = async () => {
      try {
        const response = await adminAPI.getPublicCategories(zoneId ? { zoneId } : {})
        const categoriesRaw = Array.isArray(response?.data?.data?.categories)
          ? response.data.data.categories
          : []

        const mappedCategories = categoriesRaw
          .map((cat, index) => {
            const name = String(cat?.name || "").trim()
            if (!name) return null

            return {
              id: String(cat?.id || cat?._id || cat?.slug || `cat-${index}`),
              name,
              slug: String(cat?.slug || name.toLowerCase().replace(/\s+/g, "-")),
              image:
                cat?.imageUrl ||
                cat?.image ||
                cat?.icon ||
                "",
            }
          })
          .filter(Boolean)

        if (!cancelled) {
          setCategories(mappedCategories)
        }
      } catch (error) {
        debugError("Error fetching under-250 categories:", error)
        if (!cancelled) setCategories([])
      }
    }

    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [zoneId])

  // Sync quantities from cart on mount
  useEffect(() => {
    const cartQuantities = {}
    cart.forEach((item) => {
      cartQuantities[item.id] = item.quantity || 0
    })
    setQuantities(cartQuantities)
  }, [cart])

  useEffect(() => {
    if (!selectedItem || !showItemDetail) return

    const existingQuantity = quantities[selectedItem.id] || 0
    if (existingQuantity > 0) {
      setItemDetailQuantity(existingQuantity)
    }
  }, [quantities, selectedItem, showItemDetail])

  useEffect(() => {
    if (!showSortPopup) return
    setDraftSelectedSort(selectedSort)
  }, [showSortPopup, selectedSort])

  useEffect(() => {
    if (!showSortPopup && !showItemDetail && !showShareOptions) return
    if (typeof window === "undefined") return

    const bodyStyle = document.body.style
    scrollLockYRef.current = window.scrollY

    const originalOverflow = bodyStyle.overflow
    const originalPosition = bodyStyle.position
    const originalTop = bodyStyle.top
    const originalWidth = bodyStyle.width

    bodyStyle.overflow = "hidden"
    bodyStyle.position = "fixed"
    bodyStyle.top = `-${scrollLockYRef.current}px`
    bodyStyle.width = "100%"

    return () => {
      bodyStyle.overflow = originalOverflow
      bodyStyle.position = originalPosition
      bodyStyle.top = originalTop
      bodyStyle.width = originalWidth
      window.scrollTo(0, scrollLockYRef.current)
    }
  }, [showSortPopup, showItemDetail, showShareOptions])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!selectedSort && !activeCategory && !under30MinsFilter) {
      window.localStorage.removeItem(UNDER_250_FILTERS_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      UNDER_250_FILTERS_STORAGE_KEY,
      JSON.stringify({
        selectedSort,
        activeCategory,
        under30MinsFilter,
      })
    )
  }, [selectedSort, activeCategory, under30MinsFilter])

  // Scroll detection for view cart button positioning
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDifference = Math.abs(currentScrollY - lastScrollY.current)

      // Only update if scroll difference is significant (avoid flickering)
      if (scrollDifference < 5) {
        return
      }

      // Scroll down -> bottom-[72px], Scroll up -> bottom-[92px]
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setViewCartButtonBottom("bottom-[72px]")
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up
        setViewCartButtonBottom("bottom-[92px]")
      }

      // Update banner scroll state for navbar transparency
      if (currentScrollY > 40) {
        setHasScrolledPastBanner(true)
      } else {
        setHasScrolledPastBanner(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Helper function to update item quantity in bothlocal state and cart
  const updateItemQuantity = (item, newQuantity, event = null, restaurantName = null) => {
    // Check authentication
    if (!isModuleAuthenticated('user')) {
      window.dispatchEvent(new CustomEvent('show-login-required'))
      return
    }

    // Check booking radius eligibility using shared utility
    const eligibility = checkRestaurantBookingEligibility(item, location)
    if (!eligibility.bookable) {
      toast.error(eligibility.message)
      return
    }

    // Update local state
    setQuantities((prev) => ({
      ...prev,
      [item.id]: newQuantity,
    }))

    // Find restaurant name from the item or use provided parameter
    const restaurant = restaurantName || item.restaurant || "Under 250"

    // Prepare cart item with all required properties
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      restaurant: restaurant,
      description: item.description || "",
      originalPrice: item.originalPrice || item.price,
      priceOnOtherPlatforms: item.priceOnOtherPlatforms || null, // Include platform pricing for savings display
      otherPlatformGst: item.otherPlatformGst ?? null,
    }

    // Get source position for animation from event target
    let sourcePosition = null
    if (event) {
      let buttonElement = event.currentTarget
      if (!buttonElement && event.target) {
        buttonElement = event.target.closest('button') || event.target
      }

      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect()
        const scrollX = window.pageXOffset || window.scrollX || 0
        const scrollY = window.pageYOffset || window.scrollY || 0

        sourcePosition = {
          viewportX: rect.left + rect.width / 2,
          viewportY: rect.top + rect.height / 2,
          scrollX: scrollX,
          scrollY: scrollY,
          itemId: item.id,
        }
      }
    }

    // Update cart context
    if (newQuantity <= 0) {
      const productInfo = {
        id: item.id,
        name: item.name,
        imageUrl: item.image,
      }
      removeFromCart(item.id, sourcePosition, productInfo)
    } else {
      const existingCartItem = getCartItem(item.id)
      if (existingCartItem) {
        const productInfo = {
          id: item.id,
          name: item.name,
          imageUrl: item.image,
        }

        if (newQuantity > existingCartItem.quantity && sourcePosition) {
          const result = addToCart(cartItem, sourcePosition)
          if (result?.ok === false) {
            toast.error(result.error || 'Cannot add item from different restaurant. Please clear cart first.')
            return
          }
          if (newQuantity > existingCartItem.quantity + 1) {
            updateQuantity(item.id, newQuantity)
          }
        } else if (newQuantity < existingCartItem.quantity && sourcePosition) {
          updateQuantity(item.id, newQuantity, sourcePosition, productInfo)
        } else {
          updateQuantity(item.id, newQuantity)
        }
      } else {
        const result = addToCart(cartItem, sourcePosition)
        if (result?.ok === false) {
          toast.error(result.error || 'Cannot add item from different restaurant. Please clear cart first.')
          return
        }
        if (newQuantity > 1) {
          updateQuantity(item.id, newQuantity)
        }
      }
    }
  }

  const closeItemDetail = useCallback(() => {
    setShowItemDetail(false)
    setShowShareOptions(false)
  }, [])

  const handleItemClick = (item, restaurant) => {
    const availabilityStatus = getRestaurantAvailabilityStatus(restaurant)
    const isRestaurantOffline = !availabilityStatus.isOpen
    const itemWithRestaurant = {
      ...item,
      restaurant: restaurant.name,
      restaurantSlug: restaurant.slug || restaurant.restaurantId || "",
      description: item.description || `${item.name} from ${restaurant.name}`,
      customisable: item.customisable || false,
      notEligibleForCoupons: item.notEligibleForCoupons || false,
      isRestaurantOffline,
      distance: restaurant.distanceInKm || restaurant.distance,
      distanceInKm: restaurant.distanceInKm,
    }
    const existingQuantity = quantities[item.id] || 0
    setItemDetailQuantity(existingQuantity > 0 ? existingQuantity : 1)
    setSelectedItem(itemWithRestaurant)
    setShowShareOptions(false)
    setShowItemDetail(true)
  }

  const handleBookmarkClick = (itemId) => {
    setBookmarkedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleShareItem = async (item) => {
    if (!item) return

    const itemId = item.id || item._id
    const restaurantSlug = item.restaurantSlug || item.slug || ""
    const shareUrl = restaurantSlug
      ? `${window.location.origin}/user/restaurants/${restaurantSlug}${itemId ? `?dish=${encodeURIComponent(itemId)}` : ""}`
      : window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.name || "Dish",
          text: `Check out ${item.name || "this dish"} from ${item.restaurant || "Under 250"}`,
          url: shareUrl,
        })
        return
      }
    } catch (error) {
      if (error?.name === "AbortError") return
    }

    setShowShareOptions(true)
  }

  const handleShareOption = async (type) => {
    if (!selectedItem) return

    const itemId = selectedItem.id || selectedItem._id
    const restaurantSlug = selectedItem.restaurantSlug || selectedItem.slug || ""
    const shareUrl = restaurantSlug
      ? `${window.location.origin}/user/restaurants/${restaurantSlug}${itemId ? `?dish=${encodeURIComponent(itemId)}` : ""}`
      : window.location.href
    const shareText = `Check out ${selectedItem.name || "this dish"} from ${selectedItem.restaurant || "Under 250"}`
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(`${shareText} ${shareUrl}`)

    try {
      if (type === "copy") {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copied to clipboard!")
      } else if (type === "whatsapp") {
        window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer")
      } else if (type === "telegram") {
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer")
      } else if (type === "sms") {
        window.location.href = `sms:?&body=${encodedText}`
      } else if (type === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent(selectedItem.name || "Dish")}&body=${encodedText}`
      }
      setShowShareOptions(false)
    } catch {
      toast.error("Failed to share link")
    }
  }

  const handleItemDetailTouchStart = (e) => {
    if (!showItemDetail) return
    itemDetailGestureRef.current = {
      startY: e.touches?.[0]?.clientY || 0,
      dragging: true,
    }
  }

  const handleItemDetailTouchEnd = (e) => {
    if (!showItemDetail || !itemDetailGestureRef.current.dragging) return

    const endY = e.changedTouches?.[0]?.clientY || 0
    const deltaY = endY - itemDetailGestureRef.current.startY
    const contentScrollTop = itemDetailContentRef.current?.scrollTop || 0

    itemDetailGestureRef.current.dragging = false

    if (contentScrollTop <= 0 && deltaY > 80) {
      closeItemDetail()
    }
  }

  const handleItemDetailWheel = (e) => {
    if (!showItemDetail) return
    const contentScrollTop = itemDetailContentRef.current?.scrollTop || 0
    if (contentScrollTop <= 0 && e.deltaY < -20) {
      closeItemDetail()
    }
  }

  // Check if should show grayscale (only when user is out of service)
  const shouldShowGrayscale = false

  return (

    <div className={`relative min-h-screen bg-surface dark:bg-[#0a0a0a] ${shouldShowGrayscale ? 'grayscale opacity-75' : ''}`}>
      <div
        ref={stickyHeaderRef}
        className="fixed top-0 left-0 right-0 z-40 w-full px-4 py-2 sm:py-3 rounded-b-[2rem] shadow-lg bg-gradient-to-b from-[var(--primary)] to-[var(--primary-dark)]"
      >
        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Location Selector */}
          <Button
            variant="ghost"
            onClick={openLocationSelector}
            className="flex items-center gap-2 cursor-pointer group min-w-0 relative z-50 text-left no-underline h-auto px-0 py-0 hover:bg-transparent transition-colors"
          >
            <div className="bg-white/10 p-1.5 rounded-xl group-active:scale-95 transition-all text-white/90">
              <MapPin className="h-4 w-4 text-white/90 fill-white/20" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-black text-white truncate max-w-[160px] sm:max-w-[220px] leading-none drop-shadow-sm">
                  {displayArea}
                </span>
                <ChevronDown className="h-3 w-3 text-white/70" />
              </div>
              <span className="text-[10px] font-normal text-white/80 truncate max-w-[160px] sm:max-w-[220px] leading-tight mt-0.5 drop-shadow-md">
                Select Location
              </span>
            </div>
          </Button>

          {/* Right: Wallet & Profile Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Wallet Button */}
            <Link 
              to="/food/user/wallet" 
              state={{ from: "/food/user/under-250" }}
              onClick={(e) => {
                if (!isModuleAuthenticated('user')) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('show-login-required'));
                }
              }}
              className="p-1.5 active:scale-90 transition-all flex items-center justify-center text-white"
            >
              <Wallet className="h-[26px] w-[26px] antialiased" strokeWidth={2.2} />
            </Link>

            {/* Profile Avatar */}
            <Link 
              to="/food/user/profile" 
              state={{ from: "/food/user/under-250" }}
              onClick={(e) => {
                if (!isModuleAuthenticated('user')) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('show-login-required'));
                }
              }}
              className="h-9 w-9 relative flex items-center justify-center rounded-full border-[1.5px] border-white ring-1 ring-red-500/80 cursor-pointer active:scale-95 transition-all overflow-hidden"
            >
              <Avatar className="h-full w-full bg-[#FFF5E6] dark:bg-gray-800">
                {userProfile?.profileImage && (
                  <AvatarImage 
                    src={userProfile.profileImage} 
                    alt="Profile" 
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-[#FFF5E6] dark:bg-gray-800 text-[20px] font-black text-[var(--primary)] leading-none tracking-tighter antialiased">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </div>

      {/* Banner Section */}
      <div
        ref={bannerShellRef}
        data-banner-shell="true"
        className="relative w-full overflow-hidden h-[clamp(210px,34vw,430px)]"
      >
        {/* Banner Image */}
        <div className="absolute inset-0 z-0">
          <OptimizedImage
            src={bannerImages.length > 0 ? bannerImages[currentBannerIndex] : under250Banner}
            alt="Under 250 Banner"
            priority={true}
            className="w-full h-full"
            objectFit="cover"
            style={{ objectPosition: "center 90%" }}
          />
          {/* Subtle gradient overlay to ensure navbar readability if needed */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Content Section */}
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 space-y-0 pt-2 sm:pt-3 md:pt-4 lg:pt-6 pb-6 md:pb-8 lg:pb-10">

        <section className="space-y-1 sm:space-y-1.5">
          <div
            className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto md:overflow-x-visible overflow-y-visible scrollbar-hide scroll-smooth px-2 sm:px-3 py-2 sm:py-3 md:py-4"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              touchAction: "pan-x pan-y pinch-zoom",
              overflowY: "hidden",
            }}
          >
            {/* All Button */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => setActiveCategory(null)}>
              <motion.div
                className="flex flex-col items-center gap-2 w-[62px] sm:w-24 md:w-28"
                whileHover={{ scale: 1.1, y: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-md transition-all flex items-center justify-center bg-white ${!activeCategory ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
                   <div className={`w-full h-full flex items-center justify-center ${!activeCategory ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-gray-50 text-text-secondary'}`}>
                      <UtensilsCrossed className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                   </div>
                </div>
                <span className={`text-xs sm:text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 text-center pb-1 ${!activeCategory ? 'text-[var(--primary)]' : ''}`}>
                  All
                </span>
              </motion.div>
            </div>
            {categories.map((category, index) => {
              const isActive = activeCategory === category.id
              return (
                <div key={category.id} className="flex-shrink-0 cursor-pointer" onClick={() => setActiveCategory(isActive ? null : category.id)}>
                    <motion.div
                      className="flex flex-col items-center gap-2 w-[62px] sm:w-24 md:w-28"
                      whileHover={{ scale: 1.1, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-md transition-all ${isActive ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
                        <OptimizedImage
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full bg-surface rounded-full"
                          objectFit="cover"
                          sizes="(max-width: 640px) 62px, (max-width: 768px) 96px, 112px"
                          placeholder="blur"
                        />
                      </div>
                      <span className={`text-xs sm:text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 text-center pb-1 ${isActive ? 'text-[var(--primary)]' : ''}`}>
                        {category.name.length > 7 ? `${category.name.slice(0, 7)}...` : category.name}
                      </span>
                    </motion.div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="py-2 sm:py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSortPopup(true)}
              className="h-8 sm:h-9 md:h-10 px-3 sm:px-4 md:px-5 rounded-md flex items-center gap-2 whitespace-nowrap flex-shrink-0 font-medium transition-all bg-surface dark:bg-[#1a1a1a] border border-border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm md:text-base"
            >
              <ArrowDownUp className="h-4 w-4 md:h-5 md:w-5 rotate-90" />
              <span className="text-sm md:text-base font-medium">
                {selectedSort ? sortOptions.find(opt => opt.id === selectedSort)?.label : 'Sort'}
              </span>
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setUnder30MinsFilter(!under30MinsFilter)}
              className={`h-8 sm:h-9 md:h-10 px-3 sm:px-4 md:px-5 rounded-md flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 font-medium transition-all text-sm md:text-base ${under30MinsFilter
                ? 'bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-primary-dark'
                : 'bg-surface dark:bg-[#1a1a1a] border border-border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-text-secondary dark:text-gray-300'
                }`}
            >
              <Timer className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              <span className="text-xs sm:text-sm md:text-base font-medium">Under 30 mins</span>
            </Button>
          </div>
        </section>


        {/* Restaurant Menu Sections */}
        {(loadingRestaurants || showGlobalLoader) ? (
          <div className="space-y-8 pt-4 sm:pt-6 md:pt-8 lg:pt-10">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-4">
                {/* Skeleton Header */}
                <div className="flex flex-col gap-2">
                  <div className="h-6 sm:h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 bg-gray-100 dark:bg-gray-900 rounded"></div>
                    <div className="h-4 w-24 bg-gray-100 dark:bg-gray-900 rounded"></div>
                  </div>
                </div>
                {/* Skeleton Grid */}
                <div className="flex gap-4 overflow-hidden pb-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex-shrink-0 w-[200px] sm:w-[220px] h-64 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-border dark:border-gray-800"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sortedAndFilteredRestaurants.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-text-secondary dark:text-text-secondary">
              {under250Restaurants.length === 0
                ? `No restaurants with dishes under ${RUPEE_SYMBOL}${under250PriceLimit} found.`
                : "No restaurants match the selected filters."}
            </div>
          </div>
        ) : (
          sortedAndFilteredRestaurants.map((restaurant) => {
            const restaurantSlug = restaurant.slug || restaurant.name.toLowerCase().replace(/\s+/g, "-")
            const availabilityStatus = getRestaurantAvailabilityStatus(restaurant)
            const isRestaurantOffline = !availabilityStatus.isOpen
            
            const coverImage = restaurant.coverImages?.[0] || restaurant.profileImage?.url || restaurant.profileImage || "https://picsum.photos/seed/dhaba/300/200";

            return (
              <div 
                key={restaurant.id} 
                className={`p-4 bg-white dark:bg-[#1a1a1a] border border-gray-150 dark:border-neutral-800 rounded-3xl shadow-sm space-y-4 ${
                  isRestaurantOffline ? 'opacity-80' : ''
                }`}
              >
                {/* 1. Restaurant Header Section (Driving Mode style card) */}
                <div 
                  onClick={() => navigate(`/user/restaurants/${restaurantSlug}`)}
                  className="flex gap-4 cursor-pointer hover:opacity-95 transition-all"
                >
                  {/* Left: Image with Veg Indicator */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-neutral-800">
                    <img 
                      src={coverImage} 
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "https://picsum.photos/seed/dhaba/300/200"; }}
                    />
                    {restaurant.pureVegRestaurant && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[8px] font-black uppercase tracking-wider">
                        Veg
                      </div>
                    )}
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Name and Rating */}
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate flex items-center gap-1">
                          {restaurant.name}
                          {(restaurant.isVerified || restaurant.verified || true) && (
                            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
                          )}
                        </h4>
                        <div className="flex items-center gap-0.5 text-xs text-orange-600 font-bold shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{restaurant.rating ? restaurant.rating.toFixed(1) : "0.0"}</span>
                        </div>
                      </div>
                      
                      {/* Cuisines */}
                      <p className="text-[10px] sm:text-xs text-gray-400 dark:text-neutral-500 truncate mt-0.5 font-semibold">
                        {restaurant.cuisines?.length ? restaurant.cuisines.join(", ") : "North Indian, Fast Food"}
                      </p>
                    </div>

                    {/* Distance from User */}
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-neutral-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{restaurant.distance || "Within 50 km"}</span>
                    </div>

                    {/* Facilities list */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {restaurant.facilities?.washroom && (
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-md">
                          Washroom
                        </span>
                      )}
                      {restaurant.facilities?.evCharging && (
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 rounded-md">
                          EV Charging
                        </span>
                      )}
                      {restaurant.facilities?.parking && (
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 rounded-md">
                          Parking
                        </span>
                      )}
                      {restaurant.facilities?.wifi && (
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-md">
                          WiFi
                        </span>
                      )}
                      {restaurant.facilities?.familyFriendly && (
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 rounded-md">
                          Family
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Food Carousel Section (Dishes under ₹250) */}
                <div className="border-t border-gray-150 dark:border-neutral-800 pt-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2">
                    Dishes under ₹250
                  </h5>
                  <div 
                    className="flex gap-3 overflow-x-auto scrollbar-hide py-1 scroll-smooth"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      touchAction: "pan-x",
                    }}
                  >
                    {restaurant.menuItems.map((item) => {
                      const isVeg = item.isVeg ?? (String(item.foodType || '').toLowerCase().includes('veg') && !String(item.foodType || '').toLowerCase().includes('non'));
                      return (
                        <div 
                          key={item.id}
                          onClick={() => handleItemClick(item, restaurant)}
                          className="flex-shrink-0 w-36 bg-gray-50 dark:bg-[#1a1a1a]/50 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden hover:shadow-sm cursor-pointer transition-all duration-300"
                        >
                          {/* Dish Image */}
                          <div className="relative w-full h-24 bg-gray-100 dark:bg-neutral-800">
                            <img 
                              src={item.image || "https://picsum.photos/seed/dhaba/300/200"} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = "https://picsum.photos/seed/dhaba/300/200"; }}
                            />
                            {/* Veg/Non-Veg Badge */}
                            <div className="absolute top-1.5 left-1.5 h-3.5 w-3.5 rounded border border-green-600 bg-white flex items-center justify-center z-10">
                              <div className={`h-1.5 w-1.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
                            </div>
                          </div>
                          
                          {/* Dish Info */}
                          <div className="p-2.5 space-y-1">
                            <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                              {item.name}
                            </p>
                            <p className="text-xs font-black text-orange-600">
                              ₹{Math.round(item.price)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          }))}
      </div>

      {/* Sort Popup - Bottom Sheet */}
      <AnimatePresence>
        {showSortPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowSortPopup(false)}
              className="fixed inset-0 bg-black/50 z-100"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-lg lg:max-w-2xl bg-surface dark:bg-[#1a1a1a] rounded-t-3xl shadow-2xl z-[110] max-h-[60vh] md:max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b dark:border-gray-800">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-text-primary dark:text-white">Sort By</h2>
                <button
                  onClick={handleClearAll}
                  className="text-[var(--primary)] dark:text-[#FEE2E2] font-medium text-sm md:text-base"
                >
                  Clear all
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
                <div className="flex flex-col gap-3 md:gap-4">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id || 'relevance'}
                      onClick={() => setDraftSelectedSort(option.id)}
                      className={`px-4 md:px-5 lg:px-6 py-3 md:py-4 rounded-xl border text-left transition-colors ${draftSelectedSort === option.id
                        ? 'border-[var(--primary)] bg-[#fdfafc] dark:bg-[var(--primary)]/20'
                        : 'border-border dark:border-gray-800 hover:border-[var(--primary)]'
                        }`}
                    >
                      <span className={`text-sm md:text-base lg:text-lg font-medium ${draftSelectedSort === option.id ? 'text-[var(--primary)] dark:text-[#FEE2E2]' : 'text-gray-700 dark:text-gray-300'}`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-5 border-t dark:border-gray-800 bg-surface dark:bg-[#1a1a1a]">
                <button
                  onClick={() => setShowSortPopup(false)}
                  className="flex-1 py-3 md:py-4 text-center font-semibold text-gray-700 dark:text-gray-300 text-sm md:text-base"
                >
                  Close
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 md:py-4 font-semibold rounded-xl transition-colors text-sm md:text-base bg-[var(--primary)] text-white hover:bg-primary-dark"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Item Detail Popup */}
      <AnimatePresence>
        {showItemDetail && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-[9999]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeItemDetail}
            />

            {/* Item Detail Bottom Sheet */}
            <motion.div
              className="fixed left-0 right-0 bottom-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl z-[10000] bg-surface dark:bg-[#1a1a1a] rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.15, type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleItemDetailTouchStart}
              onTouchEnd={handleItemDetailTouchEnd}
              onWheel={handleItemDetailWheel}
            >
              {/* Close Button - Top Center Above Popup with 4px gap */}
              <div className="absolute -top-[44px] left-1/2 -translate-x-1/2 z-[10001]">
                <motion.button
                  onClick={closeItemDetail}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-800 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors shadow-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </motion.button>
              </div>

              {/* Image Section */}
              <div className={`relative w-full h-64 md:h-80 lg:h-96 xl:h-[500px] overflow-hidden rounded-t-3xl ${
                (shouldShowGrayscale || selectedItem.isRestaurantOffline) ? 'grayscale opacity-75' : ''
              }`}>
                <OptimizedImage
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="100vw"
                  priority={true}
                  placeholder="blur"
                />
                {/* Bookmark and Share Icons Overlay */}
                <div className="absolute bottom-4 right-4 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBookmarkClick(selectedItem.id)
                    }}
                    className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-300 ${bookmarkedItems.has(selectedItem.id)
                      ? "border-red-500 bg-primary-light/10 text-red-500"
                      : "border-white bg-white/90 text-text-secondary hover:bg-white"
                      }`}
                  >
                    <Bookmark
                      className={`h-5 w-5 transition-all duration-300 ${bookmarkedItems.has(selectedItem.id) ? "fill-red-500" : ""
                        }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareItem(selectedItem)
                    }}
                    className="h-10 w-10 rounded-full border border-white bg-white/90 text-text-secondary hover:bg-surface flex items-center justify-center transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content Section */}
              <div
                ref={itemDetailContentRef}
                className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-10 py-4 md:py-6 lg:py-8"
              >
                {/* Item Name and Indicator */}
                <div className="flex items-start justify-between mb-3 md:mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 md:gap-3 flex-1">
                    {selectedItem.isVeg && (
                      <div className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 rounded border-2 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <div className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-3.5 lg:w-3.5 rounded-full bg-green-600 dark:bg-green-500" />
                      </div>
                    )}
                    <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-text-primary dark:text-white">
                      {selectedItem.name}
                    </h2>
                  </div>
                  {/* Bookmark and Share Icons (Desktop) */}
                  <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBookmarkClick(selectedItem.id)
                      }}
                      className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full border flex items-center justify-center transition-all duration-300 ${bookmarkedItems.has(selectedItem.id)
                        ? "border-red-500 bg-primary-light/10 dark:bg-red-900/20 text-red-500 dark:text-primary-light"
                        : "border-border dark:border-gray-600 text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-gray-300"
                        }`}
                    >
                      <Bookmark
                        className={`h-4 w-4 lg:h-5 lg:w-5 transition-all duration-300 ${bookmarkedItems.has(selectedItem.id) ? "fill-red-500 dark:fill-red-400" : ""
                          }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShareItem(selectedItem)
                      }}
                      className="h-8 w-8 lg:h-10 lg:w-10 rounded-full border border-border dark:border-gray-600 text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-gray-300 flex items-center justify-center transition-colors"
                    >
                      <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm md:text-base lg:text-lg text-text-secondary dark:text-text-secondary mb-4 md:mb-6 lg:mb-8 leading-relaxed">
                  {selectedItem.description || `${selectedItem.name} from ${selectedItem.restaurant || 'Under 250'}`}
                </p>

                {/* Highly Reordered Progress Bar */}
                {selectedItem.customisable && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--primary)]" style={{ width: '50%' }} />
                    </div>
                    <span className="text-xs text-text-secondary dark:text-text-secondary font-medium whitespace-nowrap">
                      highly reordered
                    </span>
                  </div>
                )}

                {/* Not Eligible for Coupons */}
                {selectedItem.notEligibleForCoupons && (
                  <p className="text-xs text-text-secondary dark:text-text-secondary font-medium mb-4">
                    NOT ELIGIBLE FOR COUPONS
                  </p>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t dark:border-gray-800 border-border px-4 md:px-6 lg:px-8 xl:px-10 py-4 md:py-5 lg:py-6 bg-surface dark:bg-[#1a1a1a]">
                {selectedItem.isRestaurantOffline && (
                  <p className="text-sm font-semibold text-red-500 mb-3 text-center">
                    Restaurant is currently closed and not accepting orders.
                  </p>
                )}
                <div className="flex items-center gap-4 md:gap-5 lg:gap-6">
                  {/* Quantity Selector */}
                  <div className={`flex items-center gap-3 md:gap-4 lg:gap-5 border-2 rounded-lg md:rounded-xl px-3 md:px-4 lg:px-5 h-[44px] md:h-[50px] lg:h-[56px] ${
                    (shouldShowGrayscale || selectedItem.isRestaurantOffline)
                      ? 'border-border dark:border-gray-700 opacity-50'
                      : 'border-border dark:border-gray-700'
                    }`}>
                    <button
                      onClick={(e) => {
                        if (!shouldShowGrayscale && !selectedItem.isRestaurantOffline) {
                          e.stopPropagation()
                          setItemDetailQuantity((prev) => Math.max(1, prev - 1))
                        }
                      }}
                      disabled={itemDetailQuantity <= 1 || shouldShowGrayscale || selectedItem.isRestaurantOffline}
                      className={`${(shouldShowGrayscale || selectedItem.isRestaurantOffline)
                        ? 'text-gray-300 dark:text-text-secondary cursor-not-allowed'
                        : 'text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-gray-200 disabled:text-gray-300 dark:disabled:text-text-secondary disabled:cursor-not-allowed'
                        }`}
                    >
                      <Minus className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                    </button>
                    <span className={`text-lg md:text-xl lg:text-2xl font-semibold min-w-[2rem] md:min-w-[2.5rem] lg:min-w-[3rem] text-center ${
                      (shouldShowGrayscale || selectedItem.isRestaurantOffline)
                        ? 'text-text-secondary dark:text-text-secondary'
                        : 'text-text-primary dark:text-white'
                      }`}>
                      {itemDetailQuantity}
                    </span>
                    <button
                      onClick={(e) => {
                        if (!shouldShowGrayscale && !selectedItem.isRestaurantOffline) {
                          e.stopPropagation()
                          setItemDetailQuantity((prev) => prev + 1)
                        }
                      }}
                      disabled={shouldShowGrayscale || selectedItem.isRestaurantOffline}
                      className={(shouldShowGrayscale || selectedItem.isRestaurantOffline)
                        ? 'text-gray-300 dark:text-text-secondary cursor-not-allowed'
                        : 'text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-gray-200'
                      }
                    >
                      <Plus className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                    </button>
                  </div>

                  {/* Add Item Button */}
                  <Button
                    className={`flex-1 h-[44px] md:h-[50px] lg:h-[56px] rounded-lg md:rounded-xl font-semibold flex items-center justify-center gap-2 text-sm md:text-base lg:text-lg ${
                      (shouldShowGrayscale || selectedItem.isRestaurantOffline)
                        ? 'bg-gray-300 dark:bg-gray-700 text-text-secondary dark:text-text-secondary cursor-not-allowed opacity-50'
                        : 'bg-[var(--primary)] hover:bg-primary-dark dark:bg-[var(--primary)] dark:hover:bg-primary-dark text-white'
                        }`}
                    onClick={(e) => {
                      if (!shouldShowGrayscale && !selectedItem.isRestaurantOffline) {
                        updateItemQuantity(selectedItem, itemDetailQuantity, e)
                        closeItemDetail()
                      }
                    }}
                    disabled={shouldShowGrayscale || selectedItem.isRestaurantOffline}
                  >
                    <span>Add item</span>
                    <div className="flex items-center gap-1 md:gap-2">
                      {selectedItem.originalPrice && selectedItem.originalPrice > selectedItem.price && (
                        <span className="text-sm md:text-base lg:text-lg line-through text-red-200">
                          {RUPEE_SYMBOL}{Math.round(selectedItem.originalPrice)}
                        </span>
                      )}
                      <span className="text-base md:text-lg lg:text-xl font-bold">
                        {RUPEE_SYMBOL}{Math.round(selectedItem.price)}
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareOptions && selectedItem && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-[10020]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowShareOptions(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.2, type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[10021] bg-surface dark:bg-[#1a1a1a] rounded-t-3xl shadow-2xl px-4 py-4"
            >
              <div className="flex justify-center pb-3">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex items-center justify-between pb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary dark:text-white">Share dish</h3>
                <button
                  onClick={() => setShowShareOptions(false)}
                  className="text-sm font-medium text-text-secondary dark:text-text-secondary"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "whatsapp", label: "WhatsApp" },
                  { id: "telegram", label: "Telegram" },
                  { id: "sms", label: "SMS" },
                  { id: "email", label: "Email" },
                  { id: "copy", label: "Copy Link" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleShareOption(option.id)}
                    className="rounded-2xl border border-border dark:border-gray-700 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add to Cart Animation */}
      <AddToCartAnimation dynamicBottom={viewCartButtonBottom} />
    </div>
  )
}

