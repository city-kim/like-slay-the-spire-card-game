import { getCardDef } from "../engine";
import { useTranslation } from "../i18n";
import { CardTags } from "./CardTags";
import { cardImage } from "./cardImages";

/** The inner contents of a card (cost, art, name, description, tags). Shared by
 *  combat, reward, shop and rest screens — wrap it in a <button class="card">. */
export function CardFace({ defId }: { defId: string }) {
  const { t } = useTranslation();
  const def = getCardDef(defId);
  const art = cardImage(defId);
  return (
    <>
      <div className="card-cost">{def.cost === "x" ? "X" : def.cost}</div>
      {art ? (
        <img className="card-art" src={art} alt="" loading="lazy" />
      ) : (
        <div className="card-art card-art-placeholder" />
      )}
      <div className="card-name">{t(`card.${def.id}.name`)}</div>
      <div className="card-desc">{t(`card.${def.id}.description`)}</div>
      <CardTags defId={def.id} />
    </>
  );
}
