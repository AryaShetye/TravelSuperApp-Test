/**
 * PropertyMap — Interactive map using Leaflet + OpenStreetMap tiles
 *
 * Completely free — no API key, no billing.
 * Tile provider: tile.openstreetmap.org (free, attribution required)
 *
 * Usage:
 *   <PropertyMap lat={15.5449} lng={73.7553} title="Cozy Cottage" zoom={14} />
 *   <PropertyMap markers={[{ lat, lng, title, id }]} zoom={10} />
 */

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import '../../styles/map.css';

// Leaflet is loaded dynamically to avoid SSR issues
let L = null;

async function getLeaflet() {
  if (L) return L;
  L = await import('leaflet');

  // Fix default marker icon paths broken by webpack
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  return L;
}

// Custom red marker for the primary property
function createPrimaryIcon(leaflet) {
  return leaflet.divIcon({
    className: '',
    html: `<div class="map-marker map-marker--primary" aria-hidden="true">
             <span>🏠</span>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
  });
}

// Standard marker for nearby/list properties
function createSecondaryIcon(leaflet) {
  return leaflet.divIcon({
    className: '',
    html: `<div class="map-marker map-marker--secondary" aria-hidden="true">
             <span>📍</span>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

export default function PropertyMap({
  lat,
  lng,
  title,
  zoom = 14,
  markers = [],       // [{lat, lng, title, id, price}] for multi-marker view
  height = '360px',
  onMarkerClick,      // (id) => void
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      const leaflet = await getLeaflet();
      if (!mounted || !mapRef.current) return;

      // Destroy existing map instance before re-init (React StrictMode safe)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerLat = lat || markers[0]?.lat || 20.5937;
      const centerLng = lng || markers[0]?.lng || 78.9629;

      const map = leaflet.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false, // prevent accidental zoom while scrolling page
        attributionControl: true,
      });

      mapInstanceRef.current = map;

      // ─── OpenStreetMap tile layer ─────────────────────────────────────────
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      // ─── Single property marker ───────────────────────────────────────────
      if (lat && lng) {
        const marker = leaflet
          .marker([lat, lng], { icon: createPrimaryIcon(leaflet), alt: title || 'Property location' })
          .addTo(map);

        if (title) {
          marker.bindPopup(
            `<div class="map-popup">
               <strong>${title}</strong>
               <p class="map-popup-note">📍 Approximate location</p>
             </div>`,
            { maxWidth: 200 }
          );
          marker.openPopup();
        }

        markersRef.current.push(marker);
      }

      // ─── Multiple markers (search results / nearby) ───────────────────────
      if (markers.length > 0) {
        const bounds = [];

        markers.forEach((m) => {
          if (!m.lat || !m.lng) return;

          const icon = m.isPrimary ? createPrimaryIcon(leaflet) : createSecondaryIcon(leaflet);
          const marker = leaflet
            .marker([m.lat, m.lng], { icon, alt: m.title || 'Property' })
            .addTo(map);

          const priceLabel = m.price
            ? `<span class="map-popup-price">₹${Number(m.price).toLocaleString('en-IN')}/night</span>`
            : '';

          marker.bindPopup(
            `<div class="map-popup">
               <strong>${m.title || 'Property'}</strong>
               ${priceLabel}
               ${m.id ? `<a href="/properties/${m.id}" class="map-popup-link">View details →</a>` : ''}
             </div>`,
            { maxWidth: 220 }
          );

          if (onMarkerClick && m.id) {
            marker.on('click', () => onMarkerClick(m.id));
          }

          markersRef.current.push(marker);
          bounds.push([m.lat, m.lng]);
        });

        // Fit map to show all markers
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    }

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, [lat, lng, title, zoom, markers, onMarkerClick]);

  return (
    <div className="property-map-wrapper" style={{ height }}>
      <div
        ref={mapRef}
        className="property-map"
        style={{ height: '100%', width: '100%' }}
        role="application"
        aria-label={title ? `Map showing location of ${title}` : 'Property locations map'}
      />
    </div>
  );
}
