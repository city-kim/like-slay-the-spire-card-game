import { useEffect, useRef, useState } from "react";
import { getCardDef, isPlayable, type CardDef, type GameAction, type GameState, type Statuses } from "../engine";
import { useTranslation } from "../i18n";
import { CardFace } from "./CardFace";
import { enemyImage } from "./enemyImages";
import { useHpPopups, type HpPopup } from "./useHpPopups";
import { playSound } from "./sound";

/** Floating damage/heal numbers for a combatant. */
function HpPopups({ popups }: { popups: HpPopup[] }) {
  if (popups.length === 0) return null;
  return (
    <>
      {popups.map((p) => (
        <span key={p.key} className={`dmg-pop ${p.kind}`}>
          {p.kind === "heal" ? "+" : "-"}
          {p.amount}
        </span>
      ))}
    </>
  );
}

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
export function CombatView({
  state,
  onAction,
  portraitUrl,
}: {
  state: GameState;
  onAction: (action: GameAction) => void;
  portraitUrl: string;
}) {
  const { t } = useTranslation();
  const [targetingUid, setTargetingUid] = useState<string | null>(null);
  // The card mid-play-animation; its action fires after the animation. The ref
  // mirrors it for the keyboard handler (whose closure can be stale).
  const [playingUid, setPlayingUid] = useState<string | null>(null);
  const playingRef = useRef(false);
  const popups = useHpPopups(state);

  useEffect(() => {
    if (targetingUid && !state.hand.some((c) => c.uid === targetingUid)) {
      setTargetingUid(null);
    }
  }, [state.hand, targetingUid]);

  // During the enemy phase, advance one enemy at a time on a delay so attacks
  // play out sequentially (each with its own damage popup) instead of at once.
  useEffect(() => {
    if (state.phase !== "enemy") return;
    const timer = setTimeout(() => onAction({ type: "enemyAct" }), 650);
    return () => clearTimeout(timer);
  }, [state, onAction]);

  // Keyboard controls: 1–9 play that hand card (single-target attacks hit the
  // first living enemy), E/Enter ends the turn, Esc cancels targeting.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        setTargetingUid(null);
        return;
      }
      if (state.phase !== "player") return;
      if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        onAction({ type: "endTurn" });
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        const card = state.hand[n - 1];
        if (!card || playingRef.current) return;
        const def = getCardDef(card.defId);
        if (!isPlayable(def, state.player.energy)) return;
        const targetIndex =
          def.target === "enemy" && !def.aoe ? Math.max(0, state.enemies.findIndex((en) => en.hp > 0)) : undefined;
        commitPlay(card.uid, { type: "playCard", uid: card.uid, targetIndex });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onAction]);

  const isPlayerTurn = state.phase === "player";
  const isTargeting = targetingUid !== null;

  /** Animate the card leaving the hand, then dispatch the play action. */
  function commitPlay(uid: string, action: GameAction) {
    if (playingRef.current) return; // already animating a play
    playingRef.current = true;
    playSound("cardPlay");
    setTargetingUid(null);
    setPlayingUid(uid);
    setTimeout(() => {
      onAction(action);
      setPlayingUid(null);
      playingRef.current = false;
    }, 200);
  }

  function onCardClick(uid: string) {
    if (playingRef.current) return;
    const card = state.hand.find((c) => c.uid === uid);
    if (!card || !isPlayerTurn) return;
    const def = getCardDef(card.defId);
    if (!isPlayable(def, state.player.energy)) return;

    if (targetingUid === uid) {
      setTargetingUid(null);
      return;
    }
    if (needsTarget(def)) {
      setTargetingUid(uid);
      return;
    }
    commitPlay(uid, { type: "playCard", uid });
  }

  function onEnemyClick(index: number) {
    if (playingRef.current || !isTargeting || state.enemies[index].hp <= 0) return;
    commitPlay(targetingUid!, { type: "playCard", uid: targetingUid!, targetIndex: index });
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
            // Stable slot holds the floating numbers; the inner .enemy is keyed
            // by hp so its hit animation replays on each change.
            <div key={i} className="enemy-slot">
              <HpPopups popups={popups.filter((p) => p.target === i)} />
              <div
                key={enemy.hp}
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
            </div>
          );
        })}
      </section>

      <section className="player-area">
        <div className="player">
          <HpPopups popups={popups.filter((p) => p.target === "player")} />
          <img className="player-portrait" src={portraitUrl} alt={t("ui.you")} />
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
        {state.hand.map((card, i) => {
          const def = getCardDef(card.defId);
          const affordable = isPlayable(def, state.player.energy) && isPlayerTurn;
          return (
            <button
              key={card.uid}
              className={`card card-${def.type} ${targetingUid === card.uid ? "selected" : ""} ${playingUid === card.uid ? "playing" : ""}`}
              disabled={!affordable || playingUid === card.uid}
              onClick={() => onCardClick(card.uid)}
            >
              {i < 9 && <span className="card-key">{i + 1}</span>}
              <CardFace defId={def.id} />
            </button>
          );
        })}
      </section>
      <div className="key-hint">{t("ui.keyHint")}</div>

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
