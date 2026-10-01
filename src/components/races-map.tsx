import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type RacePin = {
  id: string;
  name: string;
  location: string | null;
  election_date: string | null;
};

// Approximate centroids for Somerset County, NJ municipalities and districts.
const COORDS: Record<string, [number, number]> = {
  "somerset county, nj": [40.5633, -74.6168], "bedminster, nj": [40.6807, -74.6454],
  "bernards, nj": [40.6834, -74.5777], "bernardsville, nj": [40.7187, -74.5693],
  "bound brook, nj": [40.5684, -74.5385], "branchburg, nj": [40.5687, -74.7018],
  "bridgewater, nj": [40.5939, -74.6049], "far hills, nj": [40.684, -74.6357],
  "franklin, nj": [40.4776, -74.5403], "green brook, nj": [40.6032, -74.4718],
  "hillsborough, nj": [40.4976, -74.6708], "manville, nj": [40.54, -74.5877],
  "millstone, nj": [40.4987, -74.5904], "montgomery, nj": [40.4257, -74.6488],
  "north plainfield, nj": [40.6301, -74.4274], "peapack-gladstone, nj": [40.7168, -74.6568],
  "raritan, nj": [40.5695, -74.6329], "rocky hill, nj": [40.4009, -74.6407],
  "somerville, nj": [40.5743, -74.6099], "south bound brook, nj": [40.5534, -74.5315],
  "warren, nj": [40.6342, -74.5007], "watchung, nj": [40.6379, -74.4507],
  "new jersey 7th district (incl. somerset county)": [40.62, -74.65],
  "new jersey 12th district (incl. somerset county)": [40.43, -74.56],
};

function lookup(location: string | null): [number, number] | null {
  if (!location) return null;
  const key = location.trim().toLowerCase();
  if (COORDS[key]) return COORDS[key];
  // fuzzy: match by town name (first token)
  const first = key.split(",")[0].trim();
  for (const k of Object.keys(COORDS)) {
    if (k.split(",")[0].trim() === first) return COORDS[k];
  }
  for (const k of Object.keys(COORDS)) {
    if (key.includes(k.split(",")[0])) return COORDS[k];
  }
  return null;
}

export function RacesMap({ races }: { races: RacePin[] }) {
  const [Leaflet, setLeaflet] = useState<typeof import("react-leaflet") | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl, leaflet]) => {
      if (!mounted) return;
      // Fix default marker icon (Leaflet's default icon paths break under bundlers)
      const iconUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const iconRetinaUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const shadowUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      leaflet.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
      // @ts-expect-error: internal getter override
      delete leaflet.Icon.Default.prototype._getIconUrl;
      setLeaflet(rl);
      setL(leaflet);
    });
    // Inject leaflet CSS once
    if (typeof document !== "undefined" && !document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    return () => {
      mounted = false;
    };
  }, []);

  const pins = races
    .map((r) => ({ race: r, coords: lookup(r.location) }))
    .filter((p): p is { race: RacePin; coords: [number, number] } => p.coords !== null);

  if (!Leaflet || !L) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = Leaflet;

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <MapContainer
        center={[40.56, -74.59]}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: 420, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map(({ race, coords }) => (
          <Marker key={race.id} position={coords}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{race.name}</div>
                {race.location && (
                  <div className="text-xs text-muted-foreground">{race.location}</div>
                )}
                <Link
                  to="/races/$raceId"
                  params={{ raceId: race.id }}
                  className="text-xs font-medium text-primary underline"
                >
                  Open race →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
