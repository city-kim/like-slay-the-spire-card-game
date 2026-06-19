# Sound effects

Drop audio files here as `<name>.mp3` (or `.ogg` / `.wav`). They are bundled by
Vite and played automatically at the matching trigger point. Any missing file is
simply skipped (no error), so you can add a subset.

| name          | plays when                          |
| ------------- | ----------------------------------- |
| `cardPlay`    | a card is played                    |
| `attack`      | an enemy takes damage               |
| `hurt`        | the player takes damage             |
| `heal`        | the player heals                    |
| `victory`     | a run is cleared                    |
| `defeat`      | the player dies                     |

Example: `src/assets/sfx/cardPlay.mp3`

Mute is handled by the 🔊 toggle in the top bar (persisted to localStorage).
