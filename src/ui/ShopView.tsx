import { useState } from "react";
import { getCardDef } from "../engine";
import type { RunState } from "../run";
import { useTranslation } from "../i18n";
import { CardFace } from "./CardFace";
import { potionImage, relicImage } from "./assetImages";

/** Shop: spend gold on cards, a relic, or a one-time card-removal service. */
export function ShopView({
  run,
  onBuyCard,
  onBuyRelic,
  onBuyPotion,
  onRemoveCard,
  onLeave,
}: {
  run: RunState;
  onBuyCard: (index: number) => void;
  onBuyRelic: (index: number) => void;
  onBuyPotion: (index: number) => void;
  onRemoveCard: (cardIndex: number) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const shop = run.shop!;
  const gold = run.player.gold;

  if (removing) {
    return (
      <div className="shop">
        <h2>{t("shop.removePrompt")}</h2>
        <div className="hand">
          {run.player.deck.map((defId, index) => {
            const def = getCardDef(defId);
            return (
              <button
                key={index}
                className={`card card-${def.type}`}
                onClick={() => {
                  onRemoveCard(index);
                  setRemoving(false);
                }}
              >
                <CardFace defId={def.id} />
              </button>
            );
          })}
        </div>
        <button className="skip" onClick={() => setRemoving(false)}>
          {t("rest.cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="shop">
      <h2>{t("shop.title")}</h2>
      <div className="shop-gold">💰 {gold}</div>

      <h3>{t("shop.cards")}</h3>
      <div className="hand">
        {shop.cards.map((c, index) => {
          const def = getCardDef(c.id);
          const canBuy = !c.sold && gold >= c.price;
          return (
            <button
              key={index}
              className={`card card-${def.type} ${c.sold ? "sold" : ""}`}
              disabled={!canBuy}
              onClick={() => onBuyCard(index)}
            >
              <CardFace defId={def.id} />
              <div className="price">{c.sold ? t("shop.sold") : `💰 ${c.price}`}</div>
            </button>
          );
        })}
      </div>

      {shop.relics.length > 0 && (
        <>
          <h3>{t("shop.relics")}</h3>
          <div className="shop-relics">
            {shop.relics.map((r, index) => {
              const canBuy = !r.sold && gold >= r.price;
              return (
                <button
                  key={index}
                  className={`relic-buy ${r.sold ? "sold" : ""}`}
                  disabled={!canBuy}
                  onClick={() => onBuyRelic(index)}
                  title={t(`relic.${r.id}.description`)}
                >
                  {relicImage(r.id) ? <img className="relic-icon" src={relicImage(r.id)} alt="" /> : null}
                  {t(`relic.${r.id}.name`)} — {r.sold ? t("shop.sold") : `💰 ${r.price}`}
                </button>
              );
            })}
          </div>
        </>
      )}

      {shop.potions.length > 0 && (
        <>
          <h3>{t("shop.potions")}</h3>
          <div className="shop-relics">
            {shop.potions.map((p, index) => {
              const full = run.player.potions.length >= 3;
              const canBuy = !p.sold && gold >= p.price && !full;
              return (
                <button
                  key={index}
                  className={`relic-buy ${p.sold ? "sold" : ""}`}
                  disabled={!canBuy}
                  onClick={() => onBuyPotion(index)}
                  title={t(`potion.${p.id}.description`)}
                >
                  {potionImage(p.id) ? <img className="potion-icon" src={potionImage(p.id)} alt="" /> : "🧪"}{" "}
                  {t(`potion.${p.id}.name`)} — {p.sold ? t("shop.sold") : `💰 ${p.price}`}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="shop-actions">
        <button
          disabled={shop.removeUsed || gold < shop.removePrice || run.player.deck.length <= 1}
          onClick={() => setRemoving(true)}
        >
          🗑 {t("shop.remove")} — {shop.removeUsed ? t("shop.sold") : `💰 ${shop.removePrice}`}
        </button>
        <button className="shop-leave" onClick={onLeave}>
          {t("shop.leave")}
        </button>
      </div>
    </div>
  );
}
