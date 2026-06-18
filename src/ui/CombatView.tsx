import { useEffect, useState } from "react";
import { getCardDef, type CardDef, type GameAction, type GameState, type Statuses } from "../engine";
import { useTranslation } from "../i18n";
import { CardFace } from "./CardFace";
import { enemyImage } from "./enemyImages";
import playerUrl from "../assets/ui/player.png";

type TFn = ReturnType<typeof useTranslation>["t"];

/** Single-target attacks require the player to pick an enemy first. */
function needsTarget(def: CardDef): boolean {
  return def.target === "enemy" && !def.aoe;
}

function StatusPips({ statuses, t }: { statuses: Statuses; t: TFn }) {
  const entries = Object.entries(statuses).filter(([, v]) => v && v !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="statuses">
      {entries.map(([k, v]) => (
        <span key={k} className={`status status-${k}`} title={t(`status.${k}`)}>
          {t(`status.${k}`)} {v}
        </span>
      ))}
    </div>
  );
}

function HealthBar({ hp, maxHp, block }: { hp: number; maxHp: number; block: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className="hpbar">
      <div className="hpbar-fill" style={{ width: `${pct}%` }} />
      <span className="hpbar-text">
        {Math.max(0, hp)} / {maxHp}
        {block > 0 && <span className="block-badge">🛡 {block}</span>}
      </span>
    </div>
  );
}

function intentLabel(state: GameState, enemyIndex: number, t: TFn): string {
  const move = state.enemies[enemyIndex].nextMove;
  switch (move.intent) {
    case "attack":
      return t("intent.attack", { dmg: move.displayDamage ?? "?" });
    case "defend":
      return t("intent.defend");
    case "buff":
      return t("intent.buff");
    case "debuff":
      return t("intent.debuff");
  }
}

/** Presentational combat view: renders a GameState and emits GameActions.
 *  Combat lifecycle (win/lose transitions) is owned by the run layer. */
export function CombatView({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const { t } = useTranslation();
  const [targetingUid, setTargetingUid] = useState<string | null>(null);

  useEffect(() => {
    if (targetingUid && !state.hand.some((c) => c.uid === targetingUid)) {
      setTargetingUid(null);
    }
  }, [state.hand, targetingUid]);

  const isPlayerTurn = state.phase === "player";
  const isTargeting = targetingUid !== null;

  function onCardClick(uid: string) {
    const card = state.hand.find((c) => c.uid === uid);
    if (!card || !isPlayerTurn) return;
    const def = getCardDef(card.defId);
    if (state.player.energy < def.cost) return;

    if (targetingUid === uid) {
      setTargetingUid(null);
      return;
    }
    if (needsTarget(def)) {
      setTargetingUid(uid);
      return;
    }
    onAction({ type: "playCard", uid });
    setTargetingUid(null);
  }

  function onEnemyClick(index: number) {
    if (!isTargeting || state.enemies[index].hp <= 0) return;
    onAction({ type: "playCard", uid: targetingUid!, targetIndex: index });
    setTargetingUid(null);
  }

  return (
    <div className="combat">
      <div className="combat-turn">{t("ui.turn", { turn: state.turn + 1 })}</div>

      {isTargeting && <div className="targeting-hint">{t("ui.chooseTarget")}</div>}

      <section className="enemies">
        {state.enemies.map((enemy, i) => {
          const alive = enemy.hp > 0;
          const targetable = isTargeting && alive;
          const art = enemyImage(enemy.defId);
          return (
            <div
              // Keying by hp remounts on damage so the hit animation replays.
              key={`${i}-${enemy.hp}`}
              className={`enemy ${alive ? "" : "dead"} ${targetable ? "targetable" : ""}`}
              style={art ? { backgroundImage: `url(${art})` } : undefined}
              onClick={() => onEnemyClick(i)}
              role={targetable ? "button" : undefined}
            >
              <div className="enemy-name">{t(`enemy.${enemy.defId}.name`)}</div>
              <div className="intent">{alive ? intentLabel(state, i, t) : t("intent.dead")}</div>
              <HealthBar hp={enemy.hp} maxHp={enemy.maxHp} block={enemy.block} />
              <StatusPips statuses={enemy.statuses} t={t} />
            </div>
          );
        })}
      </section>

      <section className="player-area">
        <div className="player">
          <img className="player-portrait" src={playerUrl} alt={t("ui.you")} />
          <div className="player-name">{t("ui.you")}</div>
          <HealthBar hp={state.player.hp} maxHp={state.player.maxHp} block={state.player.block} />
          <StatusPips statuses={state.player.statuses} t={t} />
          <div className="energy">
            ⚡ {t("ui.energy")} {state.player.energy} / {state.player.maxEnergy}
          </div>
        </div>

        <button className="end-turn" disabled={!isPlayerTurn} onClick={() => onAction({ type: "endTurn" })}>
          {t("ui.endTurn")}
        </button>
      </section>

      <section className="hand">
        {state.hand.map((card) => {
          const def = getCardDef(card.defId);
          const affordable = state.player.energy >= def.cost && isPlayerTurn;
          return (
            <button
              key={card.uid}
              className={`card card-${def.type} ${targetingUid === card.uid ? "selected" : ""}`}
              disabled={!affordable}
              onClick={() => onCardClick(card.uid)}
            >
              <CardFace defId={def.id} />
            </button>
          );
        })}
      </section>

      <section className="piles">
        <span>{t("ui.draw")}: {state.drawPile.length}</span>
        <span>{t("ui.discard")}: {state.discardPile.length}</span>
        <span>{t("ui.exhaust")}: {state.exhaustPile.length}</span>
      </section>

      <details className="log">
        <summary>{t("ui.combatLog")}</summary>
        <ul>
          {state.log.slice(-12).map((entry, i) => (
            <li key={i}>{t(entry.key, entry.params)}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
