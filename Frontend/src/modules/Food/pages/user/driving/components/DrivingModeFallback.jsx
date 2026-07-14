import React from "react";
import { useNavigate } from "react-router-dom";
import { NavigationOff, MapPinOff, Route, AlertCircle, RefreshCcw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@food/components/ui/button";

export default function DrivingModeFallback({
  status, // "OUTSIDE_HIGHWAY" | "NO_RESTAURANTS" | "AUTH_ERROR" | "ERROR" | "location_denied" | "disabled"
  distanceMeters,
  requiredDistanceMeters,
  onRetry,
  onEnableLocation,
  errorMessage
}) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/food/user");
  };

  // Case 1: Driving Mode Disabled
  if (status === "disabled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600 animate-pulse" />
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white">Driving Mode unavailable</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md">
          Driving Mode is temporarily unavailable. We apologize for the inconvenience. Please try again later.
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handleGoHome}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Case 2: Location Permission Denied
  if (status === "location_denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mb-6">
          <MapPinOff className="w-10 h-10 text-orange-600 animate-bounce" />
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white">Location access required</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md">
          Location access is required for Driving Mode. Please enable location permission.
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={onEnableLocation}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <RefreshCcw className="w-4 h-4" />
            Enable Location
          </Button>
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Case 3: Outside Highway Range
  if (status === "OUTSIDE_HIGHWAY") {
    const currentDistance = distanceMeters ? (distanceMeters / 1000).toFixed(1) : "—";
    const requiredDistance = requiredDistanceMeters ? (requiredDistanceMeters / 1000).toFixed(0) : "2";

    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mb-6">
          <Route className="w-10 h-10 text-orange-600 animate-pulse" />
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white">Driving Mode unavailable</h3>
        <p className="text-sm font-semibold text-gray-500 dark:text-neutral-400 mt-2">
          You are not currently near a National Highway.
        </p>
        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 max-w-sm">
          Driving Mode works when you are within {requiredDistance} KM of an active highway.
        </p>

        {/* Distance Proximity Box */}
        {distanceMeters !== undefined && distanceMeters !== null && (
          <div className="mt-6 w-full max-w-xs bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800/60 p-4 rounded-2xl grid grid-cols-2 gap-4">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current distance</span>
              <p className="text-lg font-black text-orange-600 leading-tight mt-0.5">{currentDistance} KM</p>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-neutral-850">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Required</span>
              <p className="text-lg font-black text-green-600 leading-tight mt-0.5">{requiredDistance} KM</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={onRetry}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Case 4: No Restaurants Found
  if (status === "NO_RESTAURANTS") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mb-6">
          <NavigationOff className="w-10 h-10 text-orange-600" />
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white">No restaurants ahead</h3>
        <p className="text-sm font-semibold text-gray-500 dark:text-neutral-400 mt-2">
          We could not find any restaurants ahead on your route.
        </p>
        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 max-w-sm">
          Try again after moving forward.
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={onRetry}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Case 5: Authentication Error
  if (status === "AUTH_ERROR") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white">Session expired</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-xs">
          Please login again to continue using Driving Mode.
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handleGoHome}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Case 6: API / Network Failure (ERROR)
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center bg-white dark:bg-[#121212]">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-650" />
      </div>

      <h3 className="text-xl font-black text-gray-900 dark:text-white">
        {errorMessage ? "Unable to get your location" : "Something went wrong"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-xs">
        {errorMessage || "We couldn't load restaurants ahead. Please try again."}
      </p>

      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onRetry}
          className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry
        </Button>
        <Button
          variant="outline"
          onClick={handleGoHome}
          className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
