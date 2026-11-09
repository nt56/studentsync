"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  venue: string;
  title: string;
}

export default function EventLocationMap({
  latitude,
  longitude,
  venue,
  title,
}: EventLocationMapProps) {
  // Prevent hydration issues — component only mounts client-side
  useEffect(() => {}, []);

  return (
    <div className="w-full h-72 rounded-2xl overflow-hidden border border-border/80 shadow-xs relative">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="p-1 font-sans">
              <p className="font-semibold text-sm text-slate-900">{title}</p>
              <p className="text-xs text-slate-600 mt-1">{venue}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
