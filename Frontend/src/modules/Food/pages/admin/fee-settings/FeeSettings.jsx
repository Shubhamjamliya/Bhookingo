import { useState, useEffect } from "react"
import { Save, Loader2, DollarSign, Plus, Trash2, Edit, Check, X } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function FeeSettings() {
  const [feeSettings, setFeeSettings] = useState({
    
    
    
    
    platformFee: "",
    packagingFee: "",
    gstRate: "",
  })
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false)
  const [savingFeeSettings, setSavingFeeSettings] = useState(false)
  const [editingRangeIndex, setEditingRangeIndex] = useState(null)
  const [newRange, setNewRange] = useState({ min: '', max: '', fee: '' })

  // Fetch fee settings
  const fetchFeeSettings = async () => {
    try {
      setLoadingFeeSettings(true)
      const response = await adminAPI.getFeeSettings()
      if (response.data.success && response.data.data.feeSettings) {
        setFeeSettings({
          
          
          
          
          platformFee: response.data.data.feeSettings.platformFee ?? "",
          packagingFee: response.data.data.feeSettings.packagingFee ?? "",
          gstRate: response.data.data.feeSettings.gstRate ?? "",
        })
      } else if (response.data.success && response.data.data.feeSettings === null) {
        // Not configured yet - keep empty fields (no defaults).
        setFeeSettings({
          
          
          
          
          platformFee: "",
          packagingFee: "",
          gstRate: "",
        })
      }
    } catch (error) {
      debugError('Error fetching fee settings:', error)
      toast.error('Failed to load fee settings')
    } finally {
      setLoadingFeeSettings(false)
    }
  }

  // Fetch fee settings on mount
  useEffect(() => {
    fetchFeeSettings()
  }, [])

  // Save fee settings
  const handleSaveFeeSettings = async () => {
    try {
      setSavingFeeSettings(true)
      const response = await adminAPI.createOrUpdateFeeSettings({
        
        
        
        
        platformFee: feeSettings.platformFee === "" ? undefined : Number(feeSettings.platformFee),
        packagingFee: feeSettings.packagingFee === "" ? undefined : Number(feeSettings.packagingFee),
        gstRate: feeSettings.gstRate === "" ? undefined : Number(feeSettings.gstRate),
        isActive: true,
      })

      if (response.data.success) {
        toast.success('Fee settings saved successfully')
        // Avoid an extra API call; update local state from response
        const saved = response?.data?.data?.feeSettings
        if (saved) {
          setFeeSettings({
            
            
            
            
            platformFee: saved.platformFee ?? "",
            packagingFee: saved.packagingFee ?? "",
            gstRate: saved.gstRate ?? "",
          })
        }
      } else {
        toast.error(response.data.message || 'Failed to save fee settings')
      }
    } catch (error) {
      debugError('Error saving fee settings:', error)
      toast.error(error.response?.data?.message || 'Failed to save fee settings')
    } finally {
      setSavingFeeSettings(false)
    }
  }

  const handleEditRange = (index) => {
    setNewRange({ min: range.min, max: range.max, fee: range.fee })
    setEditingRangeIndex(index)
  }

  // Save edited range
  const handleSaveEditRange = () => {
    if (newRange.min === '' || newRange.max === '' || newRange.fee === '') {
      toast.error('Please fill all fields')
      return
    }

    const min = Number(newRange.min)
    const max = Number(newRange.max)
    const fee = Number(newRange.fee)

    if (min < 0 || max < 0 || fee < 0) {
      toast.error('All values must be positive numbers')
      return
    }

    if (min >= max) {
      toast.error('Min value must be less than Max value')
      return
    }

    // Remove the range being edited
    ranges.splice(editingRangeIndex, 1)

    // Check for overlapping ranges
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range')
        return
      }
    }

    // Add updated range
    ranges.push({ min, max, fee })
    ranges.sort((a, b) => a.min - b.min)

    setFeeSettings({
      ...feeSettings,
    })
    setNewRange({ min: '', max: '', fee: '' })
    setEditingRangeIndex(null)
    toast.success('Range updated successfully')
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setNewRange({ min: '', max: '', fee: '' })
    setEditingRangeIndex(null)
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Fee</h1>
        </div>
        <p className="text-sm text-slate-600">
          Configure platform fee and GST settings for orders
        </p>
      </div>

      {/* Fee Settings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fee Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">
                Set the fees and charges that will be applied to all orders
              </p>
            </div>
            <Button
              onClick={handleSaveFeeSettings}
              disabled={savingFeeSettings || loadingFeeSettings}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {savingFeeSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>

          {loadingFeeSettings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <>
              {/* Platform Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Platform Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.platformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, platformFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">
                    Platform service fee per order
                  </p>
                </div>
                {/* Packaging Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Packaging Charges Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.packagingFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, packagingFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500">
                    Packaging charges fee per order
                  </p>
                </div>

                {/* GST Rate */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstRate}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on order subtotal
                  </p>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
