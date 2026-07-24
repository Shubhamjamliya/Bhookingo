import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ["geometry", "drawing", "places"];

function getDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371000; // meters
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function OrderTrackingMap({
  userLocation,
  restaurantLocation,
  restaurantName,
  restaurantsAhead = [],
  onDirectionsCalculated,
  orderType = "TAKEAWAY"
}) {
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const lastRouteRequestedLocationRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const center = useMemo(() => {
    return userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : (restaurantLocation ? { lat: restaurantLocation.lat, lng: restaurantLocation.lng } : DEFAULT_CENTER);
  }, [userLocation?.lat, userLocation?.lng, restaurantLocation?.lat, restaurantLocation?.lng]);

  // Compute route directions from user to restaurant
  useEffect(() => {
    if (!isLoaded || !userLocation || !restaurantLocation || !window.google) return;

    if (lastRouteRequestedLocationRef.current) {
      const dist = getDistanceMeters(userLocation, lastRouteRequestedLocationRef.current);
      if (dist < 50) {
        // Skip directions recalculation if distance change is less than 50 meters
        return;
      }
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: restaurantLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          lastRouteRequestedLocationRef.current = userLocation;
          const route = result.routes[0]?.legs[0];
          if (route && onDirectionsCalculated) {
            onDirectionsCalculated({
              distanceText: route.distance?.text || "",
              durationText: route.duration?.text || "",
              durationValue: route.duration?.value || 0,
            });
          }
        } else {
          console.warn("Directions request failed:", status);
        }
      }
    );
  }, [isLoaded, userLocation?.lat, userLocation?.lng, restaurantLocation?.lat, restaurantLocation?.lng]);

  // Fit bounds to cover user location, restaurant, and nearby restaurants
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (userLocation?.lat && userLocation?.lng) {
      bounds.extend(userLocation);
      count++;
    }

    if (restaurantLocation?.lat && restaurantLocation?.lng) {
      bounds.extend(restaurantLocation);
      count++;
    }

    restaurantsAhead.forEach((r) => {
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
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(14);
    }
  }, [userLocation?.lat, userLocation?.lng, restaurantLocation?.lat, restaurantLocation?.lng, restaurantsAhead, center]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    fitMapBounds();
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Recenter or fit bounds when coordinates change
  useEffect(() => {
    if (isLoaded && mapRef.current) {
      fitMapBounds();
    }
  }, [isLoaded, userLocation?.lat, userLocation?.lng, restaurantLocation?.lat, restaurantLocation?.lng, fitMapBounds]);

  const mapOptions = useMemo(() => ({
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: true,
  }), []);

  const directionsOptions = useMemo(() => ({
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: "#0284c7",
      strokeOpacity: 0.85,
      strokeWeight: 6,
    },
  }), []);

  const userMarkerOptions = useMemo(() => {
    if (!window.google?.maps) return {};
    return {
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
    };
  }, [isLoaded]);

  const restaurantMarkerOptions = useMemo(() => {
    if (!window.google?.maps) return {};
    return {
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#ea580c",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 1.5,
        scale: 1.6,
        anchor: new window.google.maps.Point(12, 24),
      },
      title: restaurantName,
      zIndex: 90,
    };
  }, [isLoaded, restaurantName]);

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
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* Route directions line */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={directionsOptions}
        />
      )}

      {/* User Location Marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          options={userMarkerOptions}
        />
      )}

      {/* Restaurant Marker */}
      {restaurantLocation && (
        <Marker
          position={restaurantLocation}
          options={restaurantMarkerOptions}
        />
      )}

      {/* Restaurants Ahead Markers */}
      {restaurantsAhead.map((r, idx) => {
        const loc = r.location;
        const rlat = typeof loc?.latitude === "number" ? loc.latitude
          : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
        const rlng = typeof loc?.longitude === "number" ? loc.longitude
          : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

        if (!rlat || !rlng) return null;

        return (
          <Marker
            key={r._id || idx}
            position={{ lat: rlat, lng: rlng }}
            options={{
              icon: {
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: "#84cc16",
                fillOpacity: 0.9,
                strokeColor: "#ffffff",
                strokeWeight: 1,
                scale: 1.2,
                anchor: new window.google.maps.Point(12, 24),
              },
              title: r.restaurantName,
              zIndex: 80,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}

export default React.memo(OrderTrackingMap);
