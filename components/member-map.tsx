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

// SVG path strings per org type for map pins
const PIN_SVG: Record<string, string> = {
  startup: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`,
  sme: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
  hospital: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>`,
  "Clinical Center": `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>`,
  clinical_center: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>`,
  university: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
  University: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
  investor: `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  international_partner: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  "International Partner": `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  foundation: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  Foundation: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
};

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

      // Add small jitter to avoid overlapping pins at same coordinates
      const coordCount: Record<string, number> = {};
      const jitteredOrgs = orgs.map(org => {
        const key = `${org.lat?.toFixed(2)},${org.lng?.toFixed(2)}`;
        coordCount[key] = (coordCount[key] || 0) + 1;
        const idx = coordCount[key] - 1;
        const jitter = idx === 0 ? 0 : 0.05;
        const angle = (idx * 137.5 * Math.PI) / 180;
        return {
          ...org,
          lat: (org.lat || 0) + (idx > 0 ? jitter * Math.cos(angle) : 0),
          lng: (org.lng || 0) + (idx > 0 ? jitter * Math.sin(angle) : 0),
        };
      });

      jitteredOrgs.forEach((org) => {
        if (!org.lat || !org.lng) return;
        const color = TYPE_COLORS[org.org_type] || "#2EC4B6";
        const bg = TYPE_BG[org.org_type] || "#E8F8F6";
        const locationLabel = [org.city, org.country].filter(Boolean).join(", ") || org.location || "";

        const pinSvg = PIN_SVG[org.org_type] || null;
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
                ${pinSvg
                  ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pinSvg}</svg>`
                  : `<span style="color:white;font-size:14px;font-weight:800;font-family:'Sora',sans-serif;">${org.name.charAt(0)}</span>`
                }
              </div>
            </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
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
