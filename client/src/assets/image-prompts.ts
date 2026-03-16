/**
 * AI Image Generation Prompts for KRITIS Admin Simulator
 *
 * These prompts are designed for Midjourney, DALL-E 3, or Stable Diffusion.
 * Consistent style: Flat cartoon / graphic novel style with bold outlines,
 * inspired by Papers Please, Not Tonight, and Obra Dinn.
 *
 * Color palette should complement the terminal aesthetic:
 * - Primary: #00ff00 (terminal green)
 * - Background: #0a0a0a (near black)
 * - Accent: amber, cyan, magenta for highlights
 */

// =============================================================================
// STYLE PREFIXES (prepend to all prompts)
// =============================================================================

export const STYLE_PREFIX = {
  portrait: `Flat cartoon character portrait, bold black outlines, limited color palette, graphic novel style, professional game art, chest-up framing, solid color background, inspired by Papers Please and Obra Dinn. German municipal office setting.`,

  scene: `Flat cartoon background illustration, bold black outlines, limited color palette with green terminal glow accents, isometric or 3/4 view, atmospheric lighting, professional game art, no characters. German office/IT setting.`,

  icon: `Flat vector icon, bold outlines, single color with accent, minimalist design, game UI style, clean edges, suitable for dark background.`,

  document: `Scanned document mockup, German office style, slightly worn paper texture, realistic formatting, business letterhead or official form style.`,
};

// =============================================================================
// INTERNAL NPCs (Relationships)
// =============================================================================

export const NPC_PROMPTS = {
  // -------------------------------------------------------------------------
  // CHEF - IT-Leiter (Your direct boss)
  // -------------------------------------------------------------------------
  chef: {
    id: 'chef',
    name: 'Bert Bergmann',
    role: 'IT-Leiter',
    prompt: `${STYLE_PREFIX.portrait}

A German IT department head in his late 40s. Balding with grey temples, rectangular glasses, permanent frown lines. Wearing a slightly rumpled button-down shirt with sleeves rolled up, no tie. Has a coffee mug that says "World's Okayest Boss" (ironic gift). Looks perpetually tired but competent. Expression: skeptical but fair. His desk is visible with stacked papers and a Dilbert calendar.

Color accents: muted blue shirt, amber/orange highlights
Mood: professional exhaustion, cautious optimism`,

    emotions: {
      neutral: 'Skeptical but attentive expression, arms crossed',
      happy: 'Slight smile, nodding, relaxed shoulders',
      angry: 'Deep frown, pointing finger, red face',
      stressed: 'Rubbing temples, eyes closed, disheveled',
      disappointed: 'Head shake, looking down, sighing',
    },
  },

  // -------------------------------------------------------------------------
  // GF - Geschäftsführer (CEO of the waste management company)
  // -------------------------------------------------------------------------
  gf: {
    id: 'gf',
    name: 'Dr. Heinrich Krause',
    role: 'Geschäftsführer WARM',
    prompt: `${STYLE_PREFIX.portrait}

A German executive in his early 60s. Distinguished grey hair, expensive but conservative suit, subtle tie with municipal crest pin. Tall, imposing presence. Reading glasses on a chain around his neck. Has the air of someone who came up through the ranks - not born into management. Expression: authoritative but not unkind. Background hint of wood-paneled office.

Color accents: dark navy suit, gold/brass highlights, burgundy tie
Mood: controlled power, old-school professionalism`,

    emotions: {
      neutral: 'Attentive, hands clasped on desk',
      pleased: 'Slight smile, nodding approval',
      concerned: 'Furrowed brow, leaning forward',
      angry: 'Standing, hands on desk, stern gaze',
      impressed: 'Raised eyebrows, genuine smile',
    },
  },

  // -------------------------------------------------------------------------
  // KÄMMERER - Finance / Budget controller
  // -------------------------------------------------------------------------
  kaemmerer: {
    id: 'kaemmerer',
    name: 'Petra Hoffmann',
    role: 'Kämmerin',
    prompt: `${STYLE_PREFIX.portrait}

A German finance controller in her mid-50s. Sharp features, reading glasses perched on nose, silver hair in a practical short cut. Wearing a structured blazer over a simple blouse. Has a calculator and budget spreadsheets visible. Expression: scrutinizing, numbers-focused. The person who says "no" to every purchase request. But fair - if you justify it properly, she'll approve it.

Color accents: grey/silver tones, red for "over budget" elements
Mood: fiscal vigilance, reluctant approval`,

    emotions: {
      neutral: 'Peering over glasses, pen in hand',
      approving: 'Stamping document, slight nod',
      rejecting: 'Red pen crossing out numbers, head shake',
      suspicious: 'Squinting at screen, finger pointing at discrepancy',
      satisfied: 'Leaning back, document approved stamp visible',
    },
  },

  // -------------------------------------------------------------------------
  // FACHABTEILUNG - Department users / End users
  // -------------------------------------------------------------------------
  fachabteilung: {
    id: 'fachabteilung',
    name: 'Die Fachabteilung',
    role: 'Sachbearbeiter/innen',
    prompt: `${STYLE_PREFIX.portrait}

A composite/representative German office worker, could be male or female, age 30-50. Wearing business casual - cardigan, simple shirt. Surrounded by paper files, a municipal desk with forms and stamps. Has a "my printer doesn't work" expression. Represents the average end user who calls IT with problems. Not tech-savvy but means well. Background shows typical German Amt office.

Color accents: beige/tan office colors, green plant on desk
Mood: confused helpfulness, mild frustration`,

    emotions: {
      neutral: 'Hopeful expression, phone in hand',
      frustrated: 'Pointing at non-working screen, exasperated',
      grateful: 'Relieved smile, thumbs up',
      confused: 'Scratching head, looking at error message',
      impatient: 'Tapping watch, pile of work visible',
    },
  },

  // -------------------------------------------------------------------------
  // KOLLEGEN - IT colleagues
  // -------------------------------------------------------------------------
  kollegen: {
    id: 'kollegen',
    name: 'Das IT-Team',
    role: 'IT-Kollegen',
    prompt: `${STYLE_PREFIX.portrait}

Two German IT colleagues shown together, one male (early 30s, hoodie under blazer, energy drink on desk) and one female (late 20s, practical ponytail, multiple monitors). Both look competent but overworked. Shared office space with server rack visible in background. Expression: supportive camaraderie, shared suffering. They'll help you but they're also dealing with their own ticket queue.

Color accents: tech company colors (subtle blue, green terminal glow)
Mood: tired solidarity, dark humor`,

    emotions: {
      neutral: 'Working at desks, headphones half-on',
      supportive: 'One pointing at screen helping the other',
      overwhelmed: 'Both surrounded by sticky notes, help desk chaos',
      celebrating: 'High-fiving, ticket count at zero',
      gossiping: 'Whispering, looking toward door',
    },
  },

  // -------------------------------------------------------------------------
  // MARCO BÜHLER - AMSE IT Technician (external)
  // -------------------------------------------------------------------------
  marco: {
    id: 'marco',
    name: 'Marco Bühler',
    role: 'Techniker AMSE IT',
    prompt: `${STYLE_PREFIX.portrait}

A German IT technician in his mid-30s. Slightly overweight, wearing a too-tight company polo shirt with 'AMSE IT Solutions' logo embroidered. Bluetooth headset permanently in one ear - always talking to another customer. Multiple phones and a pager on his belt. Coffee-stained laptop visible. Looks harried and slightly defensive. His expression says "it's not my fault" before you even ask.

Color accents: AMSE company blue/orange, coffee stains brown
Mood: defensive competence, multitasking chaos`,

    emotions: {
      neutral: 'On phone with another customer, distracted',
      defensive: "Hands up, 'wasn't me' gesture",
      caught: 'Sweating, looking at logs, realizing mistake',
      relieved: 'Wiping brow, crisis averted',
      copying: 'Ctrl+C visible on screen, pasting config from another customer',
    },
  },

  // -------------------------------------------------------------------------
  // STEFAN WENGLER - AMSE IT Sales/CEO (external)
  // -------------------------------------------------------------------------
  stefan: {
    id: 'stefan',
    name: 'Stefan Wengler',
    role: 'Geschäftsführer AMSE IT',
    prompt: `${STYLE_PREFIX.portrait}

A German business owner in his early 50s. Slightly too tan (vacation or tanning bed), perfect hair, bleached white teeth. Wearing an expensive but ill-fitting suit. Firm handshake energy radiates from him. Holding glossy AMSE IT marketing brochures with stock photos of server rooms. His business card says "Ihr Partner für digitale Transformation". Gold watch visible.

Color accents: expensive blue suit, gold accessories, white teeth gleam
Mood: sales confidence, promise everything energy`,

    emotions: {
      neutral: 'Big smile, hand extended for handshake',
      selling: 'Pointing at brochure, enthusiastic gestures',
      apologizing: 'Hands together, sympathetic head tilt',
      defensive: 'Adjusting tie, looking away',
      schmoozing: 'Arm around shoulder gesture, too friendly',
    },
  },

  // -------------------------------------------------------------------------
  // THOMAS KELLERMANN - Telekom Business Technician
  // -------------------------------------------------------------------------
  thomas: {
    id: 'thomas',
    name: 'Thomas Kellermann',
    role: 'Technischer Kundenberater Telekom',
    prompt: `${STYLE_PREFIX.portrait}

A German telecom technician in his mid-40s. Slightly weathered face from years of climbing cable posts. Wearing a magenta Telekom jacket over a button-down shirt. Has a thick binder with network diagrams under his arm. Multiple pagers and phones. Reading glasses pushed up on forehead. Expression: helpful but overwhelmed.

Color accents: Telekom magenta jacket, grey/silver technical equipment
Mood: professional exhaustion, trying to help despite being overbooked`,

    emotions: {
      neutral: 'Attentive but checking phone',
      helpful: 'Pointing at network diagram, explaining',
      overwhelmed: 'Multiple phones ringing, stressed',
      apologetic: 'Shrugging, hands spread wide',
      technical: 'Looking at measurement device, concentrating',
    },
  },

  // -------------------------------------------------------------------------
  // SABINE WEILAND - Telekom Key Account Manager
  // -------------------------------------------------------------------------
  sabine: {
    id: 'sabine',
    name: 'Sabine Weiland',
    role: 'Key Account Managerin Telekom',
    prompt: `${STYLE_PREFIX.portrait}

A German sales manager in her late 30s. Professional appearance, perfectly styled hair, wearing a magenta blazer over white blouse. Carrying a leather portfolio with Telekom logo. Bright smile, firm handshake energy. Background hint of presentation slides with "Digitalisierung" buzzwords.

Color accents: Telekom magenta blazer, professional white/grey
Mood: polished sales professional, always closing`,

    emotions: {
      neutral: 'Confident smile, portfolio in hand',
      selling: 'Animated presentation, PowerPoint gestures',
      concerned: 'Sympathetic nod, taking notes',
      celebrating: 'Handshake, contract signed',
      defensive: 'Checking notes, looking uncomfortable',
    },
  },

  // -------------------------------------------------------------------------
  // KEVIN SCHUSTER - Cloud365 Solutions Architect
  // -------------------------------------------------------------------------
  kevin: {
    id: 'kevin',
    name: 'Kevin Schuster',
    role: 'Cloud Solutions Architect Cloud365',
    prompt: `${STYLE_PREFIX.portrait}

A young German IT consultant in his late 20s. Trendy haircut, designer glasses, wearing a hoodie with subtle Microsoft Azure logo. Macbook under arm despite being Microsoft consultant. AirPods always in. Confident smile bordering on smug. Presentation clicker in hand. Background hint of PowerPoint with "Digital Transformation" slide.

Color accents: Microsoft blue/Azure colors, modern tech aesthetic
Mood: youthful confidence, buzzword energy`,

    emotions: {
      neutral: 'Confident, AirPods in, ready to present',
      enthusiastic: 'Animated gestures, showing cloud diagram',
      caught: 'Surprised look, checking laptop screen',
      thinking: 'Finger on chin, looking at architecture diagram',
      apologetic: 'Slight grimace, hands raised defensively',
    },
  },

  // -------------------------------------------------------------------------
  // MARTIN VOLLMER - Cloud365 CEO
  // -------------------------------------------------------------------------
  martin: {
    id: 'martin',
    name: 'Martin Vollmer',
    role: 'Geschäftsführer Cloud365 GmbH',
    prompt: `${STYLE_PREFIX.portrait}

A German business owner in his late 40s. Conservative suit with subtle Microsoft partner pin. Slicked-back hair, reading glasses. Carrying a tablet showing licensing calculator. Firm handshake, practiced smile. Background hint of framed Microsoft Partner certificates on wall.

Color accents: conservative navy suit, Microsoft partner gold/blue
Mood: corporate sales, ROI-focused`,

    emotions: {
      neutral: 'Professional smile, tablet ready',
      selling: 'Pointing at ROI chart, enthusiastic',
      calculating: 'Looking at licensing calculator, thoughtful',
      reassuring: 'Hands spread wide, "trust me" gesture',
      uncomfortable: 'Adjusting glasses, looking at Kevin',
    },
  },
};

// =============================================================================
// SCENE BACKGROUNDS
// =============================================================================

export const SCENE_PROMPTS = {
  serverRoom: {
    id: 'server-room',
    name: 'Serverraum',
    prompt: `${STYLE_PREFIX.scene}

German municipal server room. Older equipment mixed with some newer hardware. Rack servers with blinking LEDs (green and amber). Cable management that started neat but devolved over years. A CRT monitor on a crash cart. Air conditioning unit humming. Fluorescent lighting. Small window showing it's a basement. Fire extinguisher on wall. "Zutritt nur für autorisiertes Personal" sign.

Key elements: server racks, blinking LEDs, cables, cold blue lighting with green LED accents
Mood: technical sanctuary, organized chaos`,
  },

  office: {
    id: 'office',
    name: 'IT-Büro',
    prompt: `${STYLE_PREFIX.scene}

German IT department office. Open plan with 4-5 desks, each with dual monitors. Mix of standing and sitting desks. Whiteboards with network diagrams. A small server rack in the corner (test environment). Plants that are somehow still alive. Coffee machine that's seen better days. Window overlooking parking lot with garbage trucks.

Key elements: multiple monitors, whiteboards, cables, coffee station
Mood: productive chaos, lived-in workspace`,
  },

  meetingRoom: {
    id: 'meeting-room',
    name: 'Besprechungsraum',
    prompt: `${STYLE_PREFIX.scene}

German municipal meeting room. Long table with 8-10 chairs. Projector screen showing a PowerPoint with pie charts. Flipchart with marker drawings. Water bottles and glasses on table. One window with vertical blinds. Wood-paneled lower walls (1970s renovation). Conference phone in center of table (the kind no one knows how to use).

Key elements: conference table, projector, flipchart, municipal aesthetic
Mood: formal discussions, budget meetings`,
  },

  helpdesk: {
    id: 'helpdesk',
    name: 'Helpdesk',
    prompt: `${STYLE_PREFIX.scene}

IT helpdesk area. Counter with glass partition (COVID remnant). Stack of returned hardware - laptops, mice, keyboards. Ticket printer spitting out paper. Wall of post-its with passwords (bad practice, but realistic). Phone that's always ringing. Queue number display. Uncomfortable waiting chairs.

Key elements: service counter, ticket system, hardware pile, waiting area
Mood: endless tickets, user interface`,
  },

  datacenter: {
    id: 'datacenter',
    name: 'Rechenzentrum',
    prompt: `${STYLE_PREFIX.scene}

External data center visit. Clean, professional rows of server racks. Blue LED lighting. Raised floor with cable management below. Cold aisle/hot aisle setup. Biometric door lock visible. Visitor badges required. Much more professional than the in-house server room.

Key elements: professional racks, clean cables, security measures, cooling
Mood: enterprise level, what IT dreams of`,
  },

  vendorOffice: {
    id: 'vendor-office',
    name: 'AMSE IT Büro',
    prompt: `${STYLE_PREFIX.scene}

Small IT service provider office. Cramped space with too many desks. Marketing posters for Sophos, Microsoft Partner, etc. on walls. Cluttered desks with multiple customer laptops being worked on. A "Customer of the Month" plaque that hasn't been updated since 2019. Coffee machine that's always empty.

Key elements: vendor certifications, customer hardware, cramped space
Mood: overstretched MSP, doing their best`,
  },
};

// =============================================================================
// SCENARIO CATEGORY ICONS
// =============================================================================

export const CATEGORY_ICON_PROMPTS = {
  security: {
    id: 'icon-security',
    name: 'Security',
    prompt: `${STYLE_PREFIX.icon}

Shield icon with a lock symbol. Glowing green outline on dark background. Slight circuit board pattern texture. Professional cybersecurity aesthetic.

Colors: terminal green (#00ff00) outline, dark fill`,
  },

  network: {
    id: 'icon-network',
    name: 'Netzwerk',
    prompt: `${STYLE_PREFIX.icon}

Network topology icon - three nodes connected by lines. Central hub design. Glowing connection lines. Data packet dots traveling along paths.

Colors: cyan (#00ffff) connections, green nodes`,
  },

  helpdesk: {
    id: 'icon-helpdesk',
    name: 'Helpdesk',
    prompt: `${STYLE_PREFIX.icon}

Headset icon with speech bubble. Support/assistance symbol. Clean lines, modern design.

Colors: amber (#ffaa00) headset, green speech bubble`,
  },

  hardware: {
    id: 'icon-hardware',
    name: 'Hardware',
    prompt: `${STYLE_PREFIX.icon}

Server rack icon or computer tower. Blinking LED dots. Technical equipment symbol.

Colors: white/grey hardware, green LED accents`,
  },

  vendorManagement: {
    id: 'icon-vendor',
    name: 'Dienstleister',
    prompt: `${STYLE_PREFIX.icon}

Handshake icon with contract/document. Business partnership symbol. Professional but with slight tension.

Colors: blue handshake, amber document`,
  },

  compliance: {
    id: 'icon-compliance',
    name: 'Compliance',
    prompt: `${STYLE_PREFIX.icon}

Clipboard with checkmark icon. Audit/regulation symbol. Official document aesthetic.

Colors: green checkmark, white clipboard`,
  },

  linux: {
    id: 'icon-linux',
    name: 'Linux',
    prompt: `${STYLE_PREFIX.icon}

Simplified Tux penguin silhouette or terminal prompt icon. Command line aesthetic.

Colors: terminal green on black`,
  },

  windows: {
    id: 'icon-windows',
    name: 'Windows',
    prompt: `${STYLE_PREFIX.icon}

Simplified four-pane window icon (not Microsoft logo, but suggestive). Or PowerShell prompt.

Colors: blue panes, white outline`,
  },

  email: {
    id: 'icon-email',
    name: 'E-Mail',
    prompt: `${STYLE_PREFIX.icon}

Envelope icon with notification badge. Incoming message symbol. Urgent red dot optional.

Colors: white envelope, red notification badge`,
  },

  phone: {
    id: 'icon-phone',
    name: 'Telefon',
    prompt: `${STYLE_PREFIX.icon}

Ringing telephone handset. Incoming call symbol. Motion lines for ringing.

Colors: amber phone, green ring waves`,
  },
};

// =============================================================================
// URGENCY INDICATORS
// =============================================================================

export const URGENCY_PROMPTS = {
  low: {
    id: 'urgency-low',
    prompt: `${STYLE_PREFIX.icon} Green checkmark or "OK" indicator. Calm, no rush. Colors: terminal green`,
  },
  medium: {
    id: 'urgency-medium',
    prompt: `${STYLE_PREFIX.icon} Yellow/amber clock or hourglass. Time-sensitive but manageable. Colors: amber/yellow`,
  },
  high: {
    id: 'urgency-high',
    prompt: `${STYLE_PREFIX.icon} Orange exclamation mark in triangle. Needs attention soon. Colors: orange`,
  },
  critical: {
    id: 'urgency-critical',
    prompt: `${STYLE_PREFIX.icon} Red flashing alert. Skull or fire optional. Emergency situation. Colors: red, pulsing effect suggested`,
  },
};

// =============================================================================
// DOCUMENT MOCKUPS
// =============================================================================

export const DOCUMENT_PROMPTS = {
  email: {
    id: 'doc-email',
    prompt: `${STYLE_PREFIX.document}

German business email mockup. Header with From/To/Subject fields. Company signature with logo placeholder. Professional but slightly bureaucratic formatting. Outlook-style interface suggested.`,
  },

  ticket: {
    id: 'doc-ticket',
    prompt: `${STYLE_PREFIX.document}

IT helpdesk ticket. Ticket number prominently displayed. Priority indicator. Description field. Status: Open. German interface labels. OTRS or similar ticketing system style.`,
  },

  contract: {
    id: 'doc-contract',
    prompt: `${STYLE_PREFIX.document}

German service contract excerpt. Legal formatting with numbered paragraphs. SLA terms visible. Signature lines at bottom. Official stamps. "Rahmenvertrag" header.`,
  },

  bsiDocument: {
    id: 'doc-bsi',
    prompt: `${STYLE_PREFIX.document}

BSI IT-Grundschutz document excerpt. Official German government formatting. Chapter numbers (e.g., "OPS.1.1.3"). Checklist format. Federal eagle logo suggested.`,
  },

  invoice: {
    id: 'doc-invoice',
    prompt: `${STYLE_PREFIX.document}

German vendor invoice. AMSE IT Solutions letterhead. Line items for services. VAT calculations. Payment terms. "Rechnung" header. Professional but slightly cluttered.`,
  },
};

// =============================================================================
// OUTCOME INDICATORS
// =============================================================================

export const OUTCOME_PROMPTS = {
  perfect: {
    id: 'outcome-perfect',
    prompt: `${STYLE_PREFIX.icon} Gold star or trophy. Exceptional result. Celebratory. Colors: gold, sparkle effects`,
  },
  success: {
    id: 'outcome-success',
    prompt: `${STYLE_PREFIX.icon} Green checkmark. Task completed successfully. Positive. Colors: bright green`,
  },
  partialSuccess: {
    id: 'outcome-partial',
    prompt: `${STYLE_PREFIX.icon} Yellow/amber half-filled circle or mixed indicator. Worked but with caveats. Colors: amber/yellow`,
  },
  fail: {
    id: 'outcome-fail',
    prompt: `${STYLE_PREFIX.icon} Red X mark. Task failed. Negative consequence. Colors: red`,
  },
  criticalFail: {
    id: 'outcome-critical-fail',
    prompt: `${STYLE_PREFIX.icon} Skull, explosion, or broken screen. Catastrophic failure. Colors: dark red, black`,
  },
};

// =============================================================================
// TERMINAL SCREENSHOTS (for complex puzzles)
// =============================================================================

export const TERMINAL_SCREENSHOT_PROMPTS = {
  linuxPanic: {
    id: 'terminal-panic',
    prompt: `Screenshot mockup of Linux kernel panic. White text on black background. Stack trace visible. "Kernel panic - not syncing" message. Realistic terminal font.`,
  },

  windowsBsod: {
    id: 'terminal-bsod',
    prompt: `Windows Blue Screen of Death mockup. Modern Windows 10/11 style with sad face emoticon. Error code visible. QR code in corner. "Your PC ran into a problem" text.`,
  },

  nagiosAlert: {
    id: 'terminal-nagios',
    prompt: `Nagios/Icinga monitoring dashboard screenshot. Red critical alerts. Service status table. Host down indicators. Classic monitoring tool aesthetic.`,
  },

  firewallLogs: {
    id: 'terminal-firewall',
    prompt: `Firewall log viewer screenshot. Blocked connections in red. Allowed in green. IP addresses and ports. Sophos or pfSense style interface.`,
  },
};

// =============================================================================
// GENERATION TIPS
// =============================================================================

export const GENERATION_TIPS = `
## Midjourney Tips
- Add "--ar 1:1" for portraits, "--ar 16:9" for scenes
- Add "--style raw" for more consistent, less artistic results
- Add "--no realistic, photo, 3d" to enforce flat cartoon style
- Use "--seed [number]" for consistent character across emotions

## DALL-E 3 Tips
- Be very specific about "flat cartoon style, bold outlines"
- Mention "game art" and "Papers Please inspired" for style consistency
- Request "solid color background" for easy integration

## Stable Diffusion Tips
- Use ControlNet for consistent character poses
- Consider training a LoRA on the art style for consistency
- Use inpainting for emotion variations

## Color Palette (for post-processing)
- Terminal Green: #00ff00
- Terminal Green Dim: #00aa00
- Background: #0a0a0a
- Border: #1a1a1a
- Warning: #ffaa00
- Danger: #ff4444
- Info: #44aaff
`;
