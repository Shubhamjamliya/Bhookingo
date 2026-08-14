import React from "react"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { MapPin, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react"
import { HIGHWAY_DETECTION_COPY } from "@food/utils/highwayDetectionCopy"
import { formatRoadDistance } from "@food/utils/formatRoadDistance"

export default function RestaurantAddressHighwaySection({
  sectionTitle = "Restaurant Location Address",
  sectionDescription = null,
  locationError = "",
  inputsDisabled = false,
  isGoogleMapsValid = true,
  isSearchingLocation = false,
  locationSearchValue = "",
  onLocationSearchChange,
  onLocationSearchBlur,
  locationSearchInputRef = null,
  locationSuggestions = [],
  locationSuggestionsVisible = null,
  onSelectLocationSuggestion,
  searchPlaceholder = "Search and select restaurant address...",
  searchHelpText = "Search to auto-fill Area, City, State, Pincode and coordinates.",
  isHighwayRestaurant = true,
  highwayInfo,
  showNormalRestaurantMessage = true,
  pinMapContainerRef = null,
  isMapsSdkReady = false,
  location = {},
  pinMapTitle = "Restaurant road preview map fallback",
  showMapsLink = false,
  mapsLinkValue = "",
  onMapsLinkChange,
  isProcessingLink = false,
  mapsLinkHelpText = "You can either search the restaurant above or paste a Google Maps location link.",
  locationSource = "",
  renderPrimaryContact = null,
  renderCityField = null,
  extraHighwayField = null,
  footerNote = null,
  onLocationFieldChange,
  onRoadNameChange,
  normalizePincode,
  cardClassName = "bg-white p-4 sm:p-6 rounded-md space-y-4",
  searchInputClassName = "mt-1 bg-white text-sm",
  fieldInputClassName = "bg-white text-sm",
  suggestionsClassName = "absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto",
  locationSourceClassName = "mt-3 text-xs flex items-center gap-1.5 font-medium text-slate-600 bg-slate-50/70 border border-slate-100 rounded px-2.5 py-1.5 w-fit",
}) {
  const latitude = Number(location?.latitude)
  const longitude = Number(location?.longitude)
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
  const shouldShowSuggestions =
    typeof locationSuggestionsVisible === "boolean"
      ? locationSuggestionsVisible
      : locationSuggestions.length > 0

  return (
    <section className={cardClassName}>
      <div>
        <h2 className="text-lg font-semibold text-black">{sectionTitle}</h2>
        {sectionDescription ? (
          <p className="text-sm text-gray-600 mt-1">{sectionDescription}</p>
        ) : null}
      </div>

      {locationError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {locationError}
        </div>
      ) : null}

      <div className="relative">
        <Label className="text-xs text-gray-700">Search location</Label>
        <div className="relative">
          <Input
            key={isGoogleMapsValid ? "google-input" : "fallback-input"}
            ref={isGoogleMapsValid ? locationSearchInputRef : null}
            value={locationSearchValue}
            onChange={(e) => onLocationSearchChange?.(e.target.value, e)}
            onBlur={onLocationSearchBlur}
            className={searchInputClassName}
            placeholder={searchPlaceholder}
            disabled={inputsDisabled}
          />
          {isSearchingLocation ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            </div>
          ) : null}
        </div>

        {shouldShowSuggestions && locationSuggestions.length > 0 ? (
          <div className={suggestionsClassName}>
            {locationSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onSelectLocationSuggestion?.(suggestion)}
                className="w-full px-4 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-orange-50 border-b border-gray-100 last:border-none"
              >
                <span className="truncate">{suggestion.display}</span>
              </button>
            ))}
          </div>
        ) : null}

        <p className="text-[11px] text-gray-500 mt-1">{searchHelpText}</p>

        {isHighwayRestaurant === true && (highwayInfo?.loading || highwayInfo?.status) ? (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
              highwayInfo?.loading
                ? "bg-slate-50 border-slate-200 text-slate-600"
                : highwayInfo?.status === "IN_SERVICE"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {highwayInfo?.loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                <span>{HIGHWAY_DETECTION_COPY.checking}</span>
              </div>
            ) : highwayInfo?.status === "IN_SERVICE" ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{HIGHWAY_DETECTION_COPY.success}</span>
                </div>
                <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                  <p>{HIGHWAY_DETECTION_COPY.nearestLabel}: <span className="font-medium text-slate-900">{highwayInfo?.highwayRef || highwayInfo?.highwayName || "-"}</span></p>
                  {highwayInfo?.highwayName ? (
                    <p>{HIGHWAY_DETECTION_COPY.roadLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>
                  ) : null}
                  {Number.isFinite(Number(highwayInfo?.distanceMeters)) ? (
                    <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{HIGHWAY_DETECTION_COPY.error}</span>
                </div>
                {highwayInfo?.highwayRef ? (
                  <div className="pl-6 text-slate-600 space-y-0.5 text-xs">
                    <p>{HIGHWAY_DETECTION_COPY.nearestLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayRef || highwayInfo.highwayName || "-"}</span></p>
                    {highwayInfo?.highwayName ? (
                      <p>{HIGHWAY_DETECTION_COPY.roadLabel}: <span className="font-medium text-slate-900">{highwayInfo.highwayName}</span></p>
                    ) : null}
                    {Number.isFinite(Number(highwayInfo?.distanceMeters)) ? (
                      <p>Distance: <span className="font-medium text-slate-900">{formatRoadDistance(highwayInfo.distanceMeters)}</span></p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {isHighwayRestaurant !== true && showNormalRestaurantMessage ? (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs">
            Normal restaurant selected. Highway detection is skipped.
          </div>
        ) : null}

        {hasCoordinates ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-900">Pin preview</p>
                <p className="text-[11px] text-gray-500">Tap on the map or drag the pin to save the exact restaurant coordinates.</p>
              </div>
              <MapPin className="h-4 w-4 text-restaurant-primary" />
            </div>
            {isMapsSdkReady ? (
              <div ref={pinMapContainerRef} className="h-[220px] w-full" />
            ) : (
              <iframe
                src={`https://www.google.com/maps?q=${latitude},${longitude}&hl=en&z=16&output=embed`}
                width="100%"
                height="220"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={pinMapTitle}
                className="w-full"
              />
            )}
            <div className="border-t border-gray-200 bg-white px-4 py-2 text-[11px] text-gray-600 space-y-1">
              <div>
                Coordinates saved: <span className="font-semibold text-gray-900">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
              </div>
              {!isMapsSdkReady ? (
                <div className="text-gray-500">Interactive pin is loading. You can still see the selected location, and the coordinates will be saved.</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {showMapsLink ? (
        <>
          <div className="flex items-center my-1">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="px-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">OR</span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          <div>
            <Label className="text-xs text-gray-700">Google Maps Location Link (Optional)</Label>
            <div className="relative mt-1">
              <Input
                value={mapsLinkValue}
                onChange={(e) => onMapsLinkChange?.(e)}
                className="bg-white text-sm pr-10"
                placeholder="Paste Google Maps URL here"
                disabled={isProcessingLink || inputsDisabled}
              />
              {isProcessingLink ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                </div>
              ) : null}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">{mapsLinkHelpText}</p>
          </div>
        </>
      ) : null}

      {locationSource ? (
        <div className={locationSourceClassName}>
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span>Location Source:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            locationSource === "google_maps_link" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
          }`}>
            {locationSource === "google_maps_link" ? "Google Maps Link" : "Google Search"}
          </span>
        </div>
      ) : null}

      {renderPrimaryContact}

      <div className="space-y-3">
        <Input
          value={location?.area || ""}
          onChange={(e) => onLocationFieldChange?.("area", e.target.value)}
          className={fieldInputClassName}
          placeholder="Area / Sector / Locality*"
          disabled={inputsDisabled}
        />

        {renderCityField || (
          <Input
            value={location?.city || ""}
            onChange={(e) => onLocationFieldChange?.("city", e.target.value)}
            className={fieldInputClassName}
            placeholder="City*"
            disabled={inputsDisabled}
          />
        )}

        <Input
          value={location?.addressLine1 || ""}
          onChange={(e) => onLocationFieldChange?.("addressLine1", e.target.value)}
          className={fieldInputClassName}
          placeholder="Shop no. / building no. (optional)"
          disabled={inputsDisabled}
        />

        <Input
          value={location?.addressLine2 || ""}
          onChange={(e) => onLocationFieldChange?.("addressLine2", e.target.value)}
          className={fieldInputClassName}
          placeholder="Floor / tower (optional)"
          disabled={inputsDisabled}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={location?.state || ""}
            onChange={(e) => onLocationFieldChange?.("state", e.target.value)}
            className={fieldInputClassName}
            placeholder="State"
            disabled={inputsDisabled}
          />
          <Input
            value={location?.pincode || ""}
            onChange={(e) =>
              onLocationFieldChange?.(
                "pincode",
                typeof normalizePincode === "function" ? normalizePincode(e.target.value) : e.target.value,
              )
            }
            className={fieldInputClassName}
            placeholder="Pincode"
            disabled={inputsDisabled}
          />
        </div>

        <Input
          value={location?.landmark || ""}
          onChange={(e) => onLocationFieldChange?.("landmark", e.target.value)}
          className={fieldInputClassName}
          placeholder="Nearby landmark (optional)"
          disabled={inputsDisabled}
        />

        {isHighwayRestaurant === true ? (
          <div>
            <Label className="text-xs text-gray-700">{HIGHWAY_DETECTION_COPY.roadFieldLabel}</Label>
            <Input
              value={location?.roadName || ""}
              onChange={(e) => onRoadNameChange?.(e.target.value, e)}
              className="mt-1 bg-white text-sm"
              placeholder={HIGHWAY_DETECTION_COPY.roadFieldPlaceholder}
              disabled={inputsDisabled}
            />
            <p className="text-[11px] text-gray-500 mt-1">{HIGHWAY_DETECTION_COPY.manualHint}</p>
          </div>
        ) : null}

        {extraHighwayField}

        {footerNote ? (
          <p className="text-[11px] text-gray-500 mt-1">{footerNote}</p>
        ) : null}
      </div>
    </section>
  )
}
