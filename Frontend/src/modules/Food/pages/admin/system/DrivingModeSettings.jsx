import { useEffect, useRef, useState } from "react";
import { Loader2, Navigation, Shield, Route, TimerReset } from "lucide-react";
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
  const [enableLiveSimulation, setEnableLiveSimulation] = useState(false);
  const [normalModeDiscoveryRadiusKm, setNormalModeDiscoveryRadiusKm] = useState(100);
  const [googleRouteSearchRadiusKm, setGoogleRouteSearchRadiusKm] = useState(15);
  const [googleRouteForwardRangeKm, setGoogleRouteForwardRangeKm] = useState(100);
  const [googleRouteBackwardBufferKm, setGoogleRouteBackwardBufferKm] = useState(0.5);
  const [onboardingRoadRangeKm, setOnboardingRoadRangeKm] = useState(2);
  const [showAllRouteRestaurants, setShowAllRouteRestaurants] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getDrivingModeSettings();
        if (!cancelled) {
          const data = res?.data?.data || {};
          setEnabled(data.enabled !== false);
          setEnableLiveSimulation(data.enableLiveSimulation === true);
          setNormalModeDiscoveryRadiusKm(Number(data.normalModeDiscoveryRadiusKm) || 100);
          setOnboardingRoadRangeKm((Number(data.highwayEntryRadiusMeters) || 2000) / 1000);
          setGoogleRouteSearchRadiusKm(Number(data.googleRouteSearchRadiusKm) || 15);
          setGoogleRouteForwardRangeKm(Number(data.googleRouteForwardRangeKm) || 100);
          setGoogleRouteBackwardBufferKm(Number(data.googleRouteBackwardBufferKm) >= 0 ? Number(data.googleRouteBackwardBufferKm) : 0.5);
          setShowAllRouteRestaurants(data.showAllRouteRestaurants === true);
        }
      } catch (_error) {
        if (!cancelled && !loadToastShownRef.current) {
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
        enableLiveSimulation,
        normalModeDiscoveryRadiusKm,
        highwayEntryRadiusMeters: Math.round(Number(onboardingRoadRangeKm || 0) * 1000),
        googleRouteSearchRadiusKm,
        googleRouteForwardRangeKm,
        googleRouteBackwardBufferKm,
        showAllRouteRestaurants,
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
          Configure the single Google Maps driving flow from one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="dark:bg-[#1a1a1a] dark:border-neutral-800 shadow-md">
          <CardHeader className="border-b dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              <CardTitle className="dark:text-white">Driving Mode</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 p-4 border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-800">
              <div className="space-y-1">
                <Label className="text-base font-bold dark:text-neutral-200">Enable Driving Mode</Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                  Toggle to turn Driving Mode ON or OFF globally for the user application.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                className="scale-95 data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-800">
              <div className="space-y-1">
                <Label className="text-base font-bold dark:text-neutral-200">Enable Live Simulation Button</Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                  Shows the play or pause simulation control on the live driving map for testing. Keep this OFF for real GPS tracking only.
                </p>
              </div>
              <Switch
                checked={enableLiveSimulation}
                onCheckedChange={setEnableLiveSimulation}
                className="scale-95 data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-gray-500" />
                Radius To Show Rest In User App In Normal Mode (KM)
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                required
                value={normalModeDiscoveryRadiusKm}
                onChange={(e) => setNormalModeDiscoveryRadiusKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Approved restaurants within this radius from the user location are shown on the normal user restaurants page.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-gray-500" />
                Forward Distance Range (KM)
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                required
                value={googleRouteForwardRangeKm}
                onChange={(e) => setGoogleRouteForwardRangeKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Maximum distance ahead of the user to scan for restaurants.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <TimerReset className="w-4 h-4 text-gray-500" />
                Backward Tolerance Range (KM)
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                step="0.1"
                required
                value={googleRouteBackwardBufferKm}
                onChange={(e) => setGoogleRouteBackwardBufferKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Small allowance behind the user so nearby restaurants are not hidden because of GPS drift.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Route className="w-4 h-4 text-gray-500" />
                Sideward Search Range (KM)
              </Label>
              <Input
                type="number"
                min={1}
                max={50}
                required
                value={googleRouteSearchRadiusKm}
                onChange={(e) => setGoogleRouteSearchRadiusKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Restaurants must fall within this sideways distance from the route line to be shown.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-500" />
                Onboarding Sideward Range (KM)
              </Label>
              <Input
                type="number"
                min={0.1}
                max={10}
                step="0.1"
                required
                value={onboardingRoadRangeKm}
                onChange={(e) => setOnboardingRoadRangeKm(Number(e.target.value))}
                className="max-w-md bg-white border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 transition-all"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Road-distance limit used while onboarding or adding a highway restaurant.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-800">
              <div className="space-y-1">
                <Label className="text-base font-bold dark:text-neutral-200">Show All Restaurants On Route</Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                  When enabled, route listing keeps all valid restaurants on the selected route without forward-distance filtering.
                </p>
              </div>
              <Switch
                checked={showAllRouteRestaurants}
                onCheckedChange={setShowAllRouteRestaurants}
                className="scale-95 data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
              />
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              These settings now fully control route-side restaurant matching and highway onboarding checks.
            </p>
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
