/** Maps the free-text `geo` field on signals to coordinates for the globe.
 * Compound geos ("US/UK/Singapore") resolve to multiple points; anything
 * unrecognized (including "Global") is reported separately, never plotted
 * at a made-up location. */

const COORDS: Record<string, [number, number]> = {
  // [lat, lng]
  "us": [39, -98], "usa": [39, -98], "united states": [39, -98], "america": [39, -98], "north america": [45, -100],
  "eu": [50, 10], "europe": [50, 10],
  "uk": [54, -2], "united kingdom": [54, -2], "britain": [54, -2],
  "germany": [51, 10], "france": [47, 2], "switzerland": [46.8, 8.2], "netherlands": [52.2, 5.3],
  "spain": [40, -4], "italy": [42.8, 12.5], "sweden": [62, 15], "norway": [64, 11], "denmark": [56, 10],
  "finland": [64, 26], "poland": [52, 19], "ireland": [53, -8], "portugal": [39.5, -8],
  "austria": [47.6, 14], "belgium": [50.6, 4.7],
  "japan": [36, 138], "south korea": [36.5, 127.8], "korea": [36.5, 127.8],
  "china": [35, 105], "india": [21, 78], "singapore": [1.35, 103.8],
  "taiwan": [23.7, 121], "hong kong": [22.3, 114.2], "indonesia": [-2, 118], "malaysia": [4, 102],
  "thailand": [15, 101], "vietnam": [16, 107], "philippines": [12, 122],
  "australia": [-25, 134], "new zealand": [-42, 172],
  "brazil": [-10, -52], "argentina": [-34, -64], "chile": [-33, -71], "colombia": [4, -73],
  "peru": [-9, -75], "mexico": [23, -102], "canada": [56, -106],
  "israel": [31.4, 35], "turkey": [39, 35], "saudi arabia": [24, 45], "uae": [24, 54],
  "middle east": [29, 45], "egypt": [26, 30], "nigeria": [9, 8], "south africa": [-29, 25],
  "kenya": [0.5, 38], "africa": [2, 21], "russia": [60, 90],
};

export interface GeoPoint {
  lat: number;
  lng: number;
  name: string;
}

/** Resolve one signal geo string to zero or more points. */
export function resolveGeo(geo: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (const part of geo.split(/[/,+&]| and /i)) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    const hit = COORDS[key];
    if (hit) points.push({ lat: hit[0], lng: hit[1], name: part.trim() });
  }
  return points;
}
