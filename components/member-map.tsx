"use client";

import { useEffect, useRef, useState } from "react";

interface Organisation {
  id: string;
  name: string;
  org_type: string;
  location: string;
  city: string;
  country: string;
  description?: string;
  website?: string;
  lat?: number;
  lng?: number;
}

const TYPE_COLORS: Record<string, string> = {
  Foundation: "#2EC4B6",
  University: "#7C5CFC",
  Startup: "#00B894",
  SME: "#F0A500",
  "Clinical Center": "#E74C6F",
  Investor: "#4A7DFF",
  "International Partner": "#F0A500",
};

const TYPE_BG: Record<string, string> = {
  Foundation: "#E8F8F6",
  University: "#F0EDFF",
  Startup: "#E6F9F5",
  SME: "#FFF8E6",
  "Clinical Center": "#FDECF1",
  Investor: "#EBF1FF",
  "International Partner": "#FFF8E6",
};

export default function MemberMap({ isAdmin = false }: { isAdmin?: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch organisations from DB
  useEffect(() => {
    fetch("/api/organisations")
      .then(r => r.json())
      .then(d => {
        const withCoords = (d.organisations || []).filter(
          (o: Organisation) => o.lat && o.lng
        );
        setOrgs(withCoords);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build map once orgs are loaded
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef.current as any).remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [45, 20],
        zoom: 3,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      orgs.forEach((org) => {
        if (!org.lat || !org.lng) return;
        const color = TYPE_COLORS[org.org_type] || "#2EC4B6";
        const bg = TYPE_BG[org.org_type] || "#E8F8F6";
        const locationLabel = [org.city, org.country].filter(Boolean).join(", ") || org.location || "";

        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
              <div style="transform:rotate(45deg);color:white;font-size:14px;font-weight:800;font-family:'Sora',sans-serif;margin-top:-2px;">${org.name.charAt(0)}</div>
            </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

        const popupContent = `
          <div style="font-family:'DM Sans',-apple-system,sans-serif;min-width:200px;padding:4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:8px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">${org.name.charAt(0)}</div>
              <div>
                <div style="font-size:14px;font-weight:700;color:#1A2332;">${org.name}</div>
                <div style="font-size:11px;color:#8896A6;margin-top:1px;">${locationLabel}</div>
              </div>
            </div>
            <span style="display:inline-block;font-size:10px;padding:3px 10px;border-radius:20px;background:${bg};color:${color};font-weight:700;margin-bottom:${org.description ? '8px' : '0'};">${org.org_type}</span>
            ${org.description ? `<p style="font-size:12px;color:#4A5568;margin:8px 0 0;line-height:1.5;">${org.description}</p>` : ""}
            ${org.website ? `<a href="${org.website}" target="_blank" style="display:block;margin-top:8px;font-size:12px;color:#2EC4B6;text-decoration:none;font-weight:600;">Visit website →</a>` : ""}
          </div>`;

        L.marker([org.lat!, org.lng!], { icon: svgIcon })
          .bindPopup(popupContent, { maxWidth: 260, className: "bioergotech-popup" })
          .addTo(map);
      });

      const style = document.createElement("style");
      style.textContent = `
        .bioergotech-popup .leaflet-popup-content-wrapper { border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);border:1px solid #E8EDF3;padding:0; }
        .bioergotech-popup .leaflet-popup-content { margin:16px; }
        .bioergotech-popup .leaflet-popup-tip { background:white; }
        .leaflet-control-attribution { font-size:10px !important; }
      `;
      document.head.appendChild(style);
      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [orgs, loading, isAdmin]);

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #E8EDF3" }}>
      {loading && (
        <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F9FC", fontSize: 14, color: "#8896A6" }}>
          Loading map…
        </div>
      )}
      <div ref={mapRef} style={{ height: 420, width: "100%", background: "#F7F9FC", display: loading ? "none" : "block" }} />

      {/* Legend */}
      {!loading && (
        <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", border: "1px solid #E8EDF3", zIndex: 1000 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8896A6", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7, fontFamily: "'DM Sans',sans-serif" }}>Organisation Type</div>
          {Object.entries(TYPE_COLORS).slice(0, 5).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#4A5568", fontFamily: "'DM Sans',sans-serif" }}>{type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Member count badge */}
      {!loading && (
        <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "6px 12px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", border: "1px solid #E8EDF3", zIndex: 1000, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2EC4B6" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2332", fontFamily: "'DM Sans',sans-serif" }}>{orgs.length} organisation{orgs.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
