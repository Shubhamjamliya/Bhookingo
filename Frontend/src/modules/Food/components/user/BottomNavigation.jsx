import { Link, useLocation } from "react-router-dom"
import { ShoppingBag, Tag, UtensilsCrossed, CircleUser, Compass } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import api from "@food/api"
import { useProfile } from "@food/context/ProfileContext"

export default function BottomNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const [under250PriceLimit, setUnder250PriceLimit] = useState(250)

  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  const accumulatedScrollUpRef = useRef(0)
  const accumulatedScrollDownRef = useRef(0)
  const isVisibleRef = useRef(true)

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
        if (!cancelled) setUnder250PriceLimit(250)
      })
    return () => { cancelled = true }
  }, [])

  // Scroll logic to hide/show footer - uses refs to avoid listener re-registration
  useEffect(() => {
    const SHOW_THRESHOLD = 150 // Pixels to scroll up to show
    const HIDE_THRESHOLD = 80  // Pixels to scroll down to hide

    const controlNavbar = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current

      // If we are at the top of the page, always show the footer
      if (currentScrollY < 50) {
        accumulatedScrollDownRef.current = 0
        accumulatedScrollUpRef.current = 0
        lastScrollYRef.current = currentScrollY
        if (!isVisibleRef.current) {
          isVisibleRef.current = true
          setIsVisible(true)
        }
        return
      }

      if (currentScrollY > lastScrollY) {
        // Scrolling Down
        const delta = currentScrollY - lastScrollY
        accumulatedScrollDownRef.current += delta
        accumulatedScrollUpRef.current = 0

        if (accumulatedScrollDownRef.current > HIDE_THRESHOLD && currentScrollY > 100) {
          if (isVisibleRef.current) {
            isVisibleRef.current = false
            setIsVisible(false)
          }
        }
      } else {
        // Scrolling Up
        const delta = lastScrollY - currentScrollY
        accumulatedScrollUpRef.current += delta
        accumulatedScrollDownRef.current = 0

        if (accumulatedScrollUpRef.current > SHOW_THRESHOLD) {
          if (!isVisibleRef.current) {
            isVisibleRef.current = true
            setIsVisible(true)
          }
        }
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener('scroll', controlNavbar, { passive: true })
    return () => window.removeEventListener('scroll', controlNavbar)
  }, []) // Empty deps â€” listener registers only ONCE, no re-add on every scroll

  // Normalize pathname by removing trailing slash for consistent comparison
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  
  // Check active routes
  const { orderType, setOrderType } = useProfile();
  
  const isDining = normalizedPath === "/food/dining" || normalizedPath.startsWith("/food/user/dining") || normalizedPath === "/dining" || normalizedPath.startsWith("/user/dining");
  const isUnder250 = normalizedPath === "/food/under-250" || normalizedPath.startsWith("/food/user/under-250") || normalizedPath === "/under-250" || normalizedPath.startsWith("/user/under-250");
  const isProfile = normalizedPath.startsWith("/food/profile") || normalizedPath.startsWith("/food/user/profile") || normalizedPath.startsWith("/user/profile") || normalizedPath === "/profile";
  const isDriving = normalizedPath === "/food/user/driving" || normalizedPath.startsWith("/food/user/driving") || normalizedPath === "/driving" || normalizedPath.startsWith("/user/driving");
  
  const isHomePaths = normalizedPath === "/food" || 
    normalizedPath === "/food/user" || 
    normalizedPath === "/user" ||
    normalizedPath === "/" ||
    ((normalizedPath.startsWith("/food/user") || normalizedPath.startsWith("/user")) && !isProfile && !isDining && !isUnder250 && !isDriving && !normalizedPath.startsWith("/food/user/takeaway") && !normalizedPath.startsWith("/user/takeaway")) ||
    normalizedPath.startsWith("/food/restaurants") ||
    normalizedPath.startsWith("/food/user/restaurants") ||
    normalizedPath.startsWith("/user/restaurants") ||
    normalizedPath.startsWith("/restaurants");

  const isTakeaway = normalizedPath === "/food/user/takeaway" || 
    normalizedPath.startsWith("/food/user/takeaway") ||
    normalizedPath === "/user/takeaway" ||
    normalizedPath.startsWith("/user/takeaway") ||
    normalizedPath === "/food/user/restaurants" ||
    normalizedPath.startsWith("/food/user/restaurants") ||
    normalizedPath.startsWith("/user/restaurants") ||
    normalizedPath.startsWith("/restaurants") ||
    (isHomePaths && orderType === "takeaway") || isHomePaths; // Default to Takeaway

  const isOrders = normalizedPath === "/user/orders" || normalizedPath.startsWith("/user/orders") || normalizedPath === "/food/user/orders" || normalizedPath.startsWith("/food/user/orders");

  const navItems = [
    {
      id: 'driving',
      label: 'Driving',
      icon: Compass,
      to: '/food/user/driving',
      active: isDriving
    },
    {
      id: 'restaurants',
      label: 'Restaurants',
      icon: UtensilsCrossed,
      to: '/food/user/restaurants',
      active: isTakeaway,
      onClick: () => {
        if (setOrderType) setOrderType('takeaway');
      }
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      to: '/user/orders',
      active: isOrders
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: CircleUser,
      to: '/food/user/profile',
      active: isProfile
    }
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          exit={{ y: 120 }}
          transition={{ 
            type: "tween",
            ease: [0.22, 1, 0.36, 1],
            duration: 0.5
          }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        >
          <div 
            className="w-full h-18 bg-surface dark:bg-[#1a1a1a] border-t-2 border-orange-500 rounded-t-[20px] shadow-[0_-10px_30px_rgba(0,0,0,0.12)] flex items-center justify-around px-2 overflow-hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-1 h-14 w-full relative transition-all duration-300 ${
                  item.active ? "text-[var(--primary)]" : "text-text-secondary dark:text-text-secondary"
                }`}
              >
                {item.active && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-x-1 inset-y-1 bg-primary-light/15 dark:bg-[var(--primary)]/10 rounded-[1.5rem] z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <item.icon 
                    className={`h-5 w-5 transition-transform duration-300 ${item.active ? "scale-110" : ""}`} 
                    strokeWidth={item.active ? 2.5 : 2} 
                  />
                  <span className={`text-[10px] font-black tracking-tight uppercase leading-none ${item.active ? "opacity-100" : "text-text-primary/70 dark:text-gray-300/60"}`}>
                    {item.id === 'under250' ? 'Under 250' : item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
