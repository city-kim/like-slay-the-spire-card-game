import { getCardDef } from "../engine";
import type { RewardState } from "../run";
import { useTranslation } from "../i18n";
import { CardFace } from "./CardFace";

/** Post-combat reward: gold is already banked; claim the potion (optional),
 *  then pick one card or skip. */
export function RewardView({
  reward,
  potionsFull,
  onChoose,
  onTakePotion,
}: {
  reward: RewardState;
  potionsFull: boolean;
  onChoose: (cardId: string | null) => void;
  onTakePotion: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="reward">
      <h2>{t("reward.title")}</h2>
      <div className="reward-gold">{t("reward.gold", { gold: reward.gold })}</div>
      {reward.potion && (
        <button className="reward-potion" disabled={potionsFull} onClick={onTakePotion}>
          🧪 {t("reward.takePotion", { potion: { tkey: `potion.${reward.potion}.name` } })}
          {potionsFull ? ` (${t("reward.potionFull")})` : ""}
        </button>
      )}
      <p>{t("reward.pickCard")}</p>

      <div className="hand reward-cards">
        {reward.cards.map((cardId) => (
          <button key={cardId} className={`card card-${getCardDef(cardId).type}`} onClick={() => onChoose(cardId)}>
            <CardFace defId={cardId} />
          </button>
        ))}
      </div>

      <button className="skip" onClick={() => onChoose(null)}>
        {t("reward.skip")}
      </button>
    </div>
  );
}
