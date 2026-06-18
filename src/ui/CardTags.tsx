import { getCardDef, rarityOf, type CardDef } from "../engine";
import { useTranslation } from "../i18n";

const KEYWORDS = ["innate", "retain", "ethereal", "exhaust"] as const satisfies readonly (keyof CardDef)[];

/** Renders a card's rarity pip and keyword tags. */
export function CardTags({ defId }: { defId: string }) {
  const { t } = useTranslation();
  const def = getCardDef(defId);
  const tags = KEYWORDS.filter((k) => def[k]);
  const rarity = rarityOf(defId);
  return (
    <div className="card-tags">
      <span className={`card-rarity rarity-${rarity}`} title={t(`rarity.${rarity}`)} />
      {tags.map((k) => (
        <span key={k} className={`card-tag tag-${k}`}>
          {t(`keyword.${k}`)}
        </span>
      ))}
    </div>
  );
}
