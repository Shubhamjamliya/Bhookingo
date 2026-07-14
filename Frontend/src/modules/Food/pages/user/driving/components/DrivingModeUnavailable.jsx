import React from "react";
import { useNavigate } from "react-router-dom";
import { RouteOff, MapPinOff, AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@food/components/ui/button";

export default function DrivingModeUnavailable({
  status, // "location_denied" | "outside_highway_range" | "error" | "disabled"
  distanceMeters,
  requiredDistanceMeters,
  onRetry,
  onEnableLocation
}) {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/food/user/takeaway");
  };

  // 1. Driving Mode Disabled State
  if (status === "disabled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-gray-50 dark:bg-[#0a0a0a]">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-gray-900 dark:text-white">Driving Mode Unavailable</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md">
          Driving Mode is temporarily unavailable. We apologize for the inconvenience. Please try again later.
        </p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handleBackToHome}
            className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // 2. Location Permission Denied State
  if (status === "location_denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-gray-50 dark:bg-[#0a0a0a]">
        <MapPinOff className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-black text-gray-900 dark:text-white">Location Access Required</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md">
          Location access is required for Driving Mode. Please enable location permission in your browser or device settings to start discovering restaurants on your route.
        </p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={onEnableLocation}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Enable Location
          </Button>
          <Button
            variant="outline"
            onClick={handleBackToHome}
            className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // 3. Outside Highway Range State
  if (status === "outside_highway_range") {
    const actualKm = distanceMeters ? (distanceMeters / 1000).toFixed(1) : null;
    const requiredKm = requiredDistanceMeters ? (requiredDistanceMeters / 1000).toFixed(0) : "2";

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-gray-50 dark:bg-[#0a0a0a]">
        <RouteOff className="w-16 h-16 text-orange-500 mb-4" />
        <h3 className="text-xl font-black text-gray-900 dark:text-white">Driving Mode is unavailable</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md leading-relaxed">
          You are currently not within {requiredKm} KM of a National Highway. Move closer to a highway to discover restaurants ahead on your route.
        </p>

        {/* Proximity Stats Card */}
        {actualKm && (
          <div className="mt-6 w-full max-w-xs bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-neutral-800 p-4 rounded-2xl shadow-sm grid grid-cols-2 gap-4">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400">Your Distance</span>
              <p className="text-lg font-black text-red-600 leading-tight mt-0.5">{actualKm} KM</p>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-gray-400">Required Limit</span>
              <p className="text-lg font-black text-green-600 leading-tight mt-0.5">{requiredKm} KM</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={onRetry}
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={handleBackToHome}
            className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // 4. API / Server Error State
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-gray-50 dark:bg-[#0a0a0a]">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
      <h3 className="text-xl font-black text-gray-900 dark:text-white">API Connection Error</h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md">
        Failed to fetch driving configuration settings or highway API error. Please check your network connection and try again.
      </p>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onRetry}
          className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={handleBackToHome}
          className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
