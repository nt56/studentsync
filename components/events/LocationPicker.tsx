"use client";

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Click anywhere on the map to place the event pin
        </span>
        {markerPosition && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Navigation className="h-3 w-3" />
            {markerPosition[0].toFixed(4)}, {markerPosition[1].toFixed(4)}
          </span>
        )}
      </div>

      <div className="w-full h-64 rounded-2xl overflow-hidden border border-border/80 shadow-xs relative">
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
    </div>
  );
}
