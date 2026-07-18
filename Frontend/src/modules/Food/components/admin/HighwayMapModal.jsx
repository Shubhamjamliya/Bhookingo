import React, { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@food/components/ui/dialog";
import { Button } from "@food/components/ui/button";
import { Input } from "@food/components/ui/input";
import { Label } from "@food/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { adminAPI } from "@food/api";
import { toast } from "sonner";
import { GoogleMap, useJsApiLoader, Polyline, DrawingManager } from "@react-google-maps/api";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "500px",
  borderRadius: "0.5rem"
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_LIBRARIES = ['drawing'];

const POLYLINE_OPTIONS = {
  strokeColor: "#3b82f6",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

export default function HighwayMapModal({
  isOpen,
  onClose,
  highway = null,
  onSaveSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [segments, setSegments] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [segmentCount, setSegmentCount] = useState(0);

  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const fitBoundsTimerRef = useRef(null);

  const isManualMode = !highway || !isReadOnly;
  const primarySegment = segments[0] || [];
  const hasRoute = segments.some((seg) => Array.isArray(seg) && seg.length >= 2);

  const fitMapToRoute = useCallback((mapInstance = mapRef.current) => {
    if (!mapInstance || !window.google?.maps || !segments.length) return;

    const bounds = new window.google.maps.LatLngBounds();
    let pointCount = 0;

    for (const seg of segments) {
      if (!Array.isArray(seg)) continue;
      for (const c of seg) {
        const lat = Number(c?.lat);
        const lng = Number(c?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        bounds.extend({ lat, lng });
        pointCount++;
      }
    }

    if (pointCount === 0) return;

    if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);

    // Wait for dialog layout + polylines to mount before fitting bounds
    fitBoundsTimerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.fitBounds(bounds, 48);
    }, 150);
  }, [segments]);

  useEffect(() => {
    if (!isOpen) return;

    if (highway) {
      setName(highway.name || "");
      setRef(highway.ref || "");
      if (highway._id) {
        fetchHighwayDetails(highway._id);
      } else {
        setSegments(highway.segments?.length ? highway.segments : highway.coordinates?.length ? [highway.coordinates] : []);
        setIsReadOnly(false);
      }
    } else {
      setName("");
      setRef("");
      setSegments([]);
      setIsReadOnly(false);
      setSegmentCount(0);
    }
  }, [isOpen, highway]);

  const fetchHighwayDetails = async (id) => {
    setLoading(true);
    try {
      const res = await adminAPI.getHighwayById(id);
      if (res?.data?.success) {
        const hw = res.data.data.highway;
        const loadedSegments = hw.segments?.length
          ? hw.segments
          : hw.coordinates?.length >= 2
            ? [hw.coordinates]
            : [];
        setSegments(loadedSegments);
        setSegmentCount(hw.segmentCount || loadedSegments.length);
        setIsReadOnly(loadedSegments.length > 1 || hw.source === 'geojson');
      }
    } catch {
      toast.error("Failed to fetch highway geometry");
    } finally {
      setLoading(false);
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    if (segments.some((seg) => Array.isArray(seg) && seg.length >= 2)) {
      fitMapToRoute(map);
    }
  }, [segments, fitMapToRoute]);

  useEffect(() => {
    if (!isLoaded || loading || !hasRoute) return;
    fitMapToRoute();
  }, [isLoaded, loading, hasRoute, fitMapToRoute]);

  useEffect(() => {
    return () => {
      if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);
    };
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onPolylineComplete = (polyline) => {
    const path = polyline.getPath();
    const newCoords = [];
    for (let i = 0; i < path.getLength(); i++) {
      const pt = path.getAt(i);
      newCoords.push({ lat: pt.lat(), lng: pt.lng() });
    }
    setSegments([newCoords]);
    polyline.setMap(null);
  };

  const handleClearDrawing = () => {
    setSegments([]);
    setIsReadOnly(false);
  };

  const handleSave = async () => {
    if (!name) return toast.error("Please provide a name for the highway");
    if (!segments.length || segments[0].length < 2) {
      return toast.error("Please draw a highway with at least 2 points on the map");
    }

    setSaving(true);
    try {
      const payload = {
        name,
        ref,
        coordinates: segments[0],
        segments: segments.length > 1 ? segments : undefined
      };
      let res;
      if (highway?._id) {
        res = await adminAPI.updateHighway(highway._id, payload);
      } else {
        res = await adminAPI.createHighway(payload);
      }

      if (res?.data?.success) {
        toast.success(highway ? "Highway updated" : "Highway created");
        onSaveSuccess?.();
        onClose();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save highway");
    } finally {
      setSaving(false);
    }
  };

  const formatDistance = (meters) => {
    if (!meters) return "—"
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
    return `${meters} m`
  }

  const showDrawingTool = isManualMode && primarySegment.length === 0;
  const showEditableSingle = isManualMode && primarySegment.length > 0 && segments.length <= 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] m-0 p-0 rounded-none border-none flex flex-col md:flex-row overflow-hidden bg-white shadow-none gap-0">
        
        {/* Left Side: Details & Forms (~30%) */}
        <div className="w-full md:w-[350px] lg:w-[400px] xl:w-[450px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
          <div className="px-6 py-6 border-b border-gray-100 flex-none bg-white">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
               {highway ? (isReadOnly ? "Highway Route" : "Edit Route") : "Draw New Route"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {isReadOnly
                ? `Viewing official data with ${segmentCount || segments.length} segments.`
                : highway
                  ? "Update the geometry and details for this route."
                  : "Click on the map to draw a custom highway route."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
            {!isReadOnly && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-gray-700">Highway Name <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="e.g. National Highway 44" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-11 transition-all"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-gray-700">Reference Code</Label>
                  <Input 
                    placeholder="e.g. NH-44" 
                    value={ref} 
                    onChange={(e) => setRef(e.target.value)}
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-11 transition-all"
                  />
                </div>
              </div>
            )}
            
            {isReadOnly && highway && (
               <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Highway Name</p>
                    <p className="font-semibold text-gray-900 text-base">{highway.name || "Unnamed Highway"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Reference Code</p>
                    <p className="font-semibold text-gray-900">{highway.ref || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Total Points</p>
                      <p className="font-semibold text-gray-900">{highway.nodeCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Total Segments</p>
                      <p className="font-semibold text-gray-900">{highway.segmentCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Length</p>
                      <p className="font-semibold text-gray-900">{formatDistance(highway.totalDistance)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${highway.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {highway.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
               </div>
            )}

            {!isReadOnly && showEditableSingle && (
              <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-100 text-sm text-blue-800 font-medium flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                <p>You can drag the points on the map to adjust the route path.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-white flex flex-col gap-3 flex-none mt-auto">
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={saving || loading || primarySegment.length < 2} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold text-base transition-all">
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {highway ? "Update Highway" : "Save Highway"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving} className="w-full h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-base transition-colors">
              {isReadOnly ? "Close View" : "Cancel"}
            </Button>
          </div>
        </div>

        {/* Right Side: Map (~70%) */}
        <div className="flex-1 relative bg-gray-100 border-l border-gray-200/50">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <p className="text-gray-600 font-medium text-lg tracking-tight">Loading Map Data...</p>
                </div>
             </div>
           ) : !isLoaded ? (
             <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">Initializing Map Engine...</div>
           ) : (
             <>
               <GoogleMap
                 key={highway?._id || "new-highway"}
                 mapContainerStyle={{ width: "100%", height: "100%" }}
                 {...(!hasRoute ? { center: DEFAULT_CENTER, zoom: 5 } : {})}
                 onLoad={onLoad}
                 onUnmount={onUnmount}
                 options={{ 
                   streetViewControl: false, 
                   mapTypeControl: true,
                   fullscreenControl: false,
                   zoomControlOptions: {
                     position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM
                   }
                 }}
               >
                 {isReadOnly && segments.map((seg, idx) => (
                   <Polyline key={`seg-${idx}`} path={seg} options={POLYLINE_OPTIONS} />
                 ))}

                 {showEditableSingle && (
                   <Polyline
                     path={primarySegment}
                     options={{ ...POLYLINE_OPTIONS, strokeWeight: 5, editable: true }}
                     onLoad={(pl) => { polylineRef.current = pl; }}
                     onMouseUp={() => {
                       if (polylineRef.current) {
                         const path = polylineRef.current.getPath();
                         const newCoords = [];
                         for (let i = 0; i < path.getLength(); i++) {
                           const pt = path.getAt(i);
                           newCoords.push({ lat: pt.lat(), lng: pt.lng() });
                         }
                         setSegments([newCoords]);
                       }
                     }}
                   />
                 )}

                 {showDrawingTool && (
                   <DrawingManager
                     onPolylineComplete={onPolylineComplete}
                     options={{
                       drawingControl: true,
                       drawingControlOptions: {
                         position: window.google?.maps?.ControlPosition?.TOP_CENTER,
                         drawingModes: ['polyline']
                       },
                       polylineOptions: { ...POLYLINE_OPTIONS, strokeWeight: 5, editable: true }
                     }}
                   />
                 )}
               </GoogleMap>
               
               {showEditableSingle && (
                 <div className="absolute top-6 right-6 z-10">
                   <Button 
                     variant="destructive" 
                     onClick={handleClearDrawing} 
                     className="flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all h-11 px-5 rounded-full font-semibold text-sm border border-red-700"
                   >
                     <Trash2 className="w-4 h-4" /> Clear Route
                   </Button>
                 </div>
               )}
             </>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
