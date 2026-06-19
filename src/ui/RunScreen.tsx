import { useCallback, useEffect } from "react";
import { type GameAction } from "../engine";
import { useTranslation } from "../i18n";
import { playSound } from "./sound";
import { SoundToggle } from "./SoundToggle";
import { characterImage, relicImage } from "./assetImages";
import logoUrl from "../assets/ui/logo.png";
import playerUrl from "../assets/ui/player.png";
import { useRun } from "./useRun";
import { CharacterSelect } from "./CharacterSelect";
import { CombatView } from "./CombatView";
import { MapView } from "./MapView";
import { RewardView } from "./RewardView";
import { RestView } from "./RestView";
import { ShopView } from "./ShopView";
import { EventView } from "./EventView";
import { PotionBar } from "./PotionBar";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function RunScreen() {
  const { t } = useTranslation();
  const { state, dispatch, start, restart } = useRun();

  // Stable identity so CombatView's enemy-phase auto-advance effect is reliable.
  const onCombatAction = useCallback(
    (action: GameAction) => dispatch({ type: "combat", action }),
    [dispatch],
  );

  // Victory / defeat stings.
  const phase = state?.phase;
  useEffect(() => {
    if (phase === "victory") playSound("victory");
    else if (phase === "gameOver") playSound("defeat");
  }, [phase]);

  // No active run → character select.
  if (!state) return <CharacterSelect onStart={start} />;

  const { player } = state;

  return (
    <div className="run">
      <header className="topbar">
        <img className="app-logo" src={logoUrl} alt={t("app.title")} />
        <div className="run-stats">
          <span>❤ {player.hp}/{player.maxHp}</span>
          <span>💰 {player.gold}</span>
          <span>🎴 {player.deck.length}</span>
          <span title={t("select.difficulty", { n: state.difficulty })}>🔥 {state.difficulty}</span>
          <span>🎲 {state.seed}</span>
        </div>
        <SoundToggle />
        <LanguageSwitcher />
        <button onClick={() => restart()}>{t("run.restart")}</button>
      </header>

      <div className="run-belts">
        {player.relics.length > 0 && (
          <section className="relics" aria-label={t("ui.relics")}>
            {player.relics.map((id) => {
              const art = relicImage(id);
              return (
                <span key={id} className="relic" title={`${t(`relic.${id}.name`)} — ${t(`relic.${id}.description`)}`}>
                  {art ? <img className="relic-icon" src={art} alt="" /> : null}
                  {t(`relic.${id}.name`)}
                </span>
              );
            })}
          </section>
        )}
        <PotionBar
          potions={player.potions}
          canUse={state.phase === "combat" && state.combat?.phase === "player"}
          onUse={(slot) => dispatch({ type: "usePotion", slot })}
        />
      </div>

      {state.phase === "map" && (
        <MapView run={state} onSelect={(nodeId) => dispatch({ type: "selectNode", nodeId })} />
      )}

      {state.phase === "combat" && state.combat && (
        <CombatView
          state={state.combat}
          onAction={onCombatAction}
          portraitUrl={(state.character && characterImage(state.character)) || playerUrl}
        />
      )}

      {state.phase === "reward" && state.reward && (
        <RewardView
          reward={state.reward}
          potionsFull={player.potions.length >= 3}
          onChoose={(cardId) => dispatch({ type: "chooseReward", cardId })}
          onTakePotion={() => dispatch({ type: "takeRewardPotion" })}
        />
      )}

      {state.phase === "rest" && (
        <RestView
          run={state}
          onHeal={() => dispatch({ type: "restHeal" })}
          onUpgrade={(cardIndex) => dispatch({ type: "restUpgrade", cardIndex })}
        />
      )}

      {state.phase === "event" && state.event && (
        <EventView run={state} onChoose={(index) => dispatch({ type: "chooseEventOption", index })} />
      )}

      {state.phase === "shop" && state.shop && (
        <ShopView
          run={state}
          onBuyCard={(index) => dispatch({ type: "buyShopCard", index })}
          onBuyRelic={(index) => dispatch({ type: "buyShopRelic", index })}
          onBuyPotion={(index) => dispatch({ type: "buyShopPotion", index })}
          onRemoveCard={(cardIndex) => dispatch({ type: "removeCard", cardIndex })}
          onLeave={() => dispatch({ type: "leaveShop" })}
        />
      )}

      {state.phase === "victory" && (
        <div className="banner won">
          {t("run.cleared", { n: state.difficulty })}
          <div className="banner-actions">
            {/* Endless: next run escalates difficulty. */}
            <button onClick={() => restart(state.difficulty + 1)}>
              {t("run.nextDifficulty", { n: state.difficulty + 1 })}
            </button>
            <button onClick={() => restart(0)}>{t("run.fromStart")}</button>
          </div>
        </div>
      )}

      {state.phase === "gameOver" && (
        <div className="banner lost">
          {t("run.gameOver")}
          <div className="banner-actions">
            {/* Retry the same difficulty, or reset to 0. */}
            <button onClick={() => restart(state.difficulty)}>{t("run.retry", { n: state.difficulty })}</button>
            <button onClick={() => restart(0)}>{t("run.fromStart")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
