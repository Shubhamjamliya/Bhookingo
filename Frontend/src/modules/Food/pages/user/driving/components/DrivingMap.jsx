import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { Loader2, Locate } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ["geometry", "drawing", "places"];

// High precision polyline decoder for Google Maps encoded polylines
function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

export default function DrivingMap({
  userLocation,
  destinationLocation,
  journey,
  onRouteCalculated,
  heading,
  highway,
  restaurants,
  onRestaurantClick,
  recenterBottomOffset
}) {
  const mapRef = useRef(null);
  const [localRoutePath, setLocalRoutePath] = useState([]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const userLat = Number(userLocation?.latitude ?? userLocation?.lat);
  const userLng = Number(userLocation?.longitude ?? userLocation?.lng);
  const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

  const destLat = Number(destinationLocation?.latitude ?? destinationLocation?.lat);
  const destLng = Number(destinationLocation?.longitude ?? destinationLocation?.lng);
  const hasDestLocation = Number.isFinite(destLat) && Number.isFinite(destLng);

  const center = useMemo(() => {
    return hasUserLocation
      ? { lat: userLat, lng: userLng }
      : DEFAULT_CENTER;
  }, [hasUserLocation, userLat, userLng]);

  const prevBoundsKeyRef = useRef("");
  const routeRequestedRef = useRef("");

  // Fit bounds to cover user location, destination, and all restaurants ahead
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (hasUserLocation) {
      bounds.extend({ lat: userLat, lng: userLng });
      count++;
    }

    if (hasDestLocation) {
      bounds.extend({ lat: destLat, lng: destLng });
      count++;
    }

    (restaurants || []).forEach((r) => {
      const loc = r.location;
      const rlat = typeof loc?.latitude === "number" ? loc.latitude
        : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
      const rlng = typeof loc?.longitude === "number" ? loc.longitude
        : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

      if (rlat && rlng) {
        bounds.extend({ lat: rlat, lng: rlng });
        count++;
      }
    });

    if (count >= 2) {
      mapRef.current.fitBounds(bounds, 80); // padding of 80px
    } else if (hasUserLocation) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(14);
    }
  }, [hasUserLocation, userLat, userLng, hasDestLocation, destLat, destLng, (restaurants || []).length, center]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    fitMapBounds();
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleRecenter = useCallback((e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
    }

    if (mapRef.current) {
      if (hasUserLocation) {
        mapRef.current.panTo({ lat: userLat, lng: userLng });
        mapRef.current.setZoom(16);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords && mapRef.current) {
            mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            mapRef.current.setZoom(16);
          }
        },
        (err) => console.warn("GPS locate error:", err),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, [hasUserLocation, userLat, userLng]);

  // Fetch navigation path via Google Directions Service (cached & high precision)
  useEffect(() => {
    if (!isLoaded || !hasUserLocation || !hasDestLocation || !window.google) {
      setLocalRoutePath([]);
      return;
    }

    // Only reuse cached route if valid route points exist
    if (journey?.routePolyline && Array.isArray(journey.routePolyline) && journey.routePolyline.length >= 2) {
      setLocalRoutePath(journey.routePolyline);
      return;
    }

    const routeKey = `${userLat.toFixed(3)}_${userLng.toFixed(3)}_${destLat.toFixed(3)}_${destLng.toFixed(3)}`;
    if (routeRequestedRef.current === routeKey) {
      return;
    }
    routeRequestedRef.current = routeKey;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: userLat, lng: userLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          const route = result.routes[0];
          let detailedPath = [];

          // Primary: Decode and merge every step's polyline from all legs for maximum road fidelity
          if (route?.legs && route.legs.length > 0) {
            route.legs.forEach(leg => {
              if (leg?.steps && leg.steps.length > 0) {
                leg.steps.forEach(step => {
                  let stepPts = [];
                  const rawPoly = step.polyline?.points || (typeof step.polyline === "string" ? step.polyline : null);
                  if (rawPoly) {
                    stepPts = decodePolyline(rawPoly);
                  } else if (step.path && Array.isArray(step.path)) {
                    stepPts = step.path.map(p => ({
                      lat: typeof p.lat === "function" ? p.lat() : p.lat,
                      lng: typeof p.lng === "function" ? p.lng() : p.lng
                    }));
                  } else if (step.lat_lngs && Array.isArray(step.lat_lngs)) {
                    stepPts = step.lat_lngs.map(p => ({
                      lat: typeof p.lat === "function" ? p.lat() : p.lat,
                      lng: typeof p.lng === "function" ? p.lng() : p.lng
                    }));
                  }

                  stepPts.forEach(pt => {
                    if (detailedPath.length === 0) {
                      detailedPath.push(pt);
                    } else {
                      const prev = detailedPath[detailedPath.length - 1];
                      if (Math.abs(prev.lat - pt.lat) > 1e-7 || Math.abs(prev.lng - pt.lng) > 1e-7) {
                        detailedPath.push(pt);
                      }
                    }
                  });
                });
              }
            });
          }

          // Fallback to overview polyline ONLY if step-by-step extraction produced no points
          if (detailedPath.length === 0) {
            const overviewRaw = route?.overview_polyline?.points || (typeof route?.overview_polyline === "string" ? route.overview_polyline : null);
            if (overviewRaw) {
              detailedPath = decodePolyline(overviewRaw);
            } else if (route?.overview_path && Array.isArray(route.overview_path)) {
              detailedPath = route.overview_path.map(p => ({
                lat: typeof p.lat === "function" ? p.lat() : p.lat,
                lng: typeof p.lng === "function" ? p.lng() : p.lng
              }));
            }
          }

          const routePolyline = detailedPath;
          const estimatedDistance = result.routes[0]?.legs[0]?.distance?.text || "";
          const estimatedDuration = result.routes[0]?.legs[0]?.duration?.text || "";

          setLocalRoutePath(routePolyline);

          if (onRouteCalculated) {
            onRouteCalculated({
              routePolyline,
              estimatedDistance,
              estimatedDuration,
              routeBounds: result.routes[0]?.bounds || null
            });
          }
        } else {
          console.warn("Directions request failed:", status);
        }
      }
    );
  }, [isLoaded, hasUserLocation, userLat, userLng, hasDestLocation, destLat, destLng, journey?.routePolyline, onRouteCalculated]);

  // Fit bounds ONLY when destination or restaurants length actually changes (prevents continuous GetViewportInfo loops)
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const currentKey = `${destLat || ""}_${destLng || ""}_${(restaurants || []).length}`;
    if (currentKey !== prevBoundsKeyRef.current) {
      prevBoundsKeyRef.current = currentKey;
      fitMapBounds();
    }
  }, [isLoaded, destLat, destLng, restaurants?.length, fitMapBounds]);


  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
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
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
        }}
      >
        {/* Journey Route Polyline (Google Maps Detailed Directions) */}
        {localRoutePath.length >= 2 && (
          <Polyline
            path={localRoutePath}
            options={{
              strokeColor: "#0284c7", // Google Maps navigation blue
              strokeOpacity: 0.9,
              strokeWeight: 6,
              geodesic: true,
            }}
          />
        )}

        {/* User Location Halo (Round White Circle around cursor like Google Maps) */}
        {hasUserLocation && (
          <Marker
            position={{ lat: userLat, lng: userLng }}
            options={{
              icon: {
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: 18,
                fillColor: "#ffffff",
                fillOpacity: 0.95,
                strokeColor: "#0284c7",
                strokeWeight: 2.5,
              },
              clickable: false,
              zIndex: 99,
            }}
          />
        )}

        {/* User Location Marker (Navigation Arrow with GPS Heading Rotation) */}
        {hasUserLocation && (
          <Marker
            position={{ lat: userLat, lng: userLng }}
            options={{
              icon: {
                path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                scale: 1.4,
                fillColor: "#0284c7",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                rotation: typeof heading === "number" && !isNaN(heading) ? heading : 0,
                anchor: window.google?.maps ? new window.google.maps.Point(12, 12) : null,
              },
              title: "Your Location",
              zIndex: 100,
            }}
          />
        )}

        {/* Destination Marker */}
        {hasDestLocation && (
          <Marker
            position={{ lat: destLat, lng: destLng }}
            title="Destination"
            options={{
              zIndex: 101,
            }}
          />
        )}

        {/* Restaurant Markers */}
        {(() => {
          const coordinatesSeen = {}; // key: "lat,lng", value: count

          return restaurants.map((r, idx) => {
            const loc = r.location;
            let rlat = typeof loc?.latitude === "number" ? loc.latitude
              : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
            let rlng = typeof loc?.longitude === "number" ? loc.longitude
              : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

            if (!rlat || !rlng) return null;

            // Generate a coordinate key with a precision to group very close ones (e.g., 5 decimal places)
            const coordKey = `${rlat.toFixed(5)},${rlng.toFixed(5)}`;
            const seenCount = coordinatesSeen[coordKey] || 0;
            coordinatesSeen[coordKey] = seenCount + 1;

            if (seenCount > 0) {
              // Apply a tiny offset to separate overlapping markers
              // A simple spiral or circular arrangement:
              // angle = seenCount * 137.5 degrees (golden angle), radius = seenCount * 0.00012 degrees (approx 12-15 meters)
              const angle = seenCount * 2.39996; // angle in radians
              const radius = 0.00012 + (seenCount - 1) * 0.00008; // slightly increase radius for subsequent duplicates
              rlat = rlat + Math.sin(angle) * radius;
              rlng = rlng + Math.cos(angle) * radius;
            }

            return (
              <Marker
                key={r._id || idx}
                position={{ lat: rlat, lng: rlng }}
                onClick={() => onRestaurantClick(r)}
                options={{
                  icon: {
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: "#ea580c", // orange-600
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 1.5,
                    scale: 1.6,
                    anchor: new window.google.maps.Point(12, 24),
                    labelOrigin: new window.google.maps.Point(12, -10)
                  },
                  label: {
                    text: `${r.distanceKm} km`,
                    color: "#ea580c",
                    fontWeight: "900",
                    fontSize: "11px",
                    className: "bg-white/90 dark:bg-neutral-900/90 border border-orange-200 px-1.5 py-0.5 rounded shadow-sm"
                  },
                  title: r.restaurantName,
                  zIndex: 50 + seenCount,
                }}
              />
            );
          });
        })()}
      </GoogleMap>

      {/* Floating Recenter GPS Button */}
      <button
        type="button"
        onClick={handleRecenter}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRecenter(e);
        }}
        className={`absolute right-4 z-30 w-12 h-12 bg-white hover:bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-full flex items-center justify-center shadow-2xl border border-gray-200/80 dark:border-neutral-800 active:scale-90 transition-all duration-200 focus:outline-none pointer-events-auto cursor-pointer ${recenterBottomOffset || "bottom-[302px]"}`}
        title="Locate Me"
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
