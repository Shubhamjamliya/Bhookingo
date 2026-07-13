import React, { useState } from 'react'
import { useLocation } from '@food/hooks/useLocation'
import { useLocationSimple } from '@food/hooks/useLocationSimple'

export default function LocationDebugger() {
  const { 
    location: primaryLoc, 
    loading: primaryLoading, 
    error: primaryError 
  } = useLocation()

  const { 
    location: simpleLoc, 
    loading: simpleLoading, 
    error: simpleError 
  } = useLocationSimple()

  const [testLat, setTestLat] = useState(null)
  const [testLng, setTestLng] = useState(null)
  const [testError, setTestError] = useState(null)
  const [testLoading, setTestLoading] = useState(false)

  const testBrowserLocation = () => {
    setTestLoading(true)
    setTestError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("LOCATION SUCCESS", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setTestLat(position.coords.latitude)
        setTestLng(position.coords.longitude)
        setTestLoading(false)
      },
      (error) => {
        console.error("LOCATION ERROR", error)
        setTestError(error.message)
        setTestLoading(false)
      }
    )
  }

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl max-w-md mx-auto my-6 border border-slate-700 font-mono text-xs">
      <h3 className="text-sm font-bold mb-4 text-emerald-400 border-b border-slate-700 pb-2">
        Location Debugger
      </h3>

      <div className="space-y-4">
        {/* Browser Geolocation Testing */}
        <div>
          <h4 className="font-bold text-blue-400 mb-1">Browser Location (Test):</h4>
          <button 
            type="button" 
            onClick={testBrowserLocation}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-lg mb-2 transition-colors active:scale-95"
          >
            {testLoading ? "Testing..." : "Test Current Location"}
          </button>
          <div>Latitude: {testLat !== null ? testLat : "Not fetched"}</div>
          <div>Longitude: {testLng !== null ? testLng : "Not fetched"}</div>
          {testError && <div className="text-red-400 mt-1">Error: {testError}</div>}
        </div>

        {/* Primary Hook State */}
        <div>
          <h4 className="font-bold text-purple-400 mb-1">Primary Hook Location:</h4>
          <div>Latitude: {primaryLoc?.latitude || "N/A"}</div>
          <div>Longitude: {primaryLoc?.longitude || "N/A"}</div>
          <div>City: {primaryLoc?.city || "N/A"}</div>
          <div>Area: {primaryLoc?.area || "N/A"}</div>
          <div>Address: {primaryLoc?.address || "N/A"}</div>
          <div>Loading: {primaryLoading ? "true" : "false"}</div>
          <div>Error: {primaryError || "None"}</div>
        </div>

        {/* Simple Hook State */}
        <div>
          <h4 className="font-bold text-amber-400 mb-1">Simple Hook Location:</h4>
          <div>Latitude: {simpleLoc?.latitude || "N/A"}</div>
          <div>Longitude: {simpleLoc?.longitude || "N/A"}</div>
          <div>City: {simpleLoc?.city || "N/A"}</div>
          <div>Area: {simpleLoc?.area || "N/A"}</div>
          <div>Address: {simpleLoc?.address || "N/A"}</div>
          <div>Loading: {simpleLoading ? "true" : "false"}</div>
          <div>Error: {simpleError || "None"}</div>
        </div>

        {/* Stored Location in LocalStorage */}
        <div>
          <h4 className="font-bold text-pink-400 mb-1">Stored User Location:</h4>
          {(() => {
            try {
              const stored = localStorage.getItem("userLocation")
              if (!stored) return <div>No userLocation in localStorage</div>
              const parsed = JSON.parse(stored)
              return (
                <>
                  <div>City: {parsed?.city || "N/A"}</div>
                  <div>Area: {parsed?.area || "N/A"}</div>
                  <div>Raw: <span className="text-[10px] break-all">{stored}</span></div>
                </>
              )
            } catch (e) {
              return <div className="text-red-400">Failed to parse storage: {e.message}</div>
            }
          })()}
        </div>
      </div>
    </div>
  )
}
