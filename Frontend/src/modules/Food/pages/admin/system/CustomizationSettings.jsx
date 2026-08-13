import { useEffect, useRef, useState } from "react";
import { Settings, Loader2, SlidersHorizontal, Info } from "lucide-react";
import { toast } from "sonner";
import { adminAPI } from "@food/api";
import { Card, CardHeader, CardTitle, CardContent } from "@food/components/ui/card";
import { Label } from "@food/components/ui/label";
import { Switch } from "@food/components/ui/switch";

const CUSTOMIZATION_TOGGLES = [
  {
    key: "cod_enabled",
    label: "Global COD",
    description: "Global COD Settings",
    defaultValue: true,
  },
  {
    key: "takeaway_cod_enabled",
    label: "Takeaway COD",
    description: "Takeaway COD Settings",
    defaultValue: true,
  },

  {
    key: "dining_cod_enabled",
    label: "Dining COD",
    description: "Dining COD Settings",
    defaultValue: true,
  },
  {
    key: "wallet_payment_enabled",
    label: "Wallet Payment",
    description:
      "Controls visibility of wallet payment method at checkout.",
    defaultValue: true,
  },
  {
    key: "online_payment_enabled",
    label: "Online Payment",
    description:
      "Controls visibility of Razorpay online payment at checkout.",
    defaultValue: true,
  },
  {
    key: "default_location_enabled",
    label: "Default Location Mode",
    description:
      "Bypasses device location permissions and sets default location to Indore for all users.",
    defaultValue: false,
  },
  {
    key: "upload_provider_cloudinary",
    label: "Cloudinary Upload",
    description:
      "Use Cloudinary for uploads. Turn off to store files in the local uploads folder.",
    defaultValue: false,
  },
];

const UPLOAD_PROVIDER_TOGGLE_KEY = "upload_provider_cloudinary";

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

export default function CustomizationSettings() {
  const [loading, setLoading] = useState(true);
  const [savingByKey, setSavingByKey] = useState({});
  const loadToastShownRef = useRef(false);
  const inFlightReqRef = useRef({}); 
  const unlockTimersRef = useRef({}); 
  const [settings, setSettings] = useState(() => {
    const initial = {};
    for (const t of CUSTOMIZATION_TOGGLES) initial[t.key] = t.defaultValue;
    return initial;
  });
  const uploadToggle = CUSTOMIZATION_TOGGLES.find(
    (toggle) => toggle.key === UPLOAD_PROVIDER_TOGGLE_KEY
  );
  const generalToggles = CUSTOMIZATION_TOGGLES.filter(
    (toggle) => toggle.key !== UPLOAD_PROVIDER_TOGGLE_KEY
  );

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getCustomizationSettings();
        if (!cancelled) {
          const next = {};
          const data = res?.data?.data || {};
          for (const t of CUSTOMIZATION_TOGGLES) {
            next[t.key] = data[t.key] !== undefined ? data[t.key] : t.defaultValue;
          }
          setSettings(next);
        }
      } catch (_error) {
        if (!cancelled) {
          if (!loadToastShownRef.current) {
            loadToastShownRef.current = true;
            toast.error("Failed to load customization settings", {
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
      try {
        for (const k of Object.keys(unlockTimersRef.current || {})) {
          if (unlockTimersRef.current[k]) clearTimeout(unlockTimersRef.current[k]);
        }
      } catch {}
    };
  }, []);

  const handleToggle = async (key, checked) => {
    const prevValue = settings[key];
    setSettings((prev) => ({ ...prev, [key]: checked }));

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    inFlightReqRef.current[key] = requestId;
    setSavingByKey((prev) => ({ ...prev, [key]: true }));

    if (unlockTimersRef.current[key]) clearTimeout(unlockTimersRef.current[key]);
    unlockTimersRef.current[key] = setTimeout(() => {
      if (inFlightReqRef.current[key] === requestId) {
        inFlightReqRef.current[key] = null;
        setSavingByKey((prev) => ({ ...prev, [key]: false }));
      }
    }, 6000);

    const meta = CUSTOMIZATION_TOGGLES.find((t) => t.key === key);
    const label = meta?.label || key;

    toast.success(`${label} ${checked ? "ON" : "OFF"}`, {
      duration: 2000,
      style: {
        width: "fit-content",
        maxWidth: "calc(100vw - 32px)",
        marginLeft: `${getAdminToastOffsetPx()}px`,
      },
    });

    try {
      await adminAPI.updateCustomizationSettings({ [key]: checked });
    } catch (_error) {
      setSettings((prev) => ({ ...prev, [key]: prevValue }));
      toast.error("Failed to update setting", {
        duration: 2000,
        style: {
          width: "fit-content",
          maxWidth: "calc(100vw - 32px)",
          marginLeft: `${getAdminToastOffsetPx()}px`,
        },
      });
    } finally {
      if (inFlightReqRef.current[key] === requestId) {
        inFlightReqRef.current[key] = null;
        setSavingByKey((prev) => ({ ...prev, [key]: false }));
      }
      if (unlockTimersRef.current[key]) {
        clearTimeout(unlockTimersRef.current[key]);
        unlockTimersRef.current[key] = null;
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="inline-flex items-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-neutral-800 dark:text-neutral-200" />
            Customization Settings
          </h1>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Control global customization toggles for the platform.</p>
      </div>

      <Card className="dark:bg-[#1a1a1a] dark:border-neutral-800">
        {uploadToggle ? (
          <CardContent className="border-b border-neutral-200/80 p-5 dark:border-neutral-800">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <Label className="text-base font-semibold text-neutral-900 dark:text-white">
                    {uploadToggle.label}
                  </Label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {uploadToggle.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      settings[UPLOAD_PROVIDER_TOGGLE_KEY]
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    Upload Folder
                  </span>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  ) : (
                    <Switch
                      checked={settings[UPLOAD_PROVIDER_TOGGLE_KEY] !== false}
                      onCheckedChange={(checked) =>
                        handleToggle(UPLOAD_PROVIDER_TOGGLE_KEY, checked)
                      }
                      disabled={savingByKey[UPLOAD_PROVIDER_TOGGLE_KEY] === true}
                      className="data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
                    />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      settings[UPLOAD_PROVIDER_TOGGLE_KEY]
                        ? "text-neutral-800 dark:text-neutral-200"
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    Cloudinary
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                    Note
                  </p>
                  <div className="space-y-1 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
                    <p>1. Turn this on to store new uploads in Cloudinary.</p>
                    <p>2. Turn this off to store new uploads in the server upload folder.</p>
                    <p>3. In local upload mode, `NODE_ENV=development` stores files in `Backend/uploads`.</p>
                    <p>4. In local upload mode, `NODE_ENV=production` stores files in `/var/www/uploads`.</p>
                    <p>5. Existing files remain in their current location. The toggle only affects new uploads after the change.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        ) : null}
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <CardTitle className="dark:text-white">Manage All Toggles Here</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {generalToggles.map((t) => (
              <div
                key={t.key}
                className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-800"
              >
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold dark:text-neutral-200">{t.label}</Label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">{t.description}</p>
                </div>
                <div className="shrink-0 pt-0.5">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                  ) : (
                    <Switch
                      checked={settings[t.key] !== false}
                      onCheckedChange={(checked) => handleToggle(t.key, checked)}
                      disabled={savingByKey[t.key] === true}
                      className="scale-90 data-[state=checked]:bg-[#16a34a] data-[state=unchecked]:bg-zinc-400 shadow-sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
