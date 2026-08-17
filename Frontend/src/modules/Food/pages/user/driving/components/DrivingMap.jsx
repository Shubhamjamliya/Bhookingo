import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker, OverlayView } from "@react-google-maps/api";
import { Loader2, Navigation, Pause, Play } from "lucide-react";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ["geometry", "drawing", "places"];
const ALT_ROUTE_STROKE = "#9ca3af";
const NAVIGATION_ZOOM = 11;
const LIVE_ROUTE_REFRESH_DISTANCE_METERS = 80;
const MOVEMENT_HEADING_MIN_DISTANCE_METERS = 8;
const CAMERA_PAN_MIN_DISTANCE_METERS = 14;
const CAMERA_PAN_MIN_INTERVAL_MS = 550;
const MUTED_MAP_STYLES = [
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5b6472" }]
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f7f7f5" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d9dde3" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eceae4" }]
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#f4f1ea" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ebe6db" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ddd4c4" }]
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#fbfbfa" }]
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dfe7ef" }]
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#edf2e6" }]
  }
];

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

function normalizeHeadingDegrees(value) {
  const headingValue = Number(value);
  return Number.isFinite(headingValue) ? (headingValue + 360) % 360 : null;
}

function offsetLatLng(point, headingDeg = 0, distanceMeters = 0) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !Number.isFinite(distanceMeters)) {
    return point;
  }

  const earthRadiusMeters = 6378137;
  const angularDistance = distanceMeters / earthRadiusMeters;
  const bearingRad = (headingDeg * Math.PI) / 180;
  const lat1 = (point.lat * Math.PI) / 180;
  const lng1 = (point.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function getNavigationCameraCenter(point, headingDeg = 0) {
  if (!point) return point;

  const cameraHeading = Number.isFinite(headingDeg) ? headingDeg : 0;
  const aheadPoint = offsetLatLng(point, cameraHeading, 280);
  return offsetLatLng(aheadPoint, cameraHeading + 90, 145);
}

function pointsAlmostEqual(a, b, tolerance = 0.000001) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) <= tolerance && Math.abs(a.lng - b.lng) <= tolerance;
}

function getApproxDistanceMeters(from, to) {
  if (!from || !to) return Number.POSITIVE_INFINITY;
  const avgLatRad = (((from.lat + to.lat) / 2) * Math.PI) / 180;
  const latMeters = (to.lat - from.lat) * 111320;
  const lngMeters = (to.lng - from.lng) * 111320 * Math.cos(avgLatRad);
  return Math.sqrt((latMeters * latMeters) + (lngMeters * lngMeters));
}

function getPathSnapInfo(path = [], point) {
  if (!Array.isArray(path) || path.length === 0 || !point) return null;
  if (path.length === 1) {
    return {
      point: path[0],
      segmentIndex: 0,
      distanceMeters: getApproxDistanceMeters(path[0], point)
    };
  }

  const lngScale = Math.max(0.000001, Math.cos((point.lat * Math.PI) / 180));
  const px = point.lng * lngScale;
  const py = point.lat;
  let best = null;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    if (!start || !end) continue;

    const ax = start.lng * lngScale;
    const ay = start.lat;
    const bx = end.lng * lngScale;
    const by = end.lat;
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = (abx * abx) + (aby * aby);
    const rawT = lengthSq <= 0 ? 0 : (((px - ax) * abx) + ((py - ay) * aby)) / lengthSq;
    const t = Math.max(0, Math.min(1, rawT));
    const snappedPoint = {
      lat: ay + (aby * t),
      lng: (ax + (abx * t)) / lngScale,
    };
    const distanceMeters = getApproxDistanceMeters(point, snappedPoint);

    if (!best || distanceMeters < best.distanceMeters) {
      best = {
        point: snappedPoint,
        segmentIndex: index,
        distanceMeters,
      };
    }
  }

  return best;
}

function buildRemainingRoutePath(path = [], snapInfo) {
  if (!Array.isArray(path) || path.length === 0) return [];
  if (!snapInfo?.point) return path;

  const nextIndex = Math.min((snapInfo.segmentIndex ?? 0) + 1, path.length - 1);
  const remainingPath = [snapInfo.point];

  for (let index = nextIndex; index < path.length; index += 1) {
    const routePoint = path[index];
    if (!pointsAlmostEqual(remainingPath[remainingPath.length - 1], routePoint, 0.0000001)) {
      remainingPath.push(routePoint);
    }
  }

  return remainingPath;
}

function fitFullRouteOverview(map, path = [], fallbackPoints = []) {
  if (!map || !window.google?.maps?.LatLngBounds) return false;

  const bounds = new window.google.maps.LatLngBounds();
  let pointCount = 0;

  path.forEach((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    bounds.extend(point);
    pointCount += 1;
  });

  fallbackPoints.forEach((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    bounds.extend(point);
    pointCount += 1;
  });

  if (!pointCount) return false;

  map.fitBounds(bounds, 96);
  return true;
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
  onUserPositionChange,
  allowLiveSimulation = false,
  recenterBottomOffset = "bottom-[140px]",
  orderedRestaurantIds = new Set()
}) {
  const mapRef = useRef(null);
  const markerAnimationFrameRef = useRef(null);
  const headingAnimationFrameRef = useRef(null);
  const mapFollowAnimationFrameRef = useRef(null);
  const displayedUserPositionRef = useRef(null);
  const displayedHeadingRef = useRef(0);
  const lastEmittedUserPositionRef = useRef(null);
  const mapCenterRef = useRef(DEFAULT_CENTER);
  const hasAutoFittedBoundsRef = useRef(false);
  const haloMarkerRef = useRef(null);
  const arrowMarkerRef = useRef(null);
  const lastStateUpdateRef = useRef(0);
  const lastHeadingUpdateRef = useRef(0);
  const lastLiveMovementSampleRef = useRef(null);
  const lastCameraPanAtRef = useRef(0);

  const [localRoutePath, setLocalRoutePath] = useState([]);
  const [alternateRoutePaths, setAlternateRoutePaths] = useState([]);
  const [isRotationEnabled, setIsRotationEnabled] = useState(true);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [displayedUserPosition, setDisplayedUserPosition] = useState(null);
  const [displayedHeading, setDisplayedHeading] = useState(0);
  const [derivedHeading, setDerivedHeading] = useState(null);

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

  const effectiveUserPosition = useMemo(() => {
    if (simulationPosition && Number.isFinite(simulationPosition.lat) && Number.isFinite(simulationPosition.lng)) {
      return { lat: simulationPosition.lat, lng: simulationPosition.lng };
    }
    if (hasUserLocation) {
      return { lat: userLat, lng: userLng };
    }
    return null;
  }, [simulationPosition?.lat, simulationPosition?.lng, hasUserLocation, userLat, userLng]);

  useEffect(() => {
    if (simulationPosition || !effectiveUserPosition) return;

    const previousSample = lastLiveMovementSampleRef.current;
    if (previousSample) {
      const movedDistanceMeters = getApproxDistanceMeters(previousSample, effectiveUserPosition);
      if (movedDistanceMeters >= MOVEMENT_HEADING_MIN_DISTANCE_METERS) {
        const nextHeading = getBearing(previousSample, effectiveUserPosition);
        console.log("[DrivingMap][Heading] derived from movement", {
          from: previousSample,
          to: effectiveUserPosition,
          nextHeading,
          movedDistanceMeters
        });
        setDerivedHeading((prev) => {
          if (!Number.isFinite(prev) || Math.abs(prev - nextHeading) > 0.5) {
            return nextHeading;
          }
          return prev;
        });
        lastLiveMovementSampleRef.current = effectiveUserPosition;
        return;
      }
    }

    if (!previousSample) {
      lastLiveMovementSampleRef.current = effectiveUserPosition;
    }
  }, [effectiveUserPosition, simulationPosition]);

  const navigationTargetInfo = useMemo(() => {
    if (!effectiveUserPosition) return null;

    if (simulationPosition && Array.isArray(localRoutePath) && localRoutePath.length >= 2) {
      const currentIndex = Math.min(simulationIndex, localRoutePath.length - 1);
      return {
        point: localRoutePath[currentIndex] || effectiveUserPosition,
        segmentIndex: Math.max(0, currentIndex - 1),
        distanceMeters: 0,
      };
    }

    return getPathSnapInfo(localRoutePath, effectiveUserPosition);
  }, [effectiveUserPosition, simulationPosition, simulationIndex, localRoutePath]);

  const navigationTargetPosition = useMemo(() => {
    return navigationTargetInfo?.point || effectiveUserPosition || null;
  }, [navigationTargetInfo, effectiveUserPosition]);

  const cursorTargetPosition = useMemo(() => {
    if (simulationPosition && navigationTargetPosition) {
      return navigationTargetPosition;
    }
    return effectiveUserPosition || navigationTargetPosition || null;
  }, [simulationPosition, effectiveUserPosition, navigationTargetPosition]);

  const visibleRouteSnapInfo = useMemo(() => {
    if (simulationPosition && navigationTargetInfo) {
      return navigationTargetInfo;
    }

    const routeAnchorPoint = cursorTargetPosition || displayedUserPosition || navigationTargetPosition;
    if (!routeAnchorPoint) return navigationTargetInfo;

    return getPathSnapInfo(localRoutePath, routeAnchorPoint) || navigationTargetInfo;
  }, [simulationPosition, navigationTargetInfo, cursorTargetPosition, displayedUserPosition, navigationTargetPosition, localRoutePath]);

  const visibleRoutePath = useMemo(() => {
    return buildRemainingRoutePath(localRoutePath, visibleRouteSnapInfo);
  }, [localRoutePath, visibleRouteSnapInfo]);

  const effectiveHeading = useMemo(() => {
    if (simulationPosition && localRoutePath.length >= 2) {
      const currentPoint = localRoutePath[Math.min(simulationIndex, localRoutePath.length - 2)] || simulationPosition;
      const nextPoint = localRoutePath[Math.min(simulationIndex + 1, localRoutePath.length - 1)] || simulationPosition;
      return getBearing(currentPoint, nextPoint);
    }

    const browserHeading = normalizeHeadingDegrees(heading);
    if (browserHeading !== null) {
      return browserHeading;
    }

    if (Number.isFinite(derivedHeading)) {
      return derivedHeading;
    }

    if (navigationTargetInfo && localRoutePath.length >= 2) {
      const startPoint = localRoutePath[navigationTargetInfo.segmentIndex] || navigationTargetPosition;
      const endPoint = localRoutePath[Math.min((navigationTargetInfo.segmentIndex ?? 0) + 1, localRoutePath.length - 1)] || navigationTargetPosition;
      return getBearing(startPoint, endPoint);
    }

    return 0;
  }, [simulationPosition, localRoutePath, simulationIndex, heading, derivedHeading, navigationTargetInfo, navigationTargetPosition]);

  const preferredCenter = useMemo(() => {
    return displayedUserPosition || cursorTargetPosition || navigationTargetPosition || DEFAULT_CENTER;
  }, [displayedUserPosition, cursorTargetPosition, navigationTargetPosition]);

  const applyMapOrientation = useCallback((headingValue = 0) => {
    if (!mapRef.current) return;
    const normalizedHeading = Number.isFinite(headingValue) ? headingValue : 0;
    const currentHeading = Number(mapRef.current.getHeading?.() ?? 0);
    const headingDelta = Math.abs((((normalizedHeading - currentHeading) + 540) % 360) - 180);

    if (isRotationEnabled && headingDelta > 1) {
      mapRef.current.setHeading(normalizedHeading);
    } else if (!isRotationEnabled && currentHeading !== 0) {
      mapRef.current.setHeading(0);
    }

    if (Number(mapRef.current.getTilt?.() ?? 0) !== 0) {
      mapRef.current.setTilt(0);
    }
  }, [isRotationEnabled]);

  useEffect(() => {
    console.log("[DrivingMap][Live] effectiveUserPosition", effectiveUserPosition);
  }, [effectiveUserPosition]);

  useEffect(() => {
    console.log("[DrivingMap][Live] navigationTargetPosition", navigationTargetPosition);
  }, [navigationTargetPosition]);

  useEffect(() => {
    console.log("[DrivingMap][Cursor] displayedUserPosition", displayedUserPosition);
  }, [displayedUserPosition]);

  useEffect(() => {
    console.log("[DrivingMap][Cursor] effectiveHeading", {
      headingProp: heading,
      derivedHeading,
      displayedHeading,
      simulationRunning: isSimulationRunning
    });
  }, [heading, derivedHeading, displayedHeading, isSimulationRunning]);

  useEffect(() => {
    if (!cursorTargetPosition) {
      displayedUserPositionRef.current = null;
      setDisplayedUserPosition((prev) => (prev ? null : prev));
      return undefined;
    }

    if (markerAnimationFrameRef.current) {
      window.cancelAnimationFrame(markerAnimationFrameRef.current);
      markerAnimationFrameRef.current = null;
    }

    const start = displayedUserPositionRef.current || cursorTargetPosition;
    const target = cursorTargetPosition;

    if (!displayedUserPositionRef.current) {
      displayedUserPositionRef.current = target;
      setDisplayedUserPosition(target);
      return undefined;
    }

    if (pointsAlmostEqual(start, target)) {
      displayedUserPositionRef.current = target;
      setDisplayedUserPosition((prev) => (pointsAlmostEqual(prev, target) ? prev : target));
      return undefined;
    }

    let cancelled = false;
    const startTime = performance.now();
    const durationMs = simulationPosition ? 650 : 900;

    const animate = (now) => {
      if (cancelled) return;
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextPosition = {
        lat: start.lat + (target.lat - start.lat) * eased,
        lng: start.lng + (target.lng - start.lng) * eased,
      };
      displayedUserPositionRef.current = nextPosition;

      if (haloMarkerRef.current) haloMarkerRef.current.setPosition(nextPosition);
      if (arrowMarkerRef.current) arrowMarkerRef.current.setPosition(nextPosition);

      if (now - lastStateUpdateRef.current > 400 || progress === 1) {
        lastStateUpdateRef.current = now;
        setDisplayedUserPosition(nextPosition);
      }

      if (progress < 1) {
        markerAnimationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        markerAnimationFrameRef.current = null;
      }
    };

    markerAnimationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      if (markerAnimationFrameRef.current) {
        window.cancelAnimationFrame(markerAnimationFrameRef.current);
        markerAnimationFrameRef.current = null;
      }
    };
  }, [cursorTargetPosition, simulationPosition]);

  useEffect(() => {
    if (headingAnimationFrameRef.current) {
      window.cancelAnimationFrame(headingAnimationFrameRef.current);
      headingAnimationFrameRef.current = null;
    }

    const targetHeading = Number.isFinite(effectiveHeading) ? effectiveHeading : 0;
    const startHeading = displayedHeadingRef.current;
    const normalizeDelta = ((targetHeading - startHeading + 540) % 360) - 180;

    if (Math.abs(normalizeDelta) < 0.5) {
      displayedHeadingRef.current = targetHeading;
      setDisplayedHeading(targetHeading);
      return undefined;
    }

    let cancelled = false;
    const startTime = performance.now();
    const durationMs = 500;

    const animateHeading = (now) => {
      if (cancelled) return;
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextHeading = (startHeading + normalizeDelta * eased + 360) % 360;
      displayedHeadingRef.current = nextHeading;

      if (arrowMarkerRef.current) {
        const icon = arrowMarkerRef.current.getIcon();
        if (icon) {
          icon.rotation = nextHeading;
          arrowMarkerRef.current.setIcon(icon);
        }
      }

      if (now - lastHeadingUpdateRef.current > 250 || progress === 1) {
        lastHeadingUpdateRef.current = now;
        setDisplayedHeading(nextHeading);
      }

      if (progress < 1) {
        headingAnimationFrameRef.current = window.requestAnimationFrame(animateHeading);
      } else {
        headingAnimationFrameRef.current = null;
      }
    };

    headingAnimationFrameRef.current = window.requestAnimationFrame(animateHeading);
    return () => {
      cancelled = true;
      if (headingAnimationFrameRef.current) {
        window.cancelAnimationFrame(headingAnimationFrameRef.current);
        headingAnimationFrameRef.current = null;
      }
    };
  }, [effectiveHeading]);

  useEffect(() => {
    if (typeof onUserPositionChange !== "function") return;
    if (!displayedUserPosition) {
      lastEmittedUserPositionRef.current = null;
      onUserPositionChange(null);
      return;
    }
    if (pointsAlmostEqual(lastEmittedUserPositionRef.current, displayedUserPosition, 0.0000004)) {
      return;
    }

    const nextPosition = {
      lat: displayedUserPosition.lat,
      lng: displayedUserPosition.lng,
      latitude: displayedUserPosition.lat,
      longitude: displayedUserPosition.lng,
    };
    lastEmittedUserPositionRef.current = nextPosition;
    onUserPositionChange(nextPosition);
  }, [displayedUserPosition, onUserPositionChange]);

  const prevBoundsKeyRef = useRef("");
  const routeRequestedRef = useRef("");

  const selectedRouteId = journey?.selectedRouteId || journey?.selectedHighway?.routeId || journey?.selectedHighway?._id;

  const selectedRouteIndex = useMemo(() => {
    const match = typeof selectedRouteId === "string" ? selectedRouteId.match(/google_route_(\d+)/) : null;
    if (!match) return 0;
    const parsedIndex = Number(match[1]) - 1;
    return Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  }, [selectedRouteId]);

  // Switch between follow-camera navigation and full trip overview.
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current) return;

    if (isFollowingUser && (displayedUserPosition || cursorTargetPosition || navigationTargetPosition)) {
      const focusCenter = getNavigationCameraCenter(displayedUserPosition || cursorTargetPosition || navigationTargetPosition, displayedHeadingRef.current);
      mapCenterRef.current = focusCenter;
      mapRef.current.setCenter(focusCenter);
      mapRef.current.setZoom(NAVIGATION_ZOOM);
      applyMapOrientation(displayedHeadingRef.current || 0);
      return;
    }

    const fallbackPoints = [];
    if (hasUserLocation) {
      fallbackPoints.push({ lat: userLat, lng: userLng });
    }
    if (hasDestLocation) {
      fallbackPoints.push({ lat: destLat, lng: destLng });
    }

    const overviewApplied = fitFullRouteOverview(mapRef.current, localRoutePath, fallbackPoints);
    if (!overviewApplied && hasDestLocation) {
      const destinationCenter = { lat: destLat, lng: destLng };
      mapCenterRef.current = destinationCenter;
      mapRef.current.setCenter(destinationCenter);
      mapRef.current.setZoom(9);
    }

    applyMapOrientation(0);
  }, [isFollowingUser, displayedUserPosition, cursorTargetPosition, navigationTargetPosition, hasUserLocation, userLat, userLng, hasDestLocation, destLat, destLng, localRoutePath, applyMapOrientation]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    fitMapBounds();
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    if (markerAnimationFrameRef.current) {
      window.cancelAnimationFrame(markerAnimationFrameRef.current);
      markerAnimationFrameRef.current = null;
    }
    if (headingAnimationFrameRef.current) {
      window.cancelAnimationFrame(headingAnimationFrameRef.current);
      headingAnimationFrameRef.current = null;
    }
    if (mapFollowAnimationFrameRef.current) {
      window.cancelAnimationFrame(mapFollowAnimationFrameRef.current);
      mapFollowAnimationFrameRef.current = null;
    }
    displayedUserPositionRef.current = null;
    mapRef.current = null;
  }, []);

  const handleRecenter = useCallback((e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
    }

    setIsFollowingUser(true);
    setIsRotationEnabled(true);

    if (mapRef.current) {
      if (displayedUserPosition || cursorTargetPosition || navigationTargetPosition) {
        const nextCenter = getNavigationCameraCenter(displayedUserPosition || cursorTargetPosition || navigationTargetPosition, displayedHeadingRef.current);
        mapCenterRef.current = nextCenter;
        mapRef.current.setCenter(nextCenter);
        mapRef.current.setZoom(NAVIGATION_ZOOM);
      }
    }
  }, [displayedUserPosition, cursorTargetPosition, navigationTargetPosition]);

  // Use the route geometry that was already resolved during journey planning/live route sync.
  useEffect(() => {
    if (!hasDestLocation) {
      setLocalRoutePath([]);
      setAlternateRoutePaths([]);
      return;
    }

    const cachedActivePath = selectedRouteId ? journey?.routeGeometryCache?.[selectedRouteId]?.activePath : null;
    const cachedPathStart = Array.isArray(cachedActivePath) && cachedActivePath.length > 0 ? cachedActivePath[0] : null;
    const canReuseCachedPath = Array.isArray(cachedActivePath)
      && cachedActivePath.length >= 2
      && (!hasUserLocation || getApproxDistanceMeters(cachedPathStart, { lat: userLat, lng: userLng }) <= LIVE_ROUTE_REFRESH_DISTANCE_METERS);

    if (canReuseCachedPath) {
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
      return;
    }

    if (Array.isArray(journey?.availableRoutes) && journey.availableRoutes.length > 0) {
      const routePaths = journey.availableRoutes
        .map((routeOption) => Array.isArray(routeOption.coordinates) ? routeOption.coordinates : [])
        .filter((routePath) => routePath.length >= 2);

      if (routePaths.length > 0) {
        const activeRoutePath = routePaths[selectedRouteIndex] || routePaths[0] || [];
        setLocalRoutePath(activeRoutePath);
        setAlternateRoutePaths(
          routePaths
            .map((path, index) => ({
              path,
              routeOption: Array.isArray(journey?.availableRoutes) ? journey.availableRoutes[index] : null,
              routeIndex: index
            }))
            .filter((routeEntry) => routeEntry.routeIndex !== selectedRouteIndex && Array.isArray(routeEntry.path) && routeEntry.path.length >= 2)
        );
        return;
      }
    }

    if (journey?.routePolyline && Array.isArray(journey.routePolyline) && journey.routePolyline.length >= 2) {
      setLocalRoutePath(journey.routePolyline);
      setAlternateRoutePaths([]);
      return;
    }

    setLocalRoutePath([]);
    setAlternateRoutePaths([]);
  }, [
    hasUserLocation,
    userLat,
    userLng,
    hasDestLocation,
    selectedRouteIndex,
    journey?.routePolyline,
    journey?.routeGeometryCache,
    journey?.availableRoutes,
    selectedRouteId
  ]);

  // Fit bounds when route context changes, not on every user position update.
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const currentKey = `${destLat || ""}_${destLng || ""}_${(restaurants || []).length}_${selectedRouteId || ""}`;
    if (currentKey !== prevBoundsKeyRef.current) {
      prevBoundsKeyRef.current = currentKey;
      hasAutoFittedBoundsRef.current = true;
      fitMapBounds();
    }
  }, [isLoaded, destLat, destLng, restaurants?.length, fitMapBounds, selectedRouteId]);


  useEffect(() => {
    if (allowLiveSimulation) return;
    if (isSimulationRunning) {
      setIsSimulationRunning(false);
    }
    if (simulationIndex !== 0) {
      setSimulationIndex(0);
    }
  }, [allowLiveSimulation, isSimulationRunning, simulationIndex]);

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
    if (!mapRef.current) return;
    applyMapOrientation(displayedHeading || 0);
  }, [displayedHeading, applyMapOrientation]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!isFollowingUser || !(cursorTargetPosition || navigationTargetPosition)) {
      applyMapOrientation(displayedHeadingRef.current || 0);
      return;
    }

    const targetCenter = getNavigationCameraCenter(cursorTargetPosition || navigationTargetPosition, displayedHeadingRef.current);
    const distanceToTargetCenter = getApproxDistanceMeters(mapCenterRef.current, targetCenter);
    const now = Date.now();

    if (
      pointsAlmostEqual(mapCenterRef.current, targetCenter, 0.00001) ||
      (distanceToTargetCenter < CAMERA_PAN_MIN_DISTANCE_METERS && (now - lastCameraPanAtRef.current) < CAMERA_PAN_MIN_INTERVAL_MS)
    ) {
      applyMapOrientation(displayedHeadingRef.current || 0);
      return;
    }

    mapCenterRef.current = targetCenter;
    lastCameraPanAtRef.current = now;
    
    // Use native Google Maps panning. This avoids the 60fps setCenter() calls which cause tile white-outs.
    mapRef.current.panTo(targetCenter);

    applyMapOrientation(displayedHeadingRef.current || 0);
  }, [cursorTargetPosition, navigationTargetPosition, simulationPosition, isFollowingUser, applyMapOrientation]);

  const handleToggleNavigationMode = useCallback(() => {
    const nextMode = !isFollowingUser;
    setIsFollowingUser(nextMode);
    setIsRotationEnabled(nextMode);

    if (!mapRef.current) return;

    if (nextMode) {
      const focusPoint = displayedUserPositionRef.current || displayedUserPosition || cursorTargetPosition || navigationTargetPosition;
      const focusHeading = displayedHeadingRef.current || effectiveHeading || 0;
      if (focusPoint) {
        const nextCenter = getNavigationCameraCenter(focusPoint, focusHeading);
        mapCenterRef.current = nextCenter;
        lastCameraPanAtRef.current = Date.now();
        mapRef.current.setCenter(nextCenter);
        mapRef.current.setZoom(NAVIGATION_ZOOM);
      }
      applyMapOrientation(focusHeading);
      return;
    }

    const fallbackPoints = [];
    if (hasUserLocation) {
      fallbackPoints.push({ lat: userLat, lng: userLng });
    }
    if (hasDestLocation) {
      fallbackPoints.push({ lat: destLat, lng: destLng });
    }

    const overviewApplied = fitFullRouteOverview(mapRef.current, localRoutePath, fallbackPoints);
    if (!overviewApplied && hasDestLocation) {
      const destinationCenter = { lat: destLat, lng: destLng };
      mapCenterRef.current = destinationCenter;
      mapRef.current.setCenter(destinationCenter);
      mapRef.current.setZoom(9);
    }

    applyMapOrientation(0);
  }, [isFollowingUser, displayedUserPosition, cursorTargetPosition, navigationTargetPosition, effectiveHeading, hasUserLocation, userLat, userLng, hasDestLocation, destLat, destLng, localRoutePath, applyMapOrientation]);

  const handleToggleSimulation = useCallback(() => {
    if (localRoutePath.length < 2) return;
    setSimulationIndex((prev) => {
      if (!isSimulationRunning && prev >= localRoutePath.length - 1) {
        return 0;
      }
      return prev;
    });
    if (!isSimulationRunning) {
      setIsFollowingUser(true);
      setIsRotationEnabled(true);
    }
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
        defaultCenter={DEFAULT_CENTER}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}

        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: MUTED_MAP_STYLES,
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
        {visibleRoutePath.length >= 2 && (
          <Polyline
            path={visibleRoutePath}
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
        {(displayedUserPosition || cursorTargetPosition || navigationTargetPosition) && (
          <Marker
            onLoad={(m) => { haloMarkerRef.current = m; }}
            position={displayedUserPosition || cursorTargetPosition || navigationTargetPosition}
            options={{
              icon: {
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: 20,
                fillColor: "#ffffff",
                fillOpacity: 0.22,
                strokeColor: "#0ea5e9",
                strokeWeight: 1.5,
              },
              clickable: false,
              zIndex: 98,
            }}
          />
        )}

        {/* User Location Marker (Navigation Arrow with smooth rotation) */}
        {(displayedUserPosition || cursorTargetPosition || navigationTargetPosition) && (
          <Marker
            onLoad={(m) => { arrowMarkerRef.current = m; }}
            position={displayedUserPosition || cursorTargetPosition || navigationTargetPosition}
            options={{
              icon: {
                path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                scale: 1.4,
                fillColor: "#0284c7",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                rotation: displayedHeading || 0,
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

            const rId = String(r._id || r.id || idx);
            const isOrdered = orderedRestaurantIds && orderedRestaurantIds.has(rId);
            const markerColor = isOrdered ? "#16a34a" : "#ea580c";
            const borderColor = isOrdered ? "border-green-400" : "border-orange-200";

            return (
              <Marker
                key={rId}
                position={{ lat: rlat, lng: rlng }}
                onClick={() => onRestaurantClick(r)}
                options={{
                  icon: {
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: markerColor,
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 1.5,
                    scale: 1.6,
                    anchor: new window.google.maps.Point(12, 24),
                    labelOrigin: new window.google.maps.Point(12, -10)
                  },
                  label: {
                    text: `${r.distanceKm} km`,
                    color: markerColor,
                    fontWeight: "900",
                    fontSize: "11px",
                    className: `bg-white/90 dark:bg-neutral-900/90 border ${borderColor} px-1.5 py-0.5 rounded shadow-sm`
                  },
                  title: r.restaurantName,
                  zIndex: 50 + seenCount,
                }}
              />
            );
          });
        })()}
      </GoogleMap>

      <div className={`absolute right-4 z-30 flex flex-col gap-3 pointer-events-none ${recenterBottomOffset === 'hidden' ? 'hidden' : 'bottom-[368px]'}`}>
        <button
          type="button"
          onClick={handleToggleNavigationMode}
          className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all ${isFollowingUser
            ? "border-orange-300 bg-orange-500 text-white"
            : "border-gray-200/80 bg-white text-gray-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            }`}
          title={isFollowingUser ? "Navigation on" : "Navigation off"}
        >
          <Navigation className="h-4 w-4" />
        </button>
        {allowLiveSimulation && (
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
        )}
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
