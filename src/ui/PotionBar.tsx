import { getPotionDef, type PotionId } from "../engine";
import { useTranslation } from "../i18n";
import { potionImage } from "./assetImages";

const SLOTS = 3;

/** The potion belt. Slots are usable only during the player's combat turn. */
export function PotionBar({
  potions,
  canUse,
  onUse,
}: {
  potions: PotionId[];
  canUse: boolean;
  onUse: (slot: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="potions" aria-label={t("ui.potions")}>
      {Array.from({ length: SLOTS }, (_, i) => {
        const id = potions[i];
        if (!id) {
          return (
            <span key={i} className="potion-slot empty">
              {t("ui.emptySlot")}
            </span>
          );
        }
        const def = getPotionDef(id);
        const art = potionImage(def.id);
        return (
          <button
            key={i}
            className="potion-slot"
            disabled={!canUse}
            onClick={() => onUse(i)}
            title={`${t(`potion.${def.id}.name`)} — ${t(`potion.${def.id}.description`)}`}
          >
            {art ? <img className="potion-icon" src={art} alt="" /> : "🧪"} {t(`potion.${def.id}.name`)}
          </button>
        );
      })}
    </div>
  );
}
