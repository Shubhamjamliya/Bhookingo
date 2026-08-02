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
  const [importProgress, setImportProgress] = useState(0)
  const [importPhase, setImportPhase] = useState(null)
  const [importFileName, setImportFileName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

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

  useEffect(() => {
    fetchHighways()
  }, [])

  const resetImportState = () => {
    setImporting(false)
    setImportProgress(0)
    setImportPhase(null)
    setImportFileName("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUploadClick = () => {
    if (importing) return
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
      toast.error("Please select a .geojson or .json file")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setImporting(true)
    setImportProgress(0)
    setImportPhase("upload")
    setImportFileName(file.name)

    try {
      const res = await adminAPI.importHighways(file, {
        onUploadProgress: (pct) => {
          setImportProgress(pct)
          if (pct >= 100) setImportPhase("processing")
        },
      })

      if (res?.data?.success) {
        const { inserted, updated, total } = res.data.data || {}
        toast.success(`Import complete: ${total ?? 0} highways (${inserted ?? 0} new, ${updated ?? 0} updated)`)
        fetchHighways()
      } else {
        toast.error(res?.data?.message || "Import failed")
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Failed to import highways")
      console.error(error)
    } finally {
      resetImportState()
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

  const formatDistance = (meters) => {
    if (!meters) return "—"
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
    return `${meters} m`
  }

  const filteredHighways = highways.filter(h =>
    (h.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.ref || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const progressLabel =
    importPhase === "processing"
      ? "Processing and saving highways to database..."
      : "Uploading GeoJSON file..."

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8 space-y-8 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60 translate-x-1/2 -translate-y-1/2" />
        <div className="z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">National Highway Setup</h1>
          <p className="text-base text-gray-500 mt-2 max-w-2xl">
            Upload the official MoRTH GeoJSON file once. Highway geometry stays here, while all driving behavior now lives in Driving Mode Settings.
          </p>
        </div>
        <div className="z-10 shrink-0">
          <Button
            onClick={handleUploadClick}
            disabled={importing}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {importing ? "Importing..." : "Upload GeoJSON"}
          </Button>
        </div>
      </div>

      {importing && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{progressLabel}</p>
              {importFileName && (
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{importFileName}</p>
              )}
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">
              {importPhase === "processing" ? "..." : `${importProgress}%`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
            {importPhase === "processing" ? (
              <div className="h-full w-full rounded-full bg-blue-500 animate-pulse" />
            ) : (
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            )}
          </div>
          <p className="text-xs text-gray-500">
            Large files (~100 MB) can take several minutes. Please keep this tab open.
          </p>
        </div>
      )}

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
                      <p className="text-sm text-gray-500 mb-4">
                        {searchQuery
                          ? "Try adjusting your search filters."
                          : "Click Upload GeoJSON to import the official highway network."}
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUploadClick}
                          disabled={importing}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload GeoJSON
                        </Button>
                      )}
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