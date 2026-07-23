import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  ArrowRight, 
  Route, 
  Home, 
  Compass, 
  Edit2, 
  RotateCcw, 
  Bell, 
  Target,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@food/components/ui/button";
import { toast } from "sonner";
import { userAPI } from "@food/api";

export default function JourneyPlanner({ 
  currentLocation, 
  onJourneyPlanSelected, 
  onGoHome 
}) {
  // Session storage loads
  const [originInput, setOriginInput] = useState(() => {
    return sessionStorage.getItem("bh_origin_input") || "";
  });
  const [originCoords, setOriginCoords] = useState(() => {
    try {
      const stored = sessionStorage.getItem("bh_origin_coords");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [destinationInput, setDestinationInput] = useState(() => {
    return sessionStorage.getItem("bh_destination_input") || "";
  });
  const [destinationCoords, setDestinationCoords] = useState(() => {
    try {
      const stored = sessionStorage.getItem("bh_destination_coords");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedHighway, setSelectedHighway] = useState(() => {
    try {
      const stored = sessionStorage.getItem("bh_selected_highway");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // "origin" | "destination"
  const [preventAutoDetect, setPreventAutoDetect] = useState(() => {
    return !!sessionStorage.getItem("bh_origin_coords") || !!sessionStorage.getItem("bh_origin_input");
  });

  const isDevModeAvailable = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  const [isDevMockEnabled, setIsDevMockEnabled] = useState(false);

  const handleDevShortcut = (key) => {
    setPreventAutoDetect(true);
    if (key === 'IND_AMD') {
      setOriginInput('Indore, Madhya Pradesh');
      setOriginCoords({ lat: 22.7196, lng: 75.8577 });
      setDestinationInput('Ahmedabad, Gujarat');
      setDestinationCoords({ lat: 23.0225, lng: 72.5714 });
      toast.success('Loaded Mock Corridor: Indore ➔ Ahmedabad');
    } else if (key === 'IND_DEL') {
      setOriginInput('Indore, Madhya Pradesh');
      setOriginCoords({ lat: 22.7196, lng: 75.8577 });
      setDestinationInput('Delhi, India');
      setDestinationCoords({ lat: 28.6139, lng: 77.2090 });
      toast.success('Loaded Mock Corridor: Indore ➔ Delhi');
    } else if (key === 'DEL_DDN') {
      setOriginInput('Delhi, India');
      setOriginCoords({ lat: 28.6139, lng: 77.2090 });
      setDestinationInput('Dehradun, Uttarakhand');
      setDestinationCoords({ lat: 30.3165, lng: 78.0322 });
      toast.success('Loaded Mock Corridor: Delhi ➔ Dehradun');
    }
  };

  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [searchingDestination, setSearchingDestination] = useState(false);

  const [loadingHighways, setLoadingHighways] = useState(false);
  const [availableHighways, setAvailableHighways] = useState([]);
  const [showHighwaySelection, setShowHighwaySelection] = useState(false);

  // Sync to Session Storage
  useEffect(() => {
    sessionStorage.setItem("bh_origin_input", originInput);
  }, [originInput]);

  useEffect(() => {
    if (originCoords) {
      sessionStorage.setItem("bh_origin_coords", JSON.stringify(originCoords));
    } else {
      sessionStorage.removeItem("bh_origin_coords");
    }
  }, [originCoords]);

  useEffect(() => {
    sessionStorage.setItem("bh_destination_input", destinationInput);
  }, [destinationInput]);

  useEffect(() => {
    if (destinationCoords) {
      sessionStorage.setItem("bh_destination_coords", JSON.stringify(destinationCoords));
    } else {
      sessionStorage.removeItem("bh_destination_coords");
    }
  }, [destinationCoords]);

  useEffect(() => {
    if (selectedHighway) {
      sessionStorage.setItem("bh_selected_highway", JSON.stringify(selectedHighway));
    } else {
      sessionStorage.removeItem("bh_selected_highway");
    }
  }, [selectedHighway]);

  // Pre-fill current location if GPS coordinates exist and no inputs are present
  useEffect(() => {
    if (currentLocation && !originCoords && !sessionStorage.getItem("bh_origin_coords") && !preventAutoDetect) {
      const lat = currentLocation.latitude;
      const lng = currentLocation.longitude;
      setOriginCoords({ lat, lng });
      setOriginInput("Locating...");
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
        .then((res) => res.json())
        .then((json) => {
          const address = json.address || {};
          const cityName = address.city || address.town || address.village || address.municipality || address.county || json.display_name?.split(",")[0] || "Detected City";
          setOriginInput(cityName);
        })
        .catch(() => {
          setOriginInput("Detected City");
        });
    }
  }, [currentLocation, preventAutoDetect]);

  // Origin suggestion search
  useEffect(() => {
    if (activeInput !== "origin") return;
    const q = String(originInput || "").trim();
    if (q.length < 3) {
      setOriginSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearchingOrigin(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const json = await res.json();
        const mapped = (Array.isArray(json) ? json : []).map(r => ({
          id: r.place_id || r.osm_id,
          display: r.display_name || "",
          lat: Number(r.lat),
          lng: Number(r.lon),
        })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng));
        setOriginSuggestions(mapped);
      } catch (e) {
        setOriginSuggestions([]);
      } finally {
        setSearchingOrigin(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [originInput, activeInput]);

  // Destination suggestion search
  useEffect(() => {
    if (activeInput !== "destination") return;
    const q = String(destinationInput || "").trim();
    if (q.length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearchingDestination(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const json = await res.json();
        const mapped = (Array.isArray(json) ? json : []).map(r => ({
          id: r.place_id || r.osm_id,
          display: r.display_name || "",
          lat: Number(r.lat),
          lng: Number(r.lon),
        })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng));
        setDestinationSuggestions(mapped);
      } catch (e) {
        setDestinationSuggestions([]);
      } finally {
        setSearchingDestination(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [destinationInput, activeInput]);

  const handleUseCurrentGPS = () => {
    setPreventAutoDetect(false);
    if (currentLocation) {
      const lat = currentLocation.latitude;
      const lng = currentLocation.longitude;
      setOriginCoords({ lat, lng });
      setOriginInput("Locating...");
      setOriginSuggestions([]);
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
        .then((res) => res.json())
        .then((json) => {
          const address = json.address || {};
          const cityName = address.city || address.town || address.village || address.municipality || address.county || json.display_name?.split(",")[0] || "Detected City";
          setOriginInput(cityName);
        })
        .catch(() => {
          setOriginInput("Detected City");
        });
    } else {
      toast.error("GPS location not available. Please allow location access.");
    }
  };

  const handleSelectOrigin = (s) => {
    setOriginCoords({ lat: s.lat, lng: s.lng });
    setOriginInput(s.display.split(",")[0]);
    setOriginSuggestions([]);
    setActiveInput(null);
    setPreventAutoDetect(true);
  };

  const handleSelectDestination = (s) => {
    setDestinationCoords({ lat: s.lat, lng: s.lng });
    setDestinationInput(s.display.split(",")[0]);
    setDestinationSuggestions([]);
    setActiveInput(null);
  };

  const handleSwap = () => {
    const tempInput = originInput;
    const tempCoords = originCoords;
    setOriginInput(destinationInput);
    setOriginCoords(destinationCoords);
    setDestinationInput(tempInput);
    setDestinationCoords(tempCoords);
  };

  const handleContinue = () => {
    if (!originCoords) {
      toast.error("Please enter a valid starting location.");
      return;
    }
    if (!destinationCoords) {
      toast.error("Please enter a valid destination.");
      return;
    }

    onJourneyPlanSelected({
      origin: originCoords,
      destination: destinationCoords,
      highway: {
        _id: "custom_google_route",
        name: `${originInput.split(',')[0]} to ${destinationInput.split(',')[0]}`,
        ref: `${originInput.split(',')[0]} to ${destinationInput.split(',')[0]}`
      }
    });
  };

  const handleSelectHighwayFromOverlay = (hw) => {
    setSelectedHighway(hw);
    setShowHighwaySelection(false);
  };

  const handleStartRoadTrip = () => {
    if (!originCoords || !destinationCoords || !selectedHighway) return;
    onJourneyPlanSelected({
      origin: originCoords,
      destination: destinationCoords,
      highway: selectedHighway
    });
  };

  const handleEditRoute = () => {
    setSelectedHighway(null);
  };

  const handleReset = () => {
    setOriginInput("");
    setOriginCoords(null);
    setDestinationInput("");
    setDestinationCoords(null);
    setSelectedHighway(null);
    sessionStorage.removeItem("bh_origin_input");
    sessionStorage.removeItem("bh_origin_coords");
    sessionStorage.removeItem("bh_destination_input");
    sessionStorage.removeItem("bh_destination_coords");
    sessionStorage.removeItem("bh_selected_highway");
  };

  const handleGoHomeAndClear = () => {
    handleReset();
    onGoHome();
  };

  const formatDuration = (mins) => {
    if (!mins) return "—";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0) {
      return `${hrs} hr ${remainingMins} min`;
    }
    return `${remainingMins} min`;
  };

  return (
    <div 
      className="w-full min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between items-center px-4 py-3 sm:py-5 relative overflow-x-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Poppins Font Import & Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>

      {/* Top Header Bar (Matching Image) */}
      <div className="w-full max-w-md flex items-center justify-between py-2 px-1 mb-1 animate-slide-in">
        <div className="flex items-center gap-2 mx-auto pr-6">
          {/* Logo Icon */}
          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
            Bhook<span className="text-orange-600">ingo</span>
          </span>
        </div>
        
        <button 
          title="Notifications"
          className="absolute right-4 p-2 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors"
        >
          <Bell className="w-6 h-6 stroke-[1.8]" />
        </button>
      </div>

      {/* Hero Section Container (Matching Image Layout Exactly) */}
      <div className="w-full max-w-md relative my-auto animate-slide-in flex flex-col justify-between">
        
        {/* Upper Hero Grid: Left Content + Right Outline Illustration */}
        <div className="relative w-full min-h-[220px] pt-2 pb-4 px-1">
          
          {/* Right Side Illustration (Exact Match of Reference Drawing in Orange) */}
          <div className="absolute right-[-10px] top-[-10px] w-[220px] h-[230px] pointer-events-none select-none">
            <svg viewBox="0 0 220 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Skyline outline buildings */}
              <g stroke="#fdba74" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
                <rect x="140" y="30" width="12" height="35" rx="1" />
                <rect x="154" y="20" width="16" height="45" rx="1" />
                <rect x="172" y="35" width="14" height="30" rx="1" />
                <rect x="188" y="25" width="18" height="40" rx="1" />
              </g>

              {/* Cloud Outlines */}
              <path d="M120 15 Q125 10 132 12 Q138 8 145 13 Q150 15 145 20 Z" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />
              <path d="M180 8 Q184 4 190 6 Q195 2 200 7 Q205 9 200 13 Z" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />

              {/* Highway Road Outline curving down to left */}
              <path 
                d="M210 55 C160 65 140 100 160 135 C175 160 140 190 40 205" 
                stroke="#fdba74" 
                strokeWidth="1.8" 
                fill="none" 
              />
              <path 
                d="M210 72 C170 82 152 110 172 140 C185 162 145 198 40 215" 
                stroke="#fdba74" 
                strokeWidth="1.8" 
                fill="none" 
              />
              {/* Road center dashed line */}
              <path 
                d="M210 63.5 C165 73.5 146 105 166 137.5 C180 161 142.5 194 40 210" 
                stroke="#f97316" 
                strokeWidth="1.2" 
                strokeDasharray="4 5" 
                fill="none" 
              />

              {/* Minimal trees along road */}
              <g stroke="#f97316" strokeWidth="1.2" fill="none">
                {/* Tree 1 */}
                <circle cx="130" cy="115" r="7" />
                <path d="M130 122 L130 128" />
                {/* Tree 2 */}
                <circle cx="178" cy="110" r="6" />
                <path d="M178 116 L178 121" />
                {/* Tree 3 */}
                <circle cx="192" cy="150" r="7" />
                <path d="M192 157 L192 163" />
              </g>

              {/* Car Outline driving along the road */}
              <g transform="translate(150, 125) rotate(-25) scale(0.85)">
                <rect x="0" y="4" width="30" height="13" rx="4" stroke="#ea580c" strokeWidth="1.5" fill="white" />
                <path d="M6 4 L10 0 L20 0 L24 4 Z" stroke="#ea580c" strokeWidth="1.5" fill="white" />
                <circle cx="7" cy="17" r="3" fill="#ea580c" />
                <circle cx="23" cy="17" r="3" fill="#ea580c" />
              </g>

              {/* Location Pins (Orange Pins matching reference image) */}
              <g transform="translate(170, 25)">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 15.75 9 24 9 24C9 24 18 15.75 18 9C18 4.03 13.97 0 9 0Z" fill="#ea580c" />
                <circle cx="9" cy="9" r="3.5" fill="white" />
              </g>
              <g transform="translate(195, 140)">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 15.75 9 24 9 24C9 24 18 15.75 18 9C18 4.03 13.97 0 9 0Z" fill="#ea580c" />
                <circle cx="9" cy="9" r="3.5" fill="white" />
              </g>
            </svg>
          </div>

          {/* Left Text & Title Area */}
          <div className="relative z-10 max-w-[240px]">
            {/* Steering Wheel Icon Box + "Drive Mode" Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-13 h-13 rounded-2xl bg-orange-600 flex items-center justify-center shadow-md text-white shrink-0 p-2.5">
                {/* Steering Wheel SVG (Exact Match to Reference Icon) */}
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 15v6" />
                  <path d="M9.5 9.5L4 7" />
                  <path d="M14.5 9.5L20 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                  <span className="text-orange-600">Drive</span> Mode
                </h1>
                <p className="text-[11px] font-medium text-gray-600 dark:text-neutral-400 mt-0.5">
                  Food, your way on the highway
                </p>
              </div>
            </div>

            {/* Subtext Paragraphs */}
            <div className="mt-4 space-y-2 text-xs font-normal text-gray-700 dark:text-neutral-300 leading-snug pr-2">
              <p>
                Find the best restaurants and food partners on your route.
              </p>
              <p className="text-[11px] text-gray-600 dark:text-neutral-400">
                Order, Pre-order, Dine-in or Takeaway – we've got you covered!
              </p>
            </div>

          </div>

        </div>

        {/* Developer Mode Testing Panel (Dev builds only) */}
        {isDevModeAvailable && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                🛠️ Dev Mode: Mock Route Simulator
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDevMockEnabled}
                  onChange={(e) => setIsDevMockEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {isDevMockEnabled && (
              <div className="mt-2.5 pt-2 border-t border-amber-500/20 space-y-2">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                  Select a test highway corridor to pre-fill route:
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleDevShortcut('IND_AMD')}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all text-center truncate"
                  >
                    Indore ➔ Ahmedabad
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDevShortcut('IND_DEL')}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all text-center truncate"
                  >
                    Indore ➔ Delhi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDevShortcut('DEL_DDN')}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all text-center truncate"
                  >
                    Delhi ➔ Dehradun
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Route Card Component (Matching Reference Card Exactly) */}
        {selectedHighway ? (
          /* Summary Mode / Review Journey Card */
          <div className="bg-white dark:bg-[#181818] border border-gray-100 dark:border-neutral-800 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] space-y-4 relative overflow-hidden animate-slide-in mt-3">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600">
                  <Compass className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase text-gray-800 dark:text-gray-200 tracking-wider">
                  Your Journey Route
                </span>
              </div>
              
              <div className="flex gap-2">
                {availableHighways.length > 1 && (
                  <button
                    onClick={() => setShowHighwaySelection(true)}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl"
                  >
                    Change Highway
                  </button>
                )}
                <button 
                  onClick={handleEditRoute} 
                  className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white transition-colors uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl flex items-center gap-1"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  Edit
                </button>
              </div>
            </div>

            {/* Visual Route Timeline */}
            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400 dark:text-neutral-500 font-medium leading-none mb-0.5">From</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">{originInput}</span>
                  </div>
                </div>

                {/* Vertical dotted road line */}
                <div className="h-5 w-7 flex justify-center shrink-0">
                  <div className="w-0.5 h-full border-l-2 border-dashed border-orange-500 dark:border-orange-800" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400 dark:text-neutral-500 font-medium leading-none mb-0.5">To</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">{destinationInput}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Highway badge */}
            <div className="flex items-center gap-3 p-3 bg-orange-50/60 dark:bg-neutral-900/80 rounded-2xl border border-orange-100 dark:border-neutral-800">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm">
                NH
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider leading-none mb-0.5">Active Highway Route</span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase truncate block">
                  {selectedHighway.ref || selectedHighway.name}
                </span>
              </div>
            </div>

            {/* Grid Stats Chips */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Distance</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedHighway.approxDistanceKm} km</span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Time</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{formatDuration(selectedHighway.approxTravelTimeMinutes)}</span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Stops</span>
                <span className="text-xs font-bold text-orange-600">{selectedHighway.restaurantCount || 0} Stops</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleStartRoadTrip}
              className="w-full h-14 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all text-base tracking-wide cursor-pointer border-none"
            >
              Start Journey
              <ArrowRight className="w-5 h-5" />
            </Button>

          </div>
        ) : (
          /* Input Mode Card (Exact Match to Reference Image Card) */
          <div className="bg-white dark:bg-[#181818] border border-gray-100 dark:border-neutral-800 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] relative animate-slide-in mt-2 space-y-4">
            
            {/* Input Fields Wrapper */}
            <div className="relative space-y-3">
              
              {/* FROM Input Box */}
              <div className="relative bg-white dark:bg-neutral-900 border border-gray-200/90 dark:border-neutral-800 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                
                {/* Red/Orange Navigation Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Navigation className="w-5 h-5 fill-current transform rotate-45" />
                </div>

                {/* Input Text & Label */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 dark:text-neutral-400 font-medium leading-none mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginInput(val);
                      setOriginCoords(null);
                      if (val === "") {
                        setPreventAutoDetect(false);
                      } else {
                        setPreventAutoDetect(true);
                      }
                    }}
                    onFocus={() => {
                      setActiveInput("origin");
                      setPreventAutoDetect(true);
                    }}
                    placeholder="Current Location"
                    className="w-full bg-transparent border-none p-0 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                {/* GPS Icon Button */}
                <button
                  onClick={handleUseCurrentGPS}
                  title="Use current location"
                  className="p-1.5 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors shrink-0"
                >
                  <Target className="w-5 h-5 stroke-[1.8]" />
                </button>

                {/* Origin Suggestions Popover */}
                {activeInput === "origin" && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 z-50">
                    {originSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectOrigin(s)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors text-left"
                      >
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {s.display.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {s.display.split(",").slice(1).join(",").trim()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeInput === "origin" && searchingOrigin && (
                  <div className="absolute left-0 right-0 top-full mt-2 p-3 flex items-center justify-center gap-2 text-xs text-gray-500 bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-200 dark:border-neutral-800 z-50 shadow-lg">
                    <Loader2 className="animate-spin h-4 w-4 text-orange-600" />
                    Searching cities...
                  </div>
                )}

              </div>

              {/* Dashed Line & Ring Connector (Between From and To Circles) */}
              <div className="relative h-6 my-[-6px] flex items-center z-10 pointer-events-none pl-7">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-0.5 h-2.5 border-l-2 border-dashed border-orange-500 opacity-70" />
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-600 bg-white dark:bg-[#181818] shrink-0" />
                  <div className="w-0.5 h-2.5 border-l-2 border-dashed border-orange-500 opacity-70" />
                </div>
              </div>

              {/* TO Input Box */}
              <div className="relative bg-white dark:bg-neutral-900 border border-gray-200/90 dark:border-neutral-800 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                
                {/* Red/Orange Map Pin Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <MapPin className="w-5 h-5 fill-current" />
                </div>

                {/* Input Text & Label */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 dark:text-neutral-400 font-medium leading-none mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setDestinationCoords(null);
                    }}
                    onFocus={() => setActiveInput("destination")}
                    placeholder="Where are you headed?"
                    className="w-full bg-transparent border-none p-0 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                {/* Swap Icon Button */}
                <button
                  onClick={handleSwap}
                  title="Swap From and To"
                  className="p-1.5 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors shrink-0"
                >
                  <ArrowUpDown className="w-5 h-5 stroke-[1.8]" />
                </button>

                {/* Destination Suggestions Popover */}
                {activeInput === "destination" && destinationSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 z-50">
                    {destinationSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectDestination(s)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors text-left"
                      >
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {s.display.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {s.display.split(",").slice(1).join(",").trim()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeInput === "destination" && searchingDestination && (
                  <div className="absolute left-0 right-0 top-full mt-2 p-3 flex items-center justify-center gap-2 text-xs text-gray-500 bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-200 dark:border-neutral-800 z-50 shadow-lg">
                    <Loader2 className="animate-spin h-4 w-4 text-orange-600" />
                    Searching cities...
                  </div>
                )}

              </div>

            </div>

            {/* Primary Action CTA Button ("Start Journey" with Arrow) */}
            <div className="pt-2">
              <Button
                onClick={handleContinue}
                disabled={loadingHighways || !originCoords || !destinationCoords}
                className="w-full h-14 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 dark:disabled:bg-neutral-800 disabled:opacity-50 active:scale-[0.99] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all cursor-pointer border-none"
              >
                {loadingHighways ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding Routes...
                  </>
                ) : (
                  <>
                    Start Journey
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </>
                )}
              </Button>
            </div>

          </div>
        )}

        {/* Go Home Secondary Action & Reset */}
        <div className="mt-3 flex items-center justify-between px-2">
          <button
            onClick={handleGoHomeAndClear}
            className="text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors flex items-center gap-1.5 py-1"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>

          {(originCoords || destinationCoords || originInput || destinationInput) && (
            <button 
              onClick={handleReset} 
              className="text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors flex items-center gap-1 py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Inputs
            </button>
          )}
        </div>

      </div>

      {/* Bottom Wave Decorative Background (Matching Reference Footer) */}
      <div className="w-full max-w-md h-12 relative opacity-40 pointer-events-none select-none mt-auto">
        <svg viewBox="0 0 400 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 20 Q100 40 200 20 T400 20 L400 40 L0 40 Z" fill="#fdba74" />
        </svg>
      </div>

      {/* Bottom Sheet Modal Overlay for Highway Selection */}
      {showHighwaySelection && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in" 
          onClick={() => setShowHighwaySelection(false)}
        >
          <div 
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-gray-100 dark:border-neutral-800 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handlebar */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full mx-auto mb-2" />
            
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Choose Highway Route</h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 leading-normal">
                Multiple highway connections found between your cities. Select your preferred route:
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {availableHighways.map((hw, index) => (
                <button
                  key={hw._id}
                  onClick={() => handleSelectHighwayFromOverlay(hw)}
                  className="w-full p-4 border border-gray-200 dark:border-neutral-800 rounded-2xl hover:border-orange-500 dark:hover:border-orange-500 flex flex-col text-left transition-all bg-gray-50 dark:bg-[#181818] hover:bg-orange-50/20 relative overflow-hidden group shadow-sm"
                >
                  {index === 0 && (
                    <span className="absolute top-0 right-0 bg-orange-600 text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                      Recommended
                    </span>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white uppercase">
                      {hw.ref || hw.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium dark:text-gray-500 truncate max-w-[150px] ml-1">
                      {hw.name}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200/60 dark:border-neutral-800/80 pt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Distance</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{hw.approxDistanceKm} km</span>
                    </div>
                    <div className="border-x border-gray-200/60 dark:border-neutral-800 px-1 text-center">
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Time</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{formatDuration(hw.approxTravelTimeMinutes)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Restaurants</span>
                      <span className="font-bold text-orange-600">{hw.restaurantCount || 0} stops</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowHighwaySelection(false)}
              className="w-full h-12 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-2xl mt-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
