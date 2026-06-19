import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Switch } from "@food/components/ui/switch"
import { Loader2, Upload, Trash2, MapPin, Search, Info } from "lucide-react"
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
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8 space-y-8 pb-20">
      {/* Header Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60 translate-x-1/2 -translate-y-1/2"></div>
        <div className="z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">National Highway Setup</h1>
          <p className="text-base text-gray-500 mt-2 max-w-2xl">
            Manage the official highway geometry for your service network. Import data once, and define proximity thresholds to connect restaurants.
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap z-10">
          <Button
            onClick={() => { setSelectedHighway(null); setMapModalOpen(true); }}
            variant="outline"
            className="flex items-center gap-2 h-11 px-5 shadow-sm hover:bg-gray-50"
          >
            <MapPin className="w-4 h-4 text-blue-600" /> 
            <span className="font-medium">Add Manual</span>
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
            <Button variant="outline" className="flex items-center gap-2 h-11 px-5 shadow-sm hover:bg-gray-50 border-gray-200" asChild>
              <span className="cursor-pointer font-medium text-gray-700">
                <Upload className="w-4 h-4 text-gray-500" />
                {selectedFile ? selectedFile.name.slice(0, 20) + (selectedFile.name.length > 20 ? "…" : "") : "Choose GeoJSON"}
              </span>
            </Button>
          </label>
          <Button
            onClick={handleImport}
            disabled={importing}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-all duration-200"
          >
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {importing ? "Importing Data..." : "Import GeoJSON"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Settings Section */}
        <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-5">
            <CardTitle className="text-base font-semibold text-gray-800">System Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-0.5">Service Threshold</label>
                <p className="text-xs text-gray-500">
                  Maximum distance from a highway to include a restaurant.
                </p>
              </div>
              <div className="flex items-center gap-2 max-w-[280px] w-full">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 1000"
                    className="pr-8 h-9 text-sm focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">m</span>
                </div>
                <Button size="sm" onClick={handleSaveThreshold} disabled={savingThreshold} className="bg-gray-900 h-9 text-white hover:bg-gray-800 px-5 text-xs font-medium">
                  {savingThreshold ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Highways Table */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="bg-white border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 px-6 shrink-0">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">Mapped Highways</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Total {filteredHighways.length} routes active</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </CardHeader>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Highway Details</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Segments</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Length</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                      <p className="text-gray-500 font-medium">Loading highway network...</p>
                    </td>
                  </tr>
                ) : filteredHighways.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="max-w-xs mx-auto">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-base font-medium text-gray-900 mb-1">No Highways Found</h3>
                        <p className="text-sm text-gray-500">
                          {searchQuery
                            ? "Try adjusting your search filters."
                            : "Upload a GeoJSON file to get started with the highway network."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHighways.map((highway) => (
                    <tr key={highway._id} className="bg-white hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{highway.name || "Unnamed Highway"}</span>
                          {highway.ref && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1 border border-blue-100">
                              {highway.ref}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{highway.segmentCount ?? 0}</span>
                          <span className="text-xs text-gray-500">{highway.nodeCount ?? 0} points</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatDistance(highway.totalDistance)}
                      </td>
                      <td className="px-6 py-4">
                        <Switch
                          checked={highway.isActive}
                          onCheckedChange={() => handleToggle(highway._id, highway.isActive)}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHighway(highway)
                              setMapModalOpen(true)
                            }}
                            className="h-8 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm font-medium transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            View Route
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setHighwayToDelete(highway)
                              setDeleteModalOpen(true)
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Highway Route"
        description={`Are you absolutely sure you want to delete ${highwayToDelete?.name || highwayToDelete?.ref}? This action cannot be undone and will affect restaurant mappings.`}
        confirmText={deleting ? "Deleting..." : "Yes, Delete"}
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
