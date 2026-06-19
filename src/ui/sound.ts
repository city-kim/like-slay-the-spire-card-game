// Tiny sound manager. Audio files live in src/assets/sfx/<name>.{mp3,ogg,wav}
// and are bundled by Vite. Until assets are added, playSound() is a safe no-op,
// so trigger points can be wired up now and "just work" once files land.
//
// Expected sound names (add any subset): cardPlay, attack, hurt, heal,
// victory, defeat, select.

const modules = import.meta.glob("../assets/sfx/*.{mp3,ogg,wav}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const name = path.split("/").pop()!.replace(/\.(mp3|ogg|wav)$/, "");
  byName[name] = url;
}

/** Sound names that actually have an asset (others no-op). */
export const AVAILABLE_SOUNDS = Object.keys(byName);

const STORAGE_KEY = "spire-muted";
let muted = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

/** Play a named sound. No-op if muted, unsupported, or the asset is missing. */
export function playSound(name: string, volume = 0.5): void {
  if (muted || typeof Audio === "undefined") return;
  const url = byName[name];
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Autoplay can be blocked before the first user gesture — ignore.
    });
  } catch {
    // ignore
  }
}
