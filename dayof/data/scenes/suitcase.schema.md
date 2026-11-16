# data/scenes/suitcase.json — painted-scene mode for step 11 (OFF while the file does not exist)

js/pages/suitcase.js always renders the shipped mode first (scattered hand-drawn SVG props + SVG suitcase on a
watercolor-paper room). It then fetches `data/scenes/suitcase.json`; only if that file exists, validates, and its `bg`
image loads, the page swaps to the painted-scene mode. Delete/rename the file to switch back. No code change needed.
(Tests only: `?suitcaseCfg=<relative/path.json>` loads another config, same-origin relative paths only.)

```json
{
  "enabled": true,                                       // false (or no file) → shipped SVG room
  "bg":      "assets/scenes/s11-suitcase.jpg",          // required. scene WITH the 10 props painted in (any size; 864×1152 recommended)
  "empty":   "assets/scenes/s11-suitcase-empty.jpg",    // optional. SAME size/framing, props painted out (revealed where a prop is lifted)
  "closed":  "assets/scenes/s11-suitcase-closed.jpg",   // optional. SAME size/framing, suitcase painted CLOSED (cross-faded inside the zone on close)
  "cutouts": { "guitar": "assets/suitcase/guitar-cut.png" }, // optional. transparent PNG of a prop cut from bg (used for the lifted/packed copy)
  "items": {                                             // required. [x0, y0, x1, y1] as fractions (0–1) of the bg image, tight box around each prop
    "switch": [0.25, 0.19, 0.36, 0.25], "headphones": [...], "book": [...], "monstera": [...], "guitar": [...],
    "chips": [...], "football": [...], "familyphoto": [...], "cigarettes": [...], "dress": [...]
  },
  "suitcase": [0.50, 0.79, 0.78, 0.92],                  // required. drop / tap zone (fractions), the OPEN case's body
  "lid": [0.10, 0.61, 0.37, 0.77]                        // optional. the painted open lid: also a drop/tap zone; softened (blurred) when the SVG lid closes
}
```

- Item ids: switch, headphones, book, monstera, guitar, chips, football, photoframe (alias **familyphoto**), cigarettes, dress.
  Unknown keys are ignored; an item that is missing simply isn't offered. `state.suitcase.packed` always uses internal ids.
- Rendering: WIDTH-FIT — the plate is as wide as the screen (whole image visible, props may touch the image edges),
  vertically centred between the header (136 px) and a 56 px bottom strip; if the screen is too short the plate fits the
  height instead. The bands around it show a blurred copy of the empty plate. 「帶了 N 樣東西」/繼續看看 float at ~13% of the
  plate height (keep that wall area calm).
- Touches: a touch inside one or more prop boxes picks the SMALLEST box containing it; otherwise the nearest prop centre
  among boxes padded to ≥48 px; otherwise the suitcase/lid zone gets it (tap = close). Overlapping boxes are fine.
- `cutouts`: transparent PNG with exactly the pixel box of the item's hitbox (placed exactly over it); without it the lifted
  copy is a feathered crop of bg.
- Drag: a copy of the prop (cutout PNG if given, else a softly feathered crop of bg) follows the finger; with `empty` the
  painted prop disappears from the scene. Drop in the zone (±12 px) → it shrinks into a 5×2 grid in the zone; drag it out
  again to put it back. Tap the zone → close: `closed` art cross-fade if given, else the SVG hinged lid is drawn over the
  zone (lid art body mapped to the zone box). Then hint 「行李箱關好了，準備出發！」, 「帶了 N 樣東西」, 繼續看看.
- Touch hardening is the same as the shipped mode (touch-action:none, non-passive touchmove preventDefault, pointer
  capture, stale-drag abort, no callout/drag-image/context menu).
