import { EVENT_DEFS, type RunState } from "../run";
import { useTranslation } from "../i18n";

/** A "?" event: a title, flavor body, and a list of choices. */
export function EventView({ run, onChoose }: { run: RunState; onChoose: (index: number) => void }) {
  const { t } = useTranslation();
  const id = run.event!.id;
  const def = EVENT_DEFS[id];

  return (
    <div className="event">
      <h2>{t(`event.${id}.title`)}</h2>
      <p className="event-body">{t(`event.${id}.body`)}</p>
      <div className="event-choices">
        {def.choices.map((_, i) => (
          <button key={i} className="event-choice" onClick={() => onChoose(i)}>
            {t(`event.${id}.choices.${i}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
