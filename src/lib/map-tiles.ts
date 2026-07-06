export type MapTileStyle = "carto-voyager" | "cyclosm" | "osm" | "maptiler-outdoor";

export type MapTileConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
};

export function getMapTileConfig(): MapTileConfig {
  const style = (import.meta.env.VITE_MAP_STYLE?.trim() || "carto-voyager") as MapTileStyle;
  const maptilerKey = import.meta.env.VITE_MAPTILER_API_KEY?.trim();

  if (style === "maptiler-outdoor" && maptilerKey) {
    return {
      url: `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${maptilerKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; OpenStreetMap contributors',
      maxZoom: 20,
    };
  }

  switch (style) {
    case "cyclosm":
      return {
        url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles by <a href="https://www.cyclosm.org/" target="_blank" rel="noopener noreferrer">CyclOSM</a>',
        maxZoom: 20,
        subdomains: "abc",
      };
    case "osm":
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      };
    case "carto-voyager":
    default:
      return {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        maxZoom: 20,
        subdomains: "abcd",
      };
  }
}
