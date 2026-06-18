// Enemy art lives in src/assets/monsters/<enemyId>.png, bundled by Vite and
// indexed by enemy defId. Used as the background of an enemy in combat.
const modules = import.meta.glob("../assets/monsters/*.png", {
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

export function enemyImage(defId: string): string | undefined {
  return byId[defId];
}
