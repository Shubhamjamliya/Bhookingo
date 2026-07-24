import { useEffect, useRef, useState } from "react";
import { Settings, Loader2, SlidersHorizontal, Navigation, Shield, Compass } from "lucide-react";
import { toast } from "sonner";
import { adminAPI } from "@food/api";
import { Card, CardHeader, CardTitle, CardContent } from "@food/components/ui/card";
import { Label } from "@food/components/ui/label";
import { Switch } from "@food/components/ui/switch";
import { Input } from "@food/components/ui/input";
import { Button } from "@food/components/ui/button";

const getAdminToastOffsetPx = () => {
  try {
    if (typeof window === "undefined") return 0;
    if (window.innerWidth < 1024) return 0;

    const raw = localStorage.getItem("admin_sidebar_state");
    const isCollapsed = raw ? Boolean(JSON.parse(raw)?.isCollapsed) : false;
    return isCollapsed ? 40 : 160;
  } catch {
    return 0;
  }
};

export default function DrivingModeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadToastShownRef = useRef(false);

  const [enabled, setEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [rangeKm, setRangeKm] = useState(50);
  const [entryRadiusMeters, setEntryRadiusMeters] = useState(2000);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getDrivingModeSettings();
        if (!cancelled) {
          const data = res?.data?.data || {};
          setEnabled(data.enabled !== false);
          setRefreshInterval(Number(data.locationRefreshIntervalMinutes) || 5);
          setRangeKm(Number(data.restaurantSearchRadiusKm) || 50);
          setEntryRadiusMeters(Number(data.highwayEntryRadiusMeters) || 2000);
        }
      } catch (_error) {
        if (!cancelled) {
          if (!loadToastShownRef.current) {
            loadToastShownRef.current = true;
            toast.error("Failed to load driving mode settings", {
              duration: 2000,
              style: {
                width: "fit-content",
                maxWidth: "calc(100vw - 32px)",
                marginLeft: `${getAdminToastOffsetPx()}px`,
              },
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        enabled,
        locationRefreshIntervalMinutes: refreshInterval,
        restaurantSearchRadiusKm: rangeKm,
        highwayEntryRadiusMeters: entryRadiusMeters
      };

      await adminAPI.updateDrivingModeSettings(payload);

      toast.success("Driving mode settings updated successfully", {
        duration: 2000,
        style: {
          width: "fit-content",
          maxWidth: "calc(100vw - 32px)",
          marginLeft: `${getAdminToastOffsetPx()}px`,
        },
      });
    } catch (_error) {
      toast.error("Failed to save settings", {
        duration: 2000,
        style: {
          width: "fit-content",
          maxWidth: "calc(100vw - 32px)",
          marginLeft: `${getAdminToastOffsetPx()}px`,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
        <p className="text-neutral-500 font-medium">Fetching settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <div className="inline-flex items-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-7 h-7 text-neutral-800 dark:text-neutral-200" />
            Driving Mode Settings
          </h1>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Configure live validation, map update intervals, and search radius for the highway restaurant feature.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="dark:bg-[#1a1a1a] dark:border-neutral-800 shadow-md">
          <CardHeader className="border-b dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              <CardTitle className="dark:text-white">Feature Toggle & Parameters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* Enabled Switch */}
            <div className="flex items-start justify-between gap-4 p-4 border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-800">
              <div className="space-y-1">
                <Label className="text-base font-bold dark:text-neutral-200">Enable Driving Mode</Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                  Toggle to turn Driving Mode feature ON or OFF globally for the user application.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                className="scale-95 data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
              />
            </div>

            {/* Refresh Interval Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-gray-500" />
                Driving Mode Location Refresh Interval
              </Label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full max-w-md h-10 px-3 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#121212] dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
              >
                <option value={1}>1 Minute</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Determines how often the user app refreshes and fetches new restaurants ahead. High intervals save server/Map API costs.
              </p>
            </div>

            {/* Restaurant range input */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-gray-500" />
                Driving Mode Restaurant Range (KM)
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                required
                value={rangeKm}
                onChange={(e) => setRangeKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Controls how far ahead (in Kilometers) restaurants can appear and be pre-ordered by users on the highway.
              </p>
            </div>

            {/* Highway Proximity Verification Threshold */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-500" />
                Highway Entry Proximity Radius (Meters)
              </Label>
              <Input
                type="number"
                min={100}
                max={10000}
                required
                value={entryRadiusMeters}
                onChange={(e) => setEntryRadiusMeters(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Distance threshold (in meters) within which a user must be to a National Highway to activate Driving Mode.
              </p>
            </div>

          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="px-6 h-11 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md flex items-center gap-2 rounded-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
