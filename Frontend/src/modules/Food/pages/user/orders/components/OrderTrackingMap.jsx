import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ["geometry", "drawing", "places"];
const ROUTE_CACHE_PREFIX = "bh_order_tracking_route_v2";

function getDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const earthRadius = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function pointsAlmostEqual(a, b, tolerance = 0.000001) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) <= tolerance && Math.abs(a.lng - b.lng) <= tolerance;
}

function interpolatePoint(from, to, progress) {
  if (!from) return to || null;
  if (!to) return from;
  const nextProgress = Math.max(0, Math.min(1, progress));
  return {
    lat: from.lat + ((to.lat - from.lat) * nextProgress),
    lng: from.lng + ((to.lng - from.lng) * nextProgress),
  };
}

function buildRouteCacheKey(origin, destination) {
  if (!origin || !destination) return "";
  return [
    ROUTE_CACHE_PREFIX,
    origin.lat.toFixed(5),
    origin.lng.toFixed(5),
    destination.lat.toFixed(5),
    destination.lng.toFixed(5),
  ].join(":");
}

function readRouteCache(key) {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRouteCache(key, value) {
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage issues.
  }
}

function fitMapToRoute(map, routePath = [], extraPoints = []) {
  if (!map || !window.google?.maps?.LatLngBounds) return;

  const bounds = new window.google.maps.LatLngBounds();
  let count = 0;

  routePath.forEach((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    bounds.extend(point);
    count += 1;
  });

  extraPoints.forEach((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    bounds.extend(point);
    count += 1;
  });

  if (count >= 2) {
    map.fitBounds(bounds, 72);
    return;
  }

  const fallback = routePath[0] || extraPoints[0] || DEFAULT_CENTER;
  map.setCenter(fallback);
  map.setZoom(14);
}

function OrderTrackingMap({
  routeOriginLocation,
  routeDestinationLocation,
  liveCursorLocation,
  liveHeading = null,
  restaurantName,
  destinationName = "Delivery Location",
  restaurantsAhead = [],
  onDirectionsCalculated,
}) {
  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const displayedCursorRef = useRef(null);
  const userHasMovedMapRef = useRef(false);
  const [routePath, setRoutePath] = useState([]);
  const [displayedCursor, setDisplayedCursor] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const center = useMemo(() => {
    return displayedCursor || routeDestinationLocation || routeOriginLocation || DEFAULT_CENTER;
  }, [displayedCursor, routeDestinationLocation, routeOriginLocation]);

  const routeCacheKey = useMemo(
    () => buildRouteCacheKey(routeOriginLocation, routeDestinationLocation),
    [routeOriginLocation?.lat, routeOriginLocation?.lng, routeDestinationLocation?.lat, routeDestinationLocation?.lng]
  );

  useEffect(() => {
    const nextCursor = liveCursorLocation || routeDestinationLocation || routeOriginLocation || null;
    if (!nextCursor) return;

    if (!displayedCursorRef.current) {
      displayedCursorRef.current = nextCursor;
      setDisplayedCursor(nextCursor);
      return;
    }

    if (pointsAlmostEqual(displayedCursorRef.current, nextCursor, 0.0000001)) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startPoint = displayedCursorRef.current;
    const startedAt = performance.now();
    const durationMs = 900;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const framePoint = interpolatePoint(startPoint, nextCursor, eased);
      displayedCursorRef.current = framePoint;
      setDisplayedCursor(framePoint);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [liveCursorLocation?.lat, liveCursorLocation?.lng, routeDestinationLocation?.lat, routeDestinationLocation?.lng, routeOriginLocation?.lat, routeOriginLocation?.lng]);

  useEffect(() => {
    if (!isLoaded || !routeOriginLocation || !routeDestinationLocation || !window.google?.maps) return;

    const cached = readRouteCache(routeCacheKey);
    if (Array.isArray(cached?.path) && cached.path.length > 1) {
      setRoutePath(cached.path);
      onDirectionsCalculated?.(cached.meta || {});
    }

    let cancelled = false;

    const loadRoute = async () => {
      try {
        const { Route } = await window.google.maps.importLibrary("routes");
        const { routes } = await Route.computeRoutes({
          origin: routeOriginLocation,
          destination: routeDestinationLocation,
          travelMode: "DRIVING",
          fields: ["path", "distanceMeters", "durationMillis"],
        });

        if (cancelled || !Array.isArray(routes) || !routes[0]) {
          return;
        }

        const route = routes[0];
        const nextPath = Array.isArray(route.path)
          ? route.path.map((point) => ({
              lat: typeof point.lat === "function" ? point.lat() : Number(point.lat),
              lng: typeof point.lng === "function" ? point.lng() : Number(point.lng),
            })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
          : [];

        const distanceMeters = Number(route.distanceMeters) || 0;
        const durationMillis = Number(route.durationMillis) || 0;
        const durationMinutes = durationMillis > 0 ? Math.max(1, Math.round(durationMillis / 60000)) : 0;
        const distanceText = distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`
          : `${Math.round(distanceMeters)} m`;
        const durationText = durationMinutes > 0 ? `${durationMinutes} mins` : "";

        const meta = {
          distanceText,
          durationText,
          durationValue: durationMillis > 0 ? Math.round(durationMillis / 1000) : 0,
        };

        setRoutePath(nextPath);
        onDirectionsCalculated?.(meta);
        writeRouteCache(routeCacheKey, { path: nextPath, meta });
      } catch (error) {
        console.warn("Order tracking route request failed:", error);
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, routeCacheKey, routeOriginLocation, routeDestinationLocation, onDirectionsCalculated]);

  const fitBoundsNow = useCallback(() => {
    fitMapToRoute(mapRef.current, routePath, [routeOriginLocation, routeDestinationLocation]);
  }, [routePath, routeOriginLocation, routeDestinationLocation]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    userHasMovedMapRef.current = false;
    fitBoundsNow();
  }, [fitBoundsNow]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || userHasMovedMapRef.current) return;
    fitBoundsNow();
  }, [isLoaded, fitBoundsNow]);

  const mapOptions = useMemo(() => ({
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: true,
    gestureHandling: "greedy",
    styles: [
      { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#5b6472" }] },
      { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#f7f7f5" }] },
      { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d9dde3" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eceae4" }] },
      { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      { featureType: "poi.business", stylers: [{ visibility: "off" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
      { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f4f1ea" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ebe6db" }] },
      { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#ddd4c4" }] },
      { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#fbfbfa" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#dfe7ef" }] },
      { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#edf2e6" }] },
    ],
  }), []);

  const cursorMarkerOptions = useMemo(() => {
    if (!window.google?.maps) return {};
    return {
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        rotation: Number.isFinite(liveHeading) ? liveHeading : 0,
        anchor: new window.google.maps.Point(0, 2),
      },
      title: "Live Tracking",
      zIndex: 120,
    };
  }, [liveHeading, isLoaded]);

  const originMarkerOptions = useMemo(() => {
    if (!window.google?.maps) return {};
    return {
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z",
        fillColor: "#16a34a",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 1.5,
        scale: 1.6,
        anchor: new window.google.maps.Point(12, 24),
      },
      title: restaurantName,
      zIndex: 90,
    };
  }, [restaurantName, isLoaded]);

  const destinationMarkerOptions = useMemo(() => {
    if (!window.google?.maps) return {};
    return {
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      title: destinationName,
      zIndex: 100,
    };
  }, [destinationName, isLoaded]);

  const handleRecenter = useCallback((event) => {
    if (event?.stopPropagation) event.stopPropagation();
    userHasMovedMapRef.current = false;

    if (!mapRef.current) return;
    if (displayedCursor) {
      mapRef.current.panTo(displayedCursor);
      mapRef.current.setZoom(15);
      return;
    }
    fitBoundsNow();
  }, [displayedCursor, fitBoundsNow]);

  useEffect(() => {
    const handleCustomRecenter = () => handleRecenter();
    window.addEventListener("recenter-map", handleCustomRecenter);
    return () => window.removeEventListener("recenter-map", handleCustomRecenter);
  }, [handleRecenter]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragStart={() => {
          userHasMovedMapRef.current = true;
        }}
        options={mapOptions}
      >
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#0284c7",
              strokeOpacity: 0.88,
              strokeWeight: 6,
            }}
          />
        )}

        {routeOriginLocation && <Marker position={routeOriginLocation} options={originMarkerOptions} />}
        {routeDestinationLocation && <Marker position={routeDestinationLocation} options={destinationMarkerOptions} />}
        {displayedCursor && <Marker position={displayedCursor} options={cursorMarkerOptions} />}

        {restaurantsAhead.map((restaurant, index) => {
          const loc = restaurant.location;
          const lat = typeof loc?.latitude === "number" ? loc.latitude : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
          const lng = typeof loc?.longitude === "number" ? loc.longitude : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return (
            <Marker
              key={restaurant._id || index}
              position={{ lat, lng }}
              options={{
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: "#84cc16",
                  fillOpacity: 0.95,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                },
                title: restaurant.restaurantName,
                zIndex: 80,
              }}
            />
          );
        })}
      </GoogleMap>

      <button
        type="button"
        onClick={handleRecenter}
        title="My Location"
        className="absolute bottom-6 right-4 z-30 w-12 h-12 bg-white hover:bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-100 dark:border-neutral-800 active:scale-90 transition-all duration-200 focus:outline-none"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400">
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      </button>
    </div>
  );
}

export default React.memo(OrderTrackingMap);
