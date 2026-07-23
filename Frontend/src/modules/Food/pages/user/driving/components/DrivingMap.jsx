import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { Loader2, Locate } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = [];

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

  const center = useMemo(() => {
    return userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : DEFAULT_CENTER;
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Fit bounds to cover user location, destination, and all restaurants ahead
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (userLocation) {
      bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      count++;
    }

    if (destinationLocation) {
      bounds.extend({ lat: destinationLocation.lat, lng: destinationLocation.lng });
      count++;
    }

    restaurants.forEach((r) => {
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
    } else if (userLocation) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(14);
    }
  }, [userLocation, destinationLocation, restaurants, center]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    fitMapBounds();
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || !userLocation) return;
    mapRef.current.panTo({
      lat: userLocation.latitude,
      lng: userLocation.longitude
    });
    mapRef.current.setZoom(14);
  }, [userLocation]);

  // Fetch navigation path via Google Directions Service (cached)
  useEffect(() => {
    if (!isLoaded || !userLocation || !destinationLocation || !window.google) {
      setLocalRoutePath([]);
      return;
    }

    if (journey?.routePolyline && journey.routePolyline.length > 0) {
      setLocalRoutePath(journey.routePolyline);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: userLocation.latitude, lng: userLocation.longitude },
        destination: { lat: destinationLocation.lat, lng: destinationLocation.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          const path = result.routes[0]?.overview_path || [];
          const routePolyline = path.map(p => ({ lat: p.lat(), lng: p.lng() }));
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
  }, [isLoaded, userLocation?.latitude, userLocation?.longitude, destinationLocation?.lat, destinationLocation?.lng, journey?.routePolyline, onRouteCalculated]);

  // Fit bounds when restaurants or user location changes
  useEffect(() => {
    if (isLoaded && mapRef.current) {
      fitMapBounds();
    }
  }, [isLoaded, restaurants, userLocation, destinationLocation, fitMapBounds]);

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
        {/* Journey Route Polyline (Google Maps Directions) */}
        {localRoutePath.length >= 2 && (
          <Polyline 
            path={localRoutePath} 
            options={{
              strokeColor: "#0284c7", // Google Maps blue
              strokeOpacity: 0.85,
              strokeWeight: 6,
            }} 
          />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
            options={{
              icon: {
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: 8,
                fillColor: "#3b82f6",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              },
              title: "Your Location",
              zIndex: 100,
            }}
          />
        )}

        {/* Destination Marker */}
        {destinationLocation && (
          <Marker
            position={{ lat: destinationLocation.lat, lng: destinationLocation.lng }}
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
      {userLocation && (
        <button
          onClick={handleRecenter}
          className={`absolute right-4 z-10 w-11 h-11 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 border border-gray-200/60 dark:border-neutral-800 transition-all duration-300 focus:outline-none pointer-events-auto ${recenterBottomOffset || "bottom-[302px]"}`}
          title="Locate Me"
        >
          <Locate className="w-5.5 h-5.5 text-gray-700 dark:text-neutral-300" />
        </button>
      )}
    </div>
  );
}
