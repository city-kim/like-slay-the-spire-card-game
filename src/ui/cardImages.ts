// Card art lives in src/assets/cards/<cardId>.png. Vite bundles every match of
// this glob (hashed URLs) at build time; we index them by card id so the UI can
// look up art with cardImage(defId). Missing art simply returns undefined.
const modules = import.meta.glob("../assets/cards/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const byId: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const id = path
    .split("/")
    .pop()!
    .replace(/\.png$/, "");
  byId[id] = url;
}

export function cardImage(defId: string): string | undefined {
  return byId[defId];
}
