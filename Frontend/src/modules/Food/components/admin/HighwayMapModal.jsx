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

  const isManualMode = !highway || !isReadOnly;
  const primarySegment = segments[0] || [];

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
    libraries: ['drawing']
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !segments.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    segments.forEach((seg) => {
      seg.forEach((c) => bounds.extend(new window.google.maps.LatLng(c.lat, c.lng)));
    });
    mapRef.current.fitBounds(bounds);
  }, [isLoaded, segments]);

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

  const showDrawingTool = isManualMode && primarySegment.length === 0;
  const showEditableSingle = isManualMode && primarySegment.length > 0 && segments.length <= 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {highway ? (isReadOnly ? "View Highway" : "Edit Highway") : "Draw Manual Highway"}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? `Showing ${segmentCount || segments.length} road segment(s) loaded from the database.`
              : highway
                ? "View or edit this highway path on the map."
                : "Draw a single path for a manually added highway."}
          </DialogDescription>
        </DialogHeader>

        {!isReadOnly && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label>Highway Name *</Label>
              <Input placeholder="e.g. National Highway 44" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference Code</Label>
              <Input placeholder="e.g. NH-44" value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
          </div>
        )}

        <div className="relative mt-4 border rounded-xl overflow-hidden bg-gray-50 h-[500px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !isLoaded ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading Map...</div>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={DEFAULT_CENTER}
                zoom={5}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{ streetViewControl: false, mapTypeControl: false }}
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
                <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg">
                  <Button variant="destructive" size="sm" onClick={handleClearDrawing} className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Clear & Redraw
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving || loading || primarySegment.length < 2}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {highway ? "Update Highway" : "Save Highway"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
