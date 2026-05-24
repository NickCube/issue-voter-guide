import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type RacePin = {
  id: string;
  name: string;
  location: string | null;
  election_date: string | null;
};

// Approximate centroids for Morris County, NJ municipalities + statewide markers.
const COORDS: Record<string, [number, number]> = {
  "morris county, nj": [40.8, -74.55],
  "new jersey": [40.5, -74.4],
  "new jersey 11th congressional district (incl. morris county)": [40.85, -74.45],
  "parsippany-troy hills, nj": [40.8579, -74.426],
  "morristown, nj": [40.7968, -74.4815],
  "morris township, nj": [40.8, -74.5],
  "morris plains, nj": [40.8373, -74.4807],
  "mount olive, nj": [40.8779, -74.7263],
  "madison, nj": [40.7598, -74.4171],
  "dover, nj": [40.8843, -74.5621],
  "boonton town, nj": [40.9026, -74.4071],
  "boonton township, nj": [40.9181, -74.4221],
  "butler borough, nj": [40.9985, -74.3404],
  "chatham borough, nj": [40.7406, -74.3843],
  "chatham township, nj": [40.7301, -74.4],
  "chester borough, nj": [40.7848, -74.6957],
  "chester township, nj": [40.79, -74.71],
  "denville township, nj": [40.8918, -74.4815],
  "east hanover township, nj": [40.8167, -74.3645],
  "florham park borough, nj": [40.7884, -74.388],
  "hanover township, nj": [40.8175, -74.3849],
  "harding township, nj": [40.7501, -74.5279],
  "jefferson township, nj": [40.9779, -74.5946],
  "kinnelon borough, nj": [40.9876, -74.3676],
  "lincoln park borough, nj": [40.9237, -74.305],
  "long hill township, nj": [40.6884, -74.486],
  "mendham borough, nj": [40.7754, -74.6004],
  "mendham township, nj": [40.7773, -74.6262],
  "mine hill township, nj": [40.8801, -74.6063],
  "montville township, nj": [40.913, -74.376],
  "morris plains borough, nj": [40.8373, -74.4807],
  "mount arlington borough, nj": [40.9237, -74.6332],
  "mountain lakes borough, nj": [40.8895, -74.4351],
  "netcong borough, nj": [40.8984, -74.7077],
  "pequannock township, nj": [40.9612, -74.3001],
  "randolph township, nj": [40.8487, -74.5779],
  "riverdale borough, nj": [40.9929, -74.3104],
  "rockaway borough, nj": [40.9012, -74.5141],
  "rockaway township, nj": [40.9376, -74.5304],
  "roxbury township, nj": [40.8723, -74.6532],
  "victory gardens borough, nj": [40.8773, -74.5421],
  "washington township, nj": [40.7848, -74.7732],
  "wharton borough, nj": [40.8959, -74.5824],
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
        center={[40.83, -74.5]}
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
