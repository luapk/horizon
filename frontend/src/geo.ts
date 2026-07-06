/** Resolves the free-text `geo` field on signals to globe coordinates.
 *
 * The geo string is whatever an LLM wrote ("United States", "Western Europe",
 * "Silicon Valley", "APAC") or a user typed into the brand form -- so this
 * needs real coverage, not a toy lookup. Strategy: normalize the string,
 * try an exact alias hit, then fall back to whole-word phrase matching
 * (longest phrase wins, so "south korea" beats "korea"). Genuinely global
 * strings ("Global", "Worldwide") intentionally resolve to nothing and are
 * reported as unmapped rather than plotted at a fake location. */

const COORDS: Record<string, [number, number]> = {
  // ── continents & macro-regions ──────────────────────────────
  "north america": [45, -100], "south america": [-15, -60], "latin america": [-15, -60], "latam": [-15, -60],
  "central america": [15, -88], "caribbean": [18, -75],
  "europe": [50, 10], "western europe": [48, 4], "eastern europe": [50, 30],
  "northern europe": [60, 15], "southern europe": [41, 14], "central europe": [49, 16],
  "asia": [40, 95], "east asia": [35, 115], "southeast asia": [5, 110], "south asia": [22, 79],
  "central asia": [45, 68], "asia pacific": [10, 120], "apac": [10, 120],
  "middle east": [29, 45], "mena": [27, 30], "gulf": [25, 51], "gcc": [25, 51],
  "africa": [2, 21], "sub saharan africa": [-3, 25], "north africa": [28, 12],
  "west africa": [10, 0], "east africa": [0, 37], "southern africa": [-26, 25],
  "oceania": [-25, 140], "australasia": [-30, 140],
  "nordics": [63, 16], "scandinavia": [63, 16], "baltics": [57, 24], "benelux": [51, 5],
  "emea": [30, 20], "eu": [50, 10], "eurozone": [50, 10], "european union": [50, 10],
  // ── North America ────────────────────────────────────────────
  "united states": [39, -98], "united states of america": [39, -98], "usa": [39, -98],
  "us": [39, -98], "u s": [39, -98], "u s a": [39, -98], "america": [39, -98],
  "canada": [56, -106], "mexico": [23, -102],
  "california": [37, -120], "silicon valley": [37.4, -122.1], "bay area": [37.6, -122],
  "new york": [40.7, -74], "texas": [31, -99], "florida": [28, -82], "washington": [38.9, -77],
  "boston": [42.4, -71], "chicago": [41.9, -87.6], "seattle": [47.6, -122.3], "los angeles": [34, -118.2],
  // ── Europe ───────────────────────────────────────────────────
  "uk": [54, -2], "u k": [54, -2], "united kingdom": [54, -2], "britain": [54, -2],
  "great britain": [54, -2], "england": [52.5, -1.5], "scotland": [56.5, -4], "ireland": [53, -8],
  "london": [51.5, -0.13], "germany": [51, 10], "berlin": [52.5, 13.4], "france": [47, 2], "paris": [48.9, 2.35],
  "spain": [40, -4], "italy": [42.8, 12.5], "netherlands": [52.2, 5.3], "amsterdam": [52.4, 4.9],
  "switzerland": [46.8, 8.2], "sweden": [62, 15], "stockholm": [59.3, 18], "norway": [64, 11],
  "denmark": [56, 10], "copenhagen": [55.7, 12.6], "finland": [64, 26], "poland": [52, 19],
  "portugal": [39.5, -8], "austria": [47.6, 14], "belgium": [50.6, 4.7], "greece": [39, 22],
  "czech republic": [49.8, 15.5], "czechia": [49.8, 15.5], "hungary": [47, 19.5], "romania": [46, 25],
  "estonia": [59, 26], "iceland": [65, -18],
  // ── Asia-Pacific ─────────────────────────────────────────────
  "japan": [36, 138], "tokyo": [35.7, 139.7], "china": [35, 105], "beijing": [39.9, 116.4],
  "shanghai": [31.2, 121.5], "shenzhen": [22.5, 114], "hong kong": [22.3, 114.2],
  "south korea": [36.5, 127.8], "korea": [36.5, 127.8], "seoul": [37.6, 127],
  "taiwan": [23.7, 121], "taipei": [25, 121.5], "india": [21, 78], "mumbai": [19, 72.9],
  "bangalore": [13, 77.6], "bengaluru": [13, 77.6], "delhi": [28.6, 77.2],
  "singapore": [1.35, 103.8], "indonesia": [-2, 118], "jakarta": [-6.2, 106.8],
  "malaysia": [4, 102], "thailand": [15, 101], "bangkok": [13.75, 100.5], "vietnam": [16, 107],
  "philippines": [12, 122], "australia": [-25, 134], "sydney": [-33.9, 151.2], "melbourne": [-37.8, 145],
  "new zealand": [-42, 172], "pakistan": [30, 70], "bangladesh": [24, 90],
  // ── Middle East & Africa ─────────────────────────────────────
  "israel": [31.4, 35], "tel aviv": [32.1, 34.8], "turkey": [39, 35], "istanbul": [41, 29],
  "saudi arabia": [24, 45], "uae": [24, 54], "u a e": [24, 54], "united arab emirates": [24, 54],
  "dubai": [25.2, 55.3], "abu dhabi": [24.5, 54.4], "qatar": [25.3, 51.2], "egypt": [26, 30], "cairo": [30, 31.2],
  "nigeria": [9, 8], "lagos": [6.5, 3.4], "kenya": [0.5, 38], "nairobi": [-1.3, 36.8],
  "south africa": [-29, 25], "johannesburg": [-26.2, 28], "morocco": [32, -6],
  // ── Latin America ────────────────────────────────────────────
  "brazil": [-10, -52], "sao paulo": [-23.5, -46.6], "argentina": [-34, -64], "buenos aires": [-34.6, -58.4],
  "chile": [-33, -71], "colombia": [4, -73], "peru": [-9, -75], "russia": [60, 90], "moscow": [55.75, 37.6],
};

/** These mean "everywhere" -- honestly report them as unmapped. */
const GLOBAL_TERMS = new Set(["global", "worldwide", "international", "everywhere", "multiple regions", "cross border", "cross-border", "n/a", "na", "unknown"]);

/** Alias keys sorted longest-phrase-first so fallback prefers the most
 * specific match ("south korea" before "korea"). */
const SORTED_KEYS = Object.keys(COORDS).sort((a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length);

export interface GeoPoint {
  lat: number;
  lng: number;
  name: string;
}

function normalize(s: string): string {
  let n = s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (n.startsWith("the ")) n = n.slice(4);
  return n;
}

function resolvePart(raw: string): GeoPoint | null {
  const norm = normalize(raw);
  if (!norm || GLOBAL_TERMS.has(norm)) return null;

  const exact = COORDS[norm];
  if (exact) return { lat: exact[0], lng: exact[1], name: raw.trim() };

  // Whole-word phrase fallback: "signal observed in western europe" -> western europe.
  for (const key of SORTED_KEYS) {
    if (new RegExp(`(^| )${key}( |$)`).test(norm)) {
      const c = COORDS[key];
      return { lat: c[0], lng: c[1], name: raw.trim() };
    }
  }
  return null;
}

/** Resolve one signal geo string to zero or more distinct points. */
export function resolveGeo(geo: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  const seen = new Set<string>();
  for (const part of geo.split(/[/,&+]| and /i)) {
    const p = resolvePart(part);
    if (p) {
      const key = `${p.lat},${p.lng}`;
      if (!seen.has(key)) { seen.add(key); points.push(p); }
    }
  }
  return points;
}
