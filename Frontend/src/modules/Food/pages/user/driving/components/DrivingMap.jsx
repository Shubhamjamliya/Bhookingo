import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

const POLYLINE_OPTIONS = {
  strokeColor: "#0284c7",
  strokeOpacity: 0.85,
  strokeWeight: 6,
};

export default function DrivingMap({ userLocation, heading, highway, restaurants, onRestaurantClick }) {
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: []
  });

  const center = userLocation
    ? { lat: userLocation.latitude, lng: userLocation.longitude }
    : DEFAULT_CENTER;

  // Fit bounds to cover user location and all restaurants ahead
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (userLocation) {
      bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
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
  }, [userLocation, restaurants, center]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    fitMapBounds();
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Fit bounds when restaurants or user location changes
  useEffect(() => {
    if (isLoaded && mapRef.current) {
      fitMapBounds();
    }
  }, [isLoaded, restaurants, userLocation, fitMapBounds]);

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

  // Convert highway coordinates to Google Maps LatLng structure
  const polylinePath = Array.isArray(highway?.coordinates)
    ? highway.coordinates.map((c) => ({ lat: c.lat, lng: c.lng }))
    : [];

  return (
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
      {/* Highway Polyline */}
      {polylinePath.length >= 2 && (
        <Polyline path={polylinePath} options={POLYLINE_OPTIONS} />
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

      {/* Restaurant Markers */}
      {restaurants.map((r, idx) => {
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
              zIndex: 50,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
