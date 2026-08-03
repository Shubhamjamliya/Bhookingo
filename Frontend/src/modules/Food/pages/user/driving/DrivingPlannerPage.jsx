import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import JourneyPlanner from "./components/JourneyPlanner";
import BottomNavigation from "@food/components/user/BottomNavigation";

const DRIVING_JOURNEY_KEY = "bh_active_journey";
const DRIVING_RESULT_KEY = "bh_driving_result_data";
const DRIVING_STATUS_KEY = "bh_driving_status";
const DRIVING_ROUTE_RESULTS_KEY = "bh_driving_route_results";

const clearDrivingCache = () => {
  sessionStorage.removeItem(DRIVING_JOURNEY_KEY);
  sessionStorage.removeItem(DRIVING_RESULT_KEY);
  sessionStorage.removeItem(DRIVING_STATUS_KEY);
  sessionStorage.removeItem(DRIVING_ROUTE_RESULTS_KEY);
};

export default function DrivingPlannerPage() {
  const navigate = useNavigate();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasActiveJourney, setHasActiveJourney] = useState(() => Boolean(sessionStorage.getItem(DRIVING_JOURNEY_KEY)));

  useEffect(() => {
    const storedJourney = sessionStorage.getItem(DRIVING_JOURNEY_KEY);
    setHasActiveJourney(Boolean(storedJourney));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleJourneyPlanSelected = useCallback((plan) => {
    const selectedRouteId = plan.highway?.routeId || plan.highway?._id || null;
    const initialJourney = {
      origin: plan.origin,
      destination: plan.destination,
      selectedHighway: plan.highway,
      selectedRouteId,
      availableRoutes: Array.isArray(plan.availableRoutes) ? plan.availableRoutes : (plan.highway ? [plan.highway] : []),
      routePolyline: Array.isArray(plan.highway?.coordinates) ? plan.highway.coordinates : [],
      estimatedDistance: plan.highway?.distanceText || "",
      estimatedDuration: plan.highway?.durationText || "",
      routeBounds: plan.highway?.boundingBox || null,
      routeGeometryCache: selectedRouteId && Array.isArray(plan.highway?.coordinates) && plan.highway.coordinates.length >= 2
        ? { [selectedRouteId]: { activePath: plan.highway.coordinates } }
        : {},
      createdAt: new Date().toISOString(),
      mode: "PLANNED"
    };

    sessionStorage.setItem(DRIVING_JOURNEY_KEY, JSON.stringify(initialJourney));
    setHasActiveJourney(true);
    navigate("/food/user/driving/live", { replace: true });
  }, [navigate]);

  if (hasActiveJourney) {
    return <Navigate to="/food/user/driving/live" replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
      <div className="flex-1 overflow-y-auto pb-4 animate-fade-in">
        <JourneyPlanner
          currentLocation={currentLocation}
          onJourneyPlanSelected={handleJourneyPlanSelected}
          onGoHome={() => {
            clearDrivingCache();
            navigate("/food/user/restaurants");
          }}
        />
      </div>
      <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
        <BottomNavigation />
      </div>
    </div>
  );
}
