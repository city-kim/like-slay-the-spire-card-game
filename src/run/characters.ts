import type { RelicId } from "../engine";

// Playable characters. Cards are shared (colorless), so characters differ by
// their starting deck, max HP, and starting relic. Display text is in i18n
// (character.<id>.name / .desc).
export interface CharacterDef {
  id: string;
  maxHp: number;
  deck: string[];
  relics: RelicId[];
}

export const CHARACTERS: Record<string, CharacterDef> = {
  warrior: {
    id: "warrior",
    maxHp: 80,
    deck: [...Array(5).fill("strike"), ...Array(4).fill("defend"), "bash"],
    relics: ["vajra"], // +1 Strength at combat start
  },
  rogue: {
    id: "rogue",
    maxHp: 68,
    deck: [...Array(5).fill("strike"), ...Array(4).fill("defend"), "poisonStab"],
    relics: ["shuriken"], // Strength every 3rd attack
  },
  mage: {
    id: "mage",
    maxHp: 72,
    deck: [...Array(4).fill("strike"), ...Array(4).fill("defend"), "thunderclap", "cleave"],
    relics: ["anchor"], // 10 Block at combat start
  },
};

export const ALL_CHARACTER_IDS = Object.keys(CHARACTERS);

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}
