// Bundled-image lookups for each asset folder (Vite globs, hashed URLs).
// Each returns the image URL for an id, or undefined if there's no art —
// callers fall back to text / emoji.

function indexById(modules: Record<string, string>): Record<string, string> {
  const byId: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const id = path.split("/").pop()!.replace(/\.png$/, "");
    byId[id] = url;
  }
  return byId;
}

const relics = indexById(
  import.meta.glob("../assets/relics/*.png", { eager: true, import: "default" }) as Record<string, string>,
);
const potions = indexById(
  import.meta.glob("../assets/potions/*.png", { eager: true, import: "default" }) as Record<string, string>,
);
const nodes = indexById(
  import.meta.glob("../assets/nodes/*.png", { eager: true, import: "default" }) as Record<string, string>,
);
const characters = indexById(
  import.meta.glob("../assets/characters/*.png", { eager: true, import: "default" }) as Record<string, string>,
);

export const relicImage = (id: string): string | undefined => relics[id];
export const potionImage = (id: string): string | undefined => potions[id];
export const nodeImage = (type: string): string | undefined => nodes[type];
export const characterImage = (id: string): string | undefined => characters[id];
