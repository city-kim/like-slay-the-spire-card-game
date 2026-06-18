import { useState } from "react";
import { getCardDef, upgradedId } from "../engine";
import type { RunState } from "../run";
import { useTranslation } from "../i18n";
import { CardFace } from "./CardFace";

/** Rest site: heal a chunk of HP, or upgrade one card in the deck. */
export function RestView({
  run,
  onHeal,
  onUpgrade,
}: {
  run: RunState;
  onHeal: () => void;
  onUpgrade: (cardIndex: number) => void;
}) {
  const { t } = useTranslation();
  const [upgrading, setUpgrading] = useState(false);

  const healAmount = Math.floor(run.player.maxHp * 0.3);
  // Deck entries that have an upgraded version, paired with their deck index.
  const upgradeable = run.player.deck
    .map((defId, index) => ({ defId, index }))
    .filter(({ defId }) => upgradedId(defId));

  return (
    <div className="rest">
      <h2>{t("rest.title")}</h2>

      {!upgrading ? (
        <div className="rest-choices">
          <button className="rest-choice" onClick={onHeal}>
            🔥 {t("rest.heal", { hp: healAmount })}
          </button>
          <button
            className="rest-choice"
            disabled={upgradeable.length === 0}
            onClick={() => setUpgrading(true)}
          >
            🔨 {t("rest.upgrade")}
          </button>
        </div>
      ) : (
        <div className="rest-upgrade">
          <p>{t("rest.upgradePrompt")}</p>
          <div className="hand">
            {upgradeable.map(({ defId, index }) => {
              const def = getCardDef(defId);
              return (
                <button key={index} className={`card card-${def.type}`} onClick={() => onUpgrade(index)}>
                  <CardFace defId={def.id} />
                </button>
              );
            })}
          </div>
          <button className="skip" onClick={() => setUpgrading(false)}>
            {t("rest.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
