# Image Asset Prompt Pack

Ready-to-use prompts for image-generation AI (Midjourney, DALL-E, Flux, SDXL) to fill the game's
existing — mostly empty — image pipeline. Every prompt matches the established art style of the
five existing event illustrations in `client/public/images/events/`.

## 1. Current state of the pipeline

| Slot | Expected path | Format | Exists today |
|---|---|---|---|
| Event illustrations | `client/public/images/events/<event_id>.webp` | 800×800 webp | 5 of ~325 events (story week 1–2 only) |
| NPC portraits | `client/public/assets/images/portraits/<npcId>.png` and `<npcId>-<emotion>.png` | png, square | **none** — ASCII-art fallback renders instead |
| Scene backgrounds | `client/public/assets/images/scenes/<sceneId>.png` | png, wide | **none** — ASCII-art fallback |
| Title/splash | `client/public/warm_start.png` | png | exists |

Notes:
- `Portrait.tsx:122` and `SceneBackground.tsx:73` expect `/assets/images/...` — the
  `client/public/assets/` directory doesn't exist yet; create it, Vite serves `public/` at the web root.
- Missing emotion variants are harmless: `Portrait.tsx` falls back to the base `<npcId>.png`,
  so **base portraits first, emotions later**.
- Portraits render as small as 48px (`w-12`) — they need strong silhouettes and tight framing.
- `SceneBackground` draws behind content with an `opacity` prop — scenes must be dark and
  low-contrast so foreground text stays readable.

## 2. Style anchor — prepend to EVERY prompt

The established look (see `evt_erster_arbeitstag.webp`): dark noir editorial vector illustration,
German municipal-office thriller with dry humor.

```
Dark noir editorial vector illustration, flat shapes with hard-edged shadows,
near-monochrome palette of black and desaturated slate, single phosphor-green
accent glow from computer screens and LEDs, pale warm light spilling through
doorways and window blinds, rain streaking the windows outside, German municipal
utility office in the 2020s, tense thriller mood with deadpan mundane details,
clean bold linework, high contrast, no text, no lettering, no watermark
```

Suggested negative prompt (SDXL/Flux): `photo, photorealistic, 3d render, text, letters, watermark, logo, blurry, low contrast, bright daylight, saturated colors`

Consistency workflow:
1. Generate the base neutral portrait of each NPC first; iterate until happy.
2. Reuse it as a character reference for every variant (Midjourney `--cref <url>`,
   Flux/DALL-E image reference, or fixed seed + same prompt with only the emotion line changed).
3. Batch by category (all portraits, then all scenes) so the model stays in one style groove.
4. Generate at 1024×1024, then convert: `cwebp -q 82 -resize 800 800 in.png -o out.webp`
   (events) or downscale to png (portraits/scenes). Keep files under ~150 KB.

## 3. NPC portraits (10 base portraits)

Framing line to append to each: `head-and-shoulders portrait, centered, facing slightly
off-camera, dark background with a thin phosphor-green rim light, square composition
with generous margin, readable at small size`

Character briefs follow game canon — adjust looks to taste, but keep the personality reads.

| npcId | Prompt core |
|---|---|
| `chef` | Bert, the IT-affine head of the waterworks: man in his mid-50s, short grey beard, calm competent expression, quality knit sweater over a collared shirt, reading glasses pushed up on his head, the reassuring air of someone who has survived twenty audits |
| `gf` | The Geschäftsführerin of the Stadtwerke: woman around 50, sharp tailored blazer, controlled neutral expression with a hint of impatience, standing in front of a dark glass office wall |
| `kaemmerer` | The municipal Kämmerer (treasurer): gaunt man in his 60s, thin metal glasses, pursed lips, slightly-too-old grey suit, clutching a folder of budget printouts like a shield |
| `fachabteilung` | Overwhelmed office worker from the Verwaltung: woman in her 40s, cardigan, lanyard with an ID badge, desperate hopeful expression of someone whose printer just died before a deadline |
| `kollegen` | Three IT colleagues crowded into one frame at the office coffee machine: two competent relaxed men in their 30s–40s (one with a mug, one mid-explanation) and one loud older man in a polo shirt laughing too hard at his own joke |
| `marco` | External service tech from AMSE IT: man around 35, company polo with a cable tester in the chest pocket, phone wedged against his shoulder, friendly but perpetually in a hurry |
| `stefan` | The vanished predecessor, seen only in an old staff-ID photo: man in his 40s, tired intelligent eyes, slight knowing smile, photographed against a plain wall — the portrait should feel like a photo pinned to a case board, slightly aged |
| `thomas` | Telekom business-support contact: man around 40, headset, corporate magenta lanyard, professional patient expression, cubicle wall behind him |
| `sabine` | Telekom field technician: woman in her 30s, work jacket, confident no-nonsense expression, coil of fiber cable over her shoulder |
| `kevin` | Cloud365 sales rep: man in his late 20s, too-crisp startup hoodie under a blazer, enthusiastic salesman grin, laptop covered in SaaS stickers |
| `martin` | Cloud365 solutions engineer: man around 40, rumpled shirt, honest tired competence, the one who actually knows how the product works |

### Emotion variants (second pass, only as needed)

File name: `<npcId>-<emotion>.png`. Reuse the base prompt + character reference and swap in one line:

| emotion | modifier line |
|---|---|
| `happy` / `pleased` / `satisfied` | warm relieved smile, shoulders relaxed |
| `angry` / `rejecting` | jaw set, brows drawn, arms crossed |
| `stressed` / `overwhelmed` | wide eyes, hand in hair, loosened collar |
| `concerned` / `suspicious` | narrowed eyes, head tilted, guarded posture |
| `disappointed` | flat stare, slow exhale, papers lowered |
| `impressed` / `approving` | raised eyebrows, slow appreciative nod |
| `grateful` / `relieved` | hand on chest, easing smile |
| `confused` | squint, mouth half-open, screen glow on face |
| `impatient` | tapping watch, sidelong glance |
| `celebrating` | fist raised, genuine grin |
| `selling` (kevin) | over-wide grin, both hands presenting an invisible product |
| `schmoozing` (kevin) | leaning in confidentially, conspiratorial smile |
| `caught` / `defensive` / `apologizing` | frozen mid-gesture, palms half-raised |
| `copying` (pack-specific) | glancing sideways at a USB stick in hand |
| `gossiping` (kollegen) | heads together over coffee, one hand shielding mouth |
| `supportive` (chef) | steady eye contact, reassuring half-smile, hand slightly raised |

Priority order (what the game actually shows most): `chef` and `kollegen` first (relationship
bar + most events), then the five pack NPCs (`marco`, `thomas`, `sabine`, `kevin`, `martin` —
shown in `ScenarioCard`), then `stefan` (story payoff), then the rest.

## 4. Scene backgrounds (6)

Framing line to append: `wide establishing shot, empty of people, very dark overall exposure,
low contrast, details dissolving into shadow at the edges, 16:9 composition` — these sit
BEHIND text at partial opacity; murky is correct.

| sceneId | Prompt core |
|---|---|
| `server-room` | Cramped municipal server room: two aging 19-inch racks with blinking green LEDs, cable spaghetti, a wall-mounted AC unit dripping into a bucket, KRITIS warning sticker on the door |
| `office` | Small-town IT office after hours: three desks with dual monitors glowing green, coffee mugs, a dying potted plant, municipal calendar on the wall, rain on the window |
| `meeting-room` | Municipal meeting room: long veneer table, overhead projector beam cutting through darkness, empty chairs, a flip chart with half-erased diagrams |
| `helpdesk` | Helpdesk counter: ticket monitor glowing, tangled phone cords, sticky notes framing a monitor, a queue-number display reading a two-digit number glow |
| `datacenter` | Professional colocation datacenter aisle: long row of tall racks, cold blue-green LED rivers, raised floor tiles, chilly haze |
| `vendor-office` | Slick vendor office lobby: glass, brushed steel, an oversized abstract logo sculpture, a too-clean demo screen glowing in the gloom |

## 5. Event illustrations (`/images/events/<event_id>.webp`, 800×800)

The five existing ones cover story week 1–2. Recipe for any event:

```
[STYLE ANCHOR] + one frozen moment of the event, camera at human eye level,
the player character seen from behind or in silhouette, the threat or absurdity
of the situation staged in the light sources, square composition
```

High-value candidates to author next (story campaign acts, endings, blackout arc):

| id / slot | Prompt core |
|---|---|
| Act 1 opener | A new employee badge and a sticky note with a scrawled password lying on a keyboard in a pool of green monitor light, dark empty office around it |
| Stefan's note (chapter payoff) | A hand holding a creased handwritten note up to a monitor's glow, dense shelves of binders looming in shadow behind |
| FENRIS reveal | A terminal window casting green light on a shocked face half out of frame, a wolf-like ASCII pattern hinted on the screen (no readable text) |
| Act 2 escalation | Two figures in a stairwell exchanging a USB stick, lit only by an emergency-exit sign's pale glow |
| Act 3 decision | A figure standing between two lit doorways in a dark corridor — one warm office light, one cold server-room green |
| Ending: good | Sunrise through the office blinds for once, the admin leaning back with coffee, monitors calm and green, rain finally stopped |
| Ending: neutral | The admin locking the office door at night, corridor half dark, one monitor still glowing behind the glass |
| Ending: bad | An empty desk, unplugged monitor, a cardboard box of belongings, one last green LED blinking in the dark |
| Blackout arc | A control-room wall of screens going dark one by one, a single emergency lamp throwing an orange cone, silhouetted operator rising from a chair |
| Phishing event | A monitor showing an obviously-too-good email glowing in a dark office, a hovering hand frozen above the mouse |
| Ransomware/crypto-miner | A server rack with every LED red-shifted while a lone fan spins in a smear of motion, tools abandoned on the floor |
| Audit day | A conference table stacked with binders under a projector beam, an auditor's silhouette with a raised pen, IT staff sweating in the shadows |

Convert each: `cwebp -q 82 -resize 800 800 raw.png -o client/public/images/events/<event_id>.webp`
and set the event's `image: '/images/events/<event_id>.webp'` field in the content file.

## 6. Title / marketing

| Use | Prompt core |
|---|---|
| Splash update (`warm_start.png`) | A lone IT admin silhouetted before a wall of green terminals inside a water-tower control room, giant pipes and pressure gauges fading into darkness above, one warm desk lamp — poster composition with empty space at the top for a title |
| Store/README hero | Bird's-eye view of a small German waterworks at night in the rain, one office window glowing green among dark buildings, power lines converging on it |
