# Kevin Otuteye — Strip by strip

Portfolio of Kevin Otuteye, senior software engineer. The art direction treats a career the way kente is made: woven one narrow strip at a time, then sewn edge to edge into one cloth. Each role is a strip, woven after a named kente design; the current role is still on the loom.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## How it fits together

| Piece | Where |
| --- | --- |
| Pattern book: strip drafts, motifs, compiled textures | `lib/kente.ts` |
| The loom: thread-level WebGL2 shader | `components/cloth/engine.ts` |
| React wrapper (lazy context, pointer light, adaptive resolution) | `components/cloth/Cloth.tsx` |
| Home: pinned scroll story from one strip to the whole cloth | `components/home/LoomStory.tsx` |
| Page transition: the cloth drops over the page | `components/Transition.tsx`, `lib/transition.ts` |
| Loom sounds, synthesised, off by default | `lib/sound.ts` |
| Design tokens (UI colours and thread dyes) | `Theme.js` |

### Content

All copy lives in `public/json/`:

- `experience.json`, `projects.json`, `about.json`, `case-studies.json`: roles, projects and case studies.
- `strips.json`: which kente design each role's strip is woven after, with its name and meaning. **Check names and meanings with someone who knows the cloth before changing them.**
- `weights.json`: the gold weights paired with each headline metric.

### Regenerating the map

`lib/map.json` is a bit grid of land built from Natural Earth's 1:110m land shapes:

```bash
curl -L -o /tmp/land.json https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
node scripts/make-map.mjs /tmp/land.json
```

## Credits

- **Gold weights (abrammuo)**: The Cleveland Museum of Art, open access, CC0. Accession numbers 1969.265, 1961.399, 1969.266, 1935.306 and 1962.244. Cut out of their studio backgrounds for this site; see `public/json/weights.json`.
- **Map**: [Natural Earth](https://www.naturalearthdata.com), public domain.
- **Type**: Instrument Serif and Instrument Sans (Instrument), JetBrains Mono (JetBrains), SIL Open Font License.
- **Kente**: the drafts are interpretations made for a screen, after named designs from the Asante and Ewe weaving traditions. They are not reproductions of specific cloths.
