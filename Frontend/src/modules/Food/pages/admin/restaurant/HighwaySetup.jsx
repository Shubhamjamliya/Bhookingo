import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Switch } from "@food/components/ui/switch"
import { Loader2, Upload, Trash2, MapPin, Search } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { ConfirmationModal } from "@food/components/admin/ConfirmationModal"
import HighwayMapModal from "@food/components/admin/HighwayMapModal"

export default function HighwaySetup() {
  const [highways, setHighways] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [threshold, setThreshold] = useState(1000)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [highwayToDelete, setHighwayToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [selectedHighway, setSelectedHighway] = useState(null)

  const fileInputRef = useRef(null)

  const fetchHighways = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getHighways()
      if (res?.data?.success) {
        setHighways(res.data.data?.highways || [])
      }
    } catch (error) {
      toast.error("Failed to load highways")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getHighwaySettings()
      if (res?.data?.success) {
        setThreshold(res.data.data.thresholdMeters || res.data.data.highwayThresholdMeters || 1000)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  useEffect(() => {
    fetchHighways()
    fetchSettings()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
        toast.error("Please select a .geojson or .json file")
        return
      }
      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const toastId = toast.loading(
        selectedFile
          ? `Importing from ${selectedFile.name}... This may take a few minutes.`
          : "Importing from server GeoJSON file... This may take a few minutes."
      )
      const res = await adminAPI.importHighways(selectedFile)
      if (res?.data?.success) {
        const { inserted, updated, total } = res.data.data || {}
        toast.success(`Import complete: ${total ?? 0} highways (${inserted ?? 0} new, ${updated ?? 0} updated)`, { id: toastId })
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        fetchHighways()
      } else {
        toast.error(res?.data?.message || "Import failed", { id: toastId })
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to import highways")
      console.error(error)
    } finally {
      setImporting(false)
    }
  }

  const handleToggle = async (id, currentStatus) => {
    try {
      setHighways(prev => prev.map(h => h._id === id ? { ...h, isActive: !currentStatus } : h))
      const res = await adminAPI.toggleHighwayStatus(id)
      if (!res?.data?.success) throw new Error("Toggle failed")
      toast.success("Status updated")
    } catch (error) {
      setHighways(prev => prev.map(h => h._id === id ? { ...h, isActive: currentStatus } : h))
      toast.error(error?.response?.data?.message || "Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!highwayToDelete) return
    try {
      setDeleting(true)
      const res = await adminAPI.deleteHighway(highwayToDelete._id)
      if (res?.data?.success) {
        toast.success("Highway deleted")
        setHighways(prev => prev.filter(h => h._id !== highwayToDelete._id))
        setDeleteModalOpen(false)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete highway")
    } finally {
      setDeleting(false)
      setHighwayToDelete(null)
    }
  }

  const handleSaveThreshold = async () => {
    try {
      setSavingThreshold(true)
      const res = await adminAPI.updateHighwaySettings({ thresholdMeters: Number(threshold) })
      if (res?.data?.success) {
        toast.success("Settings updated successfully")
      }
    } catch (error) {
      toast.error("Failed to update settings")
      console.error(error)
    } finally {
      setSavingThreshold(false)
    }
  }

  const formatDistance = (meters) => {
    if (!meters) return "—"
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
    return `${meters} m`
  }

  const filteredHighways = highways.filter(h =>
    (h.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.ref || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">National Highway Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import official MoRTH/GatiShakti highway geometry once — all runtime data comes from the database.
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Button
            onClick={() => { setSelectedHighway(null); setMapModalOpen(true); }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" /> Add Manual Highway
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".geojson,.json"
            onChange={handleFileChange}
            className="hidden"
            id="highway-geojson-upload"
          />
          <label htmlFor="highway-geojson-upload">
            <Button variant="outline" className="flex items-center gap-2" asChild>
              <span>
                <Upload className="w-4 h-4" />
                {selectedFile ? selectedFile.name.slice(0, 20) + (selectedFile.name.length > 20 ? "…" : "") : "Choose GeoJSON"}
              </span>
            </Button>
          </label>
          <Button
            onClick={handleImport}
            disabled={importing}
            className="bg-[#000000] hover:bg-gray-800 text-white"
          >
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {importing ? "Importing..." : "Import GeoJSON"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Service Threshold (Meters)</label>
                <p className="text-xs text-gray-500 mb-2">Distance from highway to include a restaurant.</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                  <Button onClick={handleSaveThreshold} disabled={savingThreshold} variant="outline">
                    {savingThreshold ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 space-y-2">
                <p><strong>One-time import:</strong> Upload the official National Highways GeoJSON (MoRTH/GatiShakti). Geometry is stored permanently in the database.</p>
                <p className="text-xs text-blue-700">Download from: github.com/yashveeeeeeer/india-geodata (INDIA_NATIONAL_HIGHWAY.geojson)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mapped Highways ({filteredHighways.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search highways..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-t-lg">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">Highway Name</th>
                    <th scope="col" className="px-6 py-3">Ref</th>
                    <th scope="col" className="px-6 py-3">Segments</th>
                    <th scope="col" className="px-6 py-3">Length</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                        Loading highways...
                      </td>
                    </tr>
                  ) : filteredHighways.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        {searchQuery
                          ? "No highways match your search."
                          : "No highways imported yet. Upload a GeoJSON file and click Import GeoJSON."}
                      </td>
                    </tr>
                  ) : (
                    filteredHighways.map((highway) => (
                      <tr key={highway._id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {highway.name || "Unnamed Highway"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200">
                            {highway.ref || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {highway.segmentCount ?? 0} ({highway.nodeCount ?? 0} pts)
                        </td>
                        <td className="px-6 py-4">
                          {formatDistance(highway.totalDistance)}
                        </td>
                        <td className="px-6 py-4">
                          <Switch
                            checked={highway.isActive}
                            onCheckedChange={() => handleToggle(highway._id, highway.isActive)}
                          />
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHighway(highway)
                              setMapModalOpen(true)
                            }}
                            className="flex items-center gap-1 h-8"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            View Map
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setHighwayToDelete(highway)
                              setDeleteModalOpen(true)
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Highway"
        description={`Are you sure you want to delete ${highwayToDelete?.name || highwayToDelete?.ref}? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        confirmVariant="destructive"
        loading={deleting}
      />

      <HighwayMapModal
        isOpen={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false)
          setSelectedHighway(null)
        }}
        highway={selectedHighway}
        onSaveSuccess={fetchHighways}
      />
    </div>
  )
}
