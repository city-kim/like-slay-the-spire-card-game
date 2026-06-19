import { useState } from "react";
import { useTranslation } from "../i18n";
import { isMuted, setMuted } from "./sound";

/** Mute / unmute toggle (persisted to localStorage). */
export function SoundToggle() {
  const { t } = useTranslation();
  const [muted, setLocal] = useState(isMuted());
  return (
    <button
      className="sound-toggle"
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setLocal(next);
      }}
      title={muted ? t("ui.soundOn") : t("ui.soundOff")}
      aria-label={muted ? t("ui.soundOn") : t("ui.soundOff")}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
