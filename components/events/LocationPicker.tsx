"use client";

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ClickHandlerProps {
  onCoordinates: (lat: number, lng: number) => void;
}

function ClickHandler({ onCoordinates }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onCoordinates(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onCoordinates: (lat: number, lng: number) => void;
}

export default function LocationPicker({
  latitude,
  longitude,
  onCoordinates,
}: LocationPickerProps) {
  // Prevent hydration issues — component only mounts client-side
  useEffect(() => {}, []);

  const handleCoordinates = useCallback(
    (lat: number, lng: number) => {
      onCoordinates(lat, lng);
    },
    [onCoordinates],
  );

  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  const markerPosition: [number, number] | null =
    latitude != null && longitude != null ? [latitude, longitude] : null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Click on the map to set the event location
      </p>
      <div className="w-full h-56 rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={markerPosition ?? defaultCenter}
          zoom={markerPosition ? 15 : 5}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onCoordinates={handleCoordinates} />
          {markerPosition && <Marker position={markerPosition} />}
        </MapContainer>
      </div>
      {markerPosition && (
        <p className="text-xs text-muted-foreground">
          Selected: {markerPosition[0]}, {markerPosition[1]}
        </p>
      )}
    </div>
  );
}
