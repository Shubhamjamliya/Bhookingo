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

  // Scroll logic removed so the navbar stays permanently visible

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
          className="md:hidden fixed bottom-4 left-4 right-4 z-50"
        >
          <div 
            className="w-full h-16 bg-white dark:bg-[#1a1a1a] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.1)] flex items-center justify-around px-2"
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-1 h-[3.25rem] w-full relative transition-all duration-300 ${
                  item.active ? "text-[#c22031] dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.active && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-[#fff0f2] dark:bg-red-500/10 rounded-full z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <item.icon 
                    className={`h-[22px] w-[22px] transition-transform duration-300 ${item.active ? "scale-105" : ""}`} 
                    strokeWidth={item.active ? 2 : 1.75} 
                  />
                  <span className={`text-[10px] font-semibold tracking-wide ${item.active ? "opacity-100" : "opacity-90"}`}>
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
