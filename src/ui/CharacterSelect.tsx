import { useState } from "react";
import { ALL_CHARACTER_IDS, getCharacter } from "../run";
import { useTranslation } from "../i18n";
import { loadDifficulty, saveDifficulty } from "./difficultyStorage";
import { characterImage } from "./assetImages";
import playerUrl from "../assets/ui/player.png";
import logoUrl from "../assets/ui/logo.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SoundToggle } from "./SoundToggle";

/** Title / character-select screen shown before a run begins. */
export function CharacterSelect({ onStart }: { onStart: (character: string, seed?: number) => void }) {
  const { t } = useTranslation();
  const [seedInput, setSeedInput] = useState("");
  const [difficulty, setDifficulty] = useState(loadDifficulty());

  function start(id: string) {
    const n = parseInt(seedInput.trim(), 10);
    onStart(id, Number.isFinite(n) ? n : undefined);
  }

  return (
    <div className="char-select">
      <header className="topbar">
        <img className="app-logo" src={logoUrl} alt={t("app.title")} />
        <SoundToggle />
        <LanguageSwitcher />
      </header>

      <h2>{t("select.title")}</h2>

      <div className="difficulty-line">
        🔥 {t("select.difficulty", { n: difficulty })}
        {difficulty > 0 && (
          <button
            className="difficulty-reset"
            onClick={() => {
              saveDifficulty(0);
              setDifficulty(0);
            }}
          >
            {t("select.resetDifficulty")}
          </button>
        )}
      </div>

      <div className="char-cards">
        {ALL_CHARACTER_IDS.map((id) => {
          const c = getCharacter(id)!;
          return (
            <button key={id} className="char-card" onClick={() => start(id)}>
              <img className="char-portrait" src={characterImage(id) ?? playerUrl} alt="" />
              <div className="char-name">{t(`character.${id}.name`)}</div>
              <div className="char-desc">{t(`character.${id}.desc`)}</div>
              <div className="char-stats">
                <span>❤ {c.maxHp}</span>
                <span>🎴 {c.deck.length}</span>
                <span title={t(`relic.${c.relics[0]}.description`)}>🏅 {t(`relic.${c.relics[0]}.name`)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <label className="seed-control">
        <span>{t("seed.placeholder")}</span>
        <input
          className="seed-input"
          inputMode="numeric"
          placeholder={t("seed.placeholder")}
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
        />
      </label>
      <p className="char-hint">{t("select.hint")}</p>
    </div>
  );
}
