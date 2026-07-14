import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, ShieldAlert } from "lucide-react";
import { Button } from "@food/components/ui/button";

export default function DrivingLocationPermission({ 
  denied = false, 
  onEnableLocation,
  onRetry
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-6 text-center">
      <div className="max-w-sm w-full space-y-8 bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-800 animate-in fade-in zoom-in duration-300">
        
        {/* Icon Header */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-orange-100 dark:bg-orange-900/30 rounded-full animate-ping opacity-75"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-orange-100 dark:bg-orange-900/50 rounded-full border-4 border-white dark:border-[#1a1a1a] shadow-sm">
            {denied ? (
              <ShieldAlert className="w-10 h-10 text-red-500" />
            ) : (
              <MapPin className="w-10 h-10 text-orange-500" />
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {denied ? "Permission Denied" : "Enable Location"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {denied 
              ? "Please enable location permission from your browser settings to use Driving Mode."
              : "Driving Mode needs your live location to find restaurants ahead on your highway route."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {denied ? (
            <Button
              onClick={onRetry}
              className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md"
            >
              Try Again
            </Button>
          ) : (
            <Button
              onClick={onEnableLocation}
              className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4 fill-current" />
              Enable Location
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/food/user")}
            className="w-full h-12 rounded-xl border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-gray-300 font-bold text-sm"
          >
            Go Home
          </Button>
        </div>

      </div>
    </div>
  );
}
