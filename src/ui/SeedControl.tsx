import { useState } from "react";
import { useTranslation } from "../i18n";

/** Shows the current run's seed (copyable) and starts a new run from a seed. */
export function SeedControl({ seed, onStart }: { seed: number; onStart: (seed: number) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(String(seed)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      });
    }
  }

  function start() {
    const n = parseInt(input.trim(), 10);
    if (Number.isFinite(n)) onStart(n);
  }

  return (
    <div className="seed-control">
      <button className="seed-current" onClick={copy} title={t("seed.copy")}>
        🎲 {seed}{copied ? ` ✓` : ""}
      </button>
      <input
        className="seed-input"
        inputMode="numeric"
        placeholder={t("seed.placeholder")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && start()}
      />
      <button className="seed-start" disabled={!input.trim()} onClick={start}>
        {t("seed.start")}
      </button>
    </div>
  );
}
