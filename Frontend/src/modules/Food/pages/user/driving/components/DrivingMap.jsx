import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker, OverlayView } from "@react-google-maps/api";
import { Compass, Loader2, Pause, Play } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ["geometry", "drawing", "places"];
const ALT_ROUTE_STROKE = "#111111";

// High precision polyline decoder for Google Maps encoded polylines
function getRouteMidpoint(path = []) {
  if (!Array.isArray(path) || path.length === 0) return null;
  return path[Math.floor(path.length / 2)] || null;
}

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

function getBearing(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
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
  onRouteSelect,
  recenterBottomOffset
}) {
  const mapRef = useRef(null);
  const [localRoutePath, setLocalRoutePath] = useState([]);
  const [alternateRoutePaths, setAlternateRoutePaths] = useState([]);
  const [isRotationEnabled, setIsRotationEnabled] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

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

  const simulationPosition = useMemo(() => {
    if (!isSimulationRunning || !Array.isArray(localRoutePath) || localRoutePath.length < 2) return null;
    return localRoutePath[Math.min(simulationIndex, localRoutePath.length - 1)] || null;
  }, [isSimulationRunning, localRoutePath, simulationIndex]);

  const effectiveUserPosition = simulationPosition || (hasUserLocation ? { lat: userLat, lng: userLng } : null);
  const effectiveHeading = useMemo(() => {
    if (simulationPosition && localRoutePath.length >= 2) {
      const currentPoint = localRoutePath[Math.min(simulationIndex, localRoutePath.length - 2)] || simulationPosition;
      const nextPoint = localRoutePath[Math.min(simulationIndex + 1, localRoutePath.length - 1)] || simulationPosition;
      return getBearing(currentPoint, nextPoint);
    }
    return typeof heading === "number" && !Number.isNaN(heading) ? heading : 0;
  }, [simulationPosition, localRoutePath, simulationIndex, heading]);

  const center = useMemo(() => {
    return effectiveUserPosition || DEFAULT_CENTER;
  }, [effectiveUserPosition]);

  const prevBoundsKeyRef = useRef("");
  const routeRequestedRef = useRef("");

  const selectedRouteId = journey?.selectedRouteId || journey?.selectedHighway?.routeId || journey?.selectedHighway?._id;

  const selectedRouteIndex = useMemo(() => {
    const match = typeof selectedRouteId === "string" ? selectedRouteId.match(/google_route_(\d+)/) : null;
    if (!match) return 0;
    const parsedIndex = Number(match[1]) - 1;
    return Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  }, [selectedRouteId]);

  // Fit bounds to cover user location, destination, and all restaurants ahead
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (effectiveUserPosition) {
      bounds.extend(effectiveUserPosition);
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
    } else if (effectiveUserPosition) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(14);
    }
  }, [effectiveUserPosition, hasDestLocation, destLat, destLng, (restaurants || []).length, center]);

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
      if (effectiveUserPosition) {
        mapRef.current.panTo(effectiveUserPosition);
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
  }, [effectiveUserPosition]);

  // Fetch navigation path via Google Directions Service so the visible route follows actual roads.
  useEffect(() => {
    if (!isLoaded || !hasUserLocation || !hasDestLocation || !window.google) {
      setLocalRoutePath([]);
      setAlternateRoutePaths([]);
      return;
    }

    const routeKey = `${userLat.toFixed(3)}_${userLng.toFixed(3)}_${destLat.toFixed(3)}_${destLng.toFixed(3)}_${selectedRouteIndex}`;
    const cachedActivePath = selectedRouteId ? journey?.routeGeometryCache?.[selectedRouteId]?.activePath : null;
    if (Array.isArray(cachedActivePath) && cachedActivePath.length >= 2) {
      setLocalRoutePath(cachedActivePath);
      if (Array.isArray(journey?.availableRoutes) && journey.availableRoutes.length > 1) {
        const fallbackPaths = journey.availableRoutes
          .map((routeOption) => Array.isArray(routeOption.coordinates) ? routeOption.coordinates : [])
          .filter((routePath) => routePath.length >= 2);
        setAlternateRoutePaths(
          fallbackPaths
            .map((path, index) => ({
              path,
              routeOption: Array.isArray(journey?.availableRoutes) ? journey.availableRoutes[index] : null,
              routeIndex: index
            }))
            .filter((routeEntry) => routeEntry.routeIndex !== selectedRouteIndex && Array.isArray(routeEntry.path) && routeEntry.path.length >= 2)
        );
      } else {
        setAlternateRoutePaths([]);
      }
      routeRequestedRef.current = routeKey;
      return;
    }
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
        provideRouteAlternatives: true
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          const availableRoutes = Array.isArray(result?.routes) ? result.routes : [];
          const decodedRoutePaths = availableRoutes.map((routeItem) => {
            let routePath = [];

            if (routeItem?.legs && routeItem.legs.length > 0) {
              routeItem.legs.forEach((leg) => {
                if (leg?.steps && leg.steps.length > 0) {
                  leg.steps.forEach((step) => {
                    let stepPts = [];
                    const rawPoly = step.polyline?.points || (typeof step.polyline === "string" ? step.polyline : null);
                    if (rawPoly) {
                      stepPts = decodePolyline(rawPoly);
                    } else if (step.path && Array.isArray(step.path)) {
                      stepPts = step.path.map((p) => ({
                        lat: typeof p.lat === "function" ? p.lat() : p.lat,
                        lng: typeof p.lng === "function" ? p.lng() : p.lng
                      }));
                    } else if (step.lat_lngs && Array.isArray(step.lat_lngs)) {
                      stepPts = step.lat_lngs.map((p) => ({
                        lat: typeof p.lat === "function" ? p.lat() : p.lat,
                        lng: typeof p.lng === "function" ? p.lng() : p.lng
                      }));
                    }

                    stepPts.forEach((pt) => {
                      if (routePath.length === 0) {
                        routePath.push(pt);
                      } else {
                        const prev = routePath[routePath.length - 1];
                        if (Math.abs(prev.lat - pt.lat) > 1e-7 || Math.abs(prev.lng - pt.lng) > 1e-7) {
                          routePath.push(pt);
                        }
                      }
                    });
                  });
                }
              });
            }

            if (routePath.length === 0) {
              const overviewRaw = routeItem?.overview_polyline?.points || (typeof routeItem?.overview_polyline === "string" ? routeItem.overview_polyline : null);
              if (overviewRaw) {
                routePath = decodePolyline(overviewRaw);
              } else if (routeItem?.overview_path && Array.isArray(routeItem.overview_path)) {
                routePath = routeItem.overview_path.map((p) => ({
                  lat: typeof p.lat === "function" ? p.lat() : p.lat,
                  lng: typeof p.lng === "function" ? p.lng() : p.lng
                }));
              }
            }

            return routePath;
          }).filter((routePath) => Array.isArray(routePath) && routePath.length >= 2);

          const route = availableRoutes[selectedRouteIndex] || availableRoutes[0];
          const detailedPath = decodedRoutePaths[selectedRouteIndex] || decodedRoutePaths[0] || [];


          if (detailedPath.length >= 2) {
            const routePolyline = detailedPath;
            const estimatedDistance = route?.legs?.[0]?.distance?.text || "";
            const estimatedDuration = route?.legs?.[0]?.duration?.text || "";

            setLocalRoutePath(routePolyline);
            setAlternateRoutePaths(
              decodedRoutePaths
                .map((path, index) => ({
                  path,
                  routeOption: Array.isArray(journey?.availableRoutes) ? journey.availableRoutes[index] : null,
                  routeIndex: index
                }))
                .filter((routeEntry) => routeEntry.routeIndex !== selectedRouteIndex && Array.isArray(routeEntry.path) && routeEntry.path.length >= 2)
            );

            if (onRouteCalculated) {
              const allRoutes = {};
              decodedRoutePaths.forEach((path, index) => {
                const routeOption = Array.isArray(journey?.availableRoutes) ? journey.availableRoutes[index] : null;
                const routeId = routeOption?.routeId || routeOption?._id;
                if (!routeId || !Array.isArray(path) || path.length < 2) return;
                allRoutes[routeId] = { activePath: path };
              });

              onRouteCalculated({
                routePolyline,
                estimatedDistance,
                estimatedDuration,
                routeBounds: route?.bounds || null,
                routeGeometryCacheEntry: {
                  routeId: selectedRouteId,
                  activePath: routePolyline,
                  allRoutes
                }
              });
            }
            return;
          }
        }

        if (Array.isArray(journey?.availableRoutes) && journey.availableRoutes.length > 1) {
          const fallbackPaths = journey.availableRoutes
            .map((routeOption) => Array.isArray(routeOption.coordinates) ? routeOption.coordinates : [])
            .filter((routePath) => routePath.length >= 2);
          const activeFallbackPath = fallbackPaths[selectedRouteIndex] || fallbackPaths[0] || [];
          setLocalRoutePath(activeFallbackPath);
          setAlternateRoutePaths(
            fallbackPaths
              .map((path, index) => ({
                path,
                routeOption: Array.isArray(journey?.availableRoutes) ? journey.availableRoutes[index] : null,
                routeIndex: index
              }))
              .filter((routeEntry) => routeEntry.routeIndex !== selectedRouteIndex && Array.isArray(routeEntry.path) && routeEntry.path.length >= 2)
          );
        } else if (journey?.routePolyline && Array.isArray(journey.routePolyline) && journey.routePolyline.length >= 2) {
          setLocalRoutePath(journey.routePolyline);
          setAlternateRoutePaths([]);
        } else {
          setLocalRoutePath([]);
          setAlternateRoutePaths([]);
        }
        console.warn("Directions request failed:", status);
      }
    );
  }, [
    isLoaded,
    hasUserLocation,
    userLat,
    userLng,
    hasDestLocation,
    destLat,
    destLng,
    selectedRouteIndex,
    journey?.routePolyline,
    journey?.routeGeometryCache,
    journey?.availableRoutes,
    selectedRouteId,
    onRouteCalculated
  ]);

  // Fit bounds ONLY when destination or restaurants length actually changes (prevents continuous GetViewportInfo loops)
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const currentKey = `${destLat || ""}_${destLng || ""}_${(restaurants || []).length}`;
    if (currentKey !== prevBoundsKeyRef.current) {
      prevBoundsKeyRef.current = currentKey;
      fitMapBounds();
    }
  }, [isLoaded, destLat, destLng, restaurants?.length, fitMapBounds]);


  useEffect(() => {
    if (!Array.isArray(localRoutePath) || localRoutePath.length < 2) {
      setIsSimulationRunning(false);
      setSimulationIndex(0);
      return;
    }
    setSimulationIndex((prev) => Math.min(prev, localRoutePath.length - 1));
  }, [localRoutePath]);

  useEffect(() => {
    if (!isSimulationRunning || localRoutePath.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setSimulationIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= localRoutePath.length - 1) {
          window.clearInterval(intervalId);
          setIsSimulationRunning(false);
          return localRoutePath.length - 1;
        }
        return nextIndex;
      });
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isSimulationRunning, localRoutePath]);

  useEffect(() => {
    if (!mapRef.current || !isRotationEnabled) return;
    mapRef.current.setHeading(effectiveHeading || 0);
    mapRef.current.setTilt(45);
  }, [isRotationEnabled, effectiveHeading]);

  useEffect(() => {
    if (!mapRef.current || !simulationPosition) return;
    mapRef.current.panTo(simulationPosition);
    if (isRotationEnabled) {
      mapRef.current.setHeading(effectiveHeading || 0);
      mapRef.current.setTilt(45);
    }
  }, [simulationPosition, isRotationEnabled, effectiveHeading]);

  const handleToggleRotation = useCallback(() => {
    setIsRotationEnabled((prev) => {
      const next = !prev;
      if (mapRef.current) {
        mapRef.current.setHeading(next ? (effectiveHeading || 0) : 0);
        mapRef.current.setTilt(next ? 45 : 0);
      }
      return next;
    });
  }, [effectiveHeading]);

  const handleToggleSimulation = useCallback(() => {
    if (localRoutePath.length < 2) return;
    setSimulationIndex((prev) => {
      if (!isSimulationRunning && prev >= localRoutePath.length - 1) {
        return 0;
      }
      return prev;
    });
    setIsSimulationRunning((prev) => !prev);
  }, [isSimulationRunning, localRoutePath]);

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
        {/* Alternate Routes */}
        {alternateRoutePaths.map((routeEntry, index) => {
          const routeMidpoint = getRouteMidpoint(routeEntry.path);

          return (
            <React.Fragment key={`alt-route-${routeEntry.routeOption?.routeId || index}`}>
              <Polyline
                path={routeEntry.path}
                onClick={() => {
                  if (routeEntry.routeOption && onRouteSelect) {
                    onRouteSelect(routeEntry.routeOption);
                  }
                }}
                options={{
                  strokeColor: "#ffffff",
                  strokeOpacity: 0.01,
                  strokeWeight: 20,
                  geodesic: true,
                  zIndex: 1,
                  clickable: true,
                }}
              />
              <Polyline
                path={routeEntry.path}
                onClick={() => {
                  if (routeEntry.routeOption && onRouteSelect) {
                    onRouteSelect(routeEntry.routeOption);
                  }
                }}
                options={{
                  strokeColor: ALT_ROUTE_STROKE,
                  strokeOpacity: 0.38,
                  strokeWeight: 6,
                  geodesic: true,
                  zIndex: 2,
                  clickable: true,
                  icons: [
                    {
                      icon: {
                        path: "M 0,-1 0,1",
                        strokeOpacity: 1,
                        strokeWeight: 2.5,
                        scale: 3
                      },
                      offset: "0",
                      repeat: "18px"
                    }
                  ]
                }}
              />
              {routeEntry.routeOption && routeMidpoint && (
                <OverlayView
                  position={routeMidpoint}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <button
                    type="button"
                    onClick={() => onRouteSelect?.(routeEntry.routeOption)}
                    className="pointer-events-auto rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur transition hover:scale-[1.02]"
                  >
                    {routeEntry.routeOption?.name || `Route ${routeEntry.routeIndex + 1}`}
                  </button>
                </OverlayView>
              )}
            </React.Fragment>
          );
        })}

        {/* Active Route Polyline */}
        {localRoutePath.length >= 2 && (
          <Polyline
            path={localRoutePath}
            options={{
              strokeColor: "#0284c7",
              strokeOpacity: 0.95,
              strokeWeight: 6,
              geodesic: true,
              zIndex: 2,
            }}
          />
        )}

        {/* User Location Halo (Round White Circle around cursor like Google Maps) */}
        {effectiveUserPosition && (
          <Marker
            position={effectiveUserPosition}
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
        {effectiveUserPosition && (
          <Marker
            position={effectiveUserPosition}
            options={{
              icon: {
                path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                scale: 1.4,
                fillColor: "#0284c7",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                rotation: effectiveHeading || 0,
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

      <div className="absolute right-4 z-30 flex flex-col gap-3 pointer-events-none bottom-[368px]">
        <button
          type="button"
          onClick={handleToggleRotation}
          className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all ${isRotationEnabled
            ? "border-orange-300 bg-orange-500 text-white"
            : "border-gray-200/80 bg-white text-gray-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            }`}
          title="Rotate map"
        >
          <Compass className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleToggleSimulation}
          disabled={localRoutePath.length < 2}
          className={`pointer-events-auto flex h-11 min-w-[44px] items-center justify-center rounded-full border px-3 shadow-xl transition-all ${isSimulationRunning
            ? "border-sky-300 bg-sky-500 text-white"
            : "border-gray-200/80 bg-white text-gray-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            } ${localRoutePath.length < 2 ? "cursor-not-allowed opacity-50" : ""}`}
          title="Simulate route"
        >
          {isSimulationRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>

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
