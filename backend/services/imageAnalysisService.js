'use strict';
// backend/services/imageAnalysisService.js — FIXED
//
// Changes vs previous version:
//   1. Lazy-init Anthropic client — missing API key no longer crashes the server
//   2. Corrected model string to 'claude-sonnet-4-6'
//   3. Rule-based fallback so the endpoint always returns something useful
//   4. Errors are logged with detail; user never sees a raw crash message

/* ─────────────────────────────────────────────────────────────────────
   Lazy client — safe when ANTHROPIC_API_KEY is not yet configured
───────────────────────────────────────────────────────────────────── */
let _client = null;

function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const Anthropic = require('@anthropic-ai/sdk');
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/* ─────────────────────────────────────────────────────────────────────
   SYSTEM PROMPT — instructs Claude to respond only in strict JSON
───────────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are an expert home-services diagnostic AI assistant for FixBuddy (Smart Local Services).

When the user provides an image, analyse it carefully and respond ONLY with a valid JSON object — no markdown fences, no preamble.

JSON shape (use exactly these keys):
{
  "detected": true | false,
  "problem":  "Short title of the problem",
  "category": "One of: ac_repair | plumbing | electrical | car_repair | washing_machine | mobile_repair | carpentry | cleaning | general",
  "severity": "low | medium | high",
  "explanation": "2-3 sentence plain-English explanation of what's wrong",
  "causes": ["cause1", "cause2", "cause3"],
  "diySteps": [
    { "step": 1, "title": "Short title", "detail": "Full instruction" }
  ],
  "safetyTips": ["tip1", "tip2"],
  "needsProfessional": true | false,
  "professionalReason": "Why a professional is recommended (or empty string)",
  "youtubeQuery": "Best YouTube search query to find a tutorial for this exact problem"
}

If the image is not related to a home/vehicle service problem, set detected:false and set category to "general".
Always respond with valid, parseable JSON — nothing else.`;

/* ─────────────────────────────────────────────────────────────────────
   RULE-BASED FALLBACK — works with no API key, keyword-matches user note
───────────────────────────────────────────────────────────────────── */
const RULE_TEMPLATES = {
  ac_repair: {
    problem: 'AC / Air Conditioner Issue', severity: 'medium',
    explanation: 'Your AC unit appears to have a problem affecting cooling. Common causes include dirty filters, low refrigerant, or electrical faults.',
    causes: ['Dirty or clogged air filter', 'Low refrigerant level', 'Faulty capacitor or compressor'],
    diySteps: [
      { step: 1, title: 'Turn off the unit', detail: 'Switch off from the remote and isolate at the main breaker.' },
      { step: 2, title: 'Clean the filter', detail: 'Remove the front panel, slide out the filter, wash with mild soap, dry fully, and refit.' },
      { step: 3, title: 'Check for ice buildup', detail: 'If coils are iced, switch to fan-only for 30 minutes to defrost before restarting.' },
    ],
    safetyTips: ['Never open refrigerant lines yourself.', 'Always isolate power before cleaning internal parts.'],
    needsProfessional: true,
    professionalReason: 'Refrigerant handling and compressor diagnostics need a certified HVAC technician.',
    youtubeQuery: 'AC air conditioner not cooling repair tutorial',
  },
  plumbing: {
    problem: 'Plumbing / Water Leak', severity: 'high',
    explanation: 'There appears to be a water leak or blockage. Left unattended this can cause structural damage and mould growth.',
    causes: ['Worn pipe joint or seal', 'Blocked drain or trap', 'Corroded or burst pipe'],
    diySteps: [
      { step: 1, title: 'Shut off water supply', detail: 'Turn the stopcock clockwise until fully closed.' },
      { step: 2, title: 'Dry the area', detail: 'Use towels and a bucket to remove standing water.' },
      { step: 3, title: 'Locate the leak', detail: 'Inspect joints, valves, and visible pipe runs.' },
    ],
    safetyTips: ['Turn off electricity in areas where water has spread.', 'Do not use drain cleaners in standing water.'],
    needsProfessional: true,
    professionalReason: 'Hidden leaks inside walls need professional tools to repair safely.',
    youtubeQuery: 'plumbing water pipe leak repair how to fix',
  },
  electrical: {
    problem: 'Electrical Fault', severity: 'high',
    explanation: 'There is an electrical fault that is a potential safety hazard. Do not attempt repairs on live circuits.',
    causes: ['Tripped circuit breaker', 'Faulty wall socket or switch', 'Overloaded circuit'],
    diySteps: [
      { step: 1, title: 'Switch off at the breaker', detail: 'Flip the relevant circuit breaker to OFF at your distribution board.' },
      { step: 2, title: 'Check for overload', detail: 'Unplug all devices on that circuit then try resetting the breaker.' },
      { step: 3, title: 'Test other sockets', detail: 'Use a plug-in tester to identify which outlets are affected.' },
    ],
    safetyTips: ['Never work on live wires.', 'Use a voltage tester before touching any terminals.'],
    needsProfessional: true,
    professionalReason: 'Wiring and panel work must be done by a licensed electrician.',
    youtubeQuery: 'electrical fault tripped breaker repair home electrician',
  },
  washing_machine: {
    problem: 'Washing Machine Fault', severity: 'medium',
    explanation: 'Your washing machine is not functioning correctly. This is often a drainage issue, door latch fault, or motor problem.',
    causes: ['Blocked drain pump filter', 'Faulty door seal', 'Worn drive belt'],
    diySteps: [
      { step: 1, title: 'Check the filter', detail: 'Open the small door at the front bottom, place a bowl under it, unscrew, and remove debris.' },
      { step: 2, title: 'Inspect drain hose', detail: 'Ensure the hose at the back is not kinked or clogged.' },
      { step: 3, title: 'Run a drum-clean cycle', detail: 'Run a 90°C cycle with no laundry and a machine cleaner tablet.' },
    ],
    safetyTips: ['Unplug before accessing internal components.', 'Do not run with a visibly torn door seal.'],
    needsProfessional: true,
    professionalReason: 'Motor and control board replacements need a qualified appliance technician.',
    youtubeQuery: 'washing machine not draining not spinning repair tutorial',
  },
  car_repair: {
    problem: 'Vehicle Issue', severity: 'medium',
    explanation: 'Your vehicle has a fault that needs attention. Driving with unresolved issues can be dangerous.',
    causes: ['Worn brake pads or discs', 'Battery or alternator fault', 'Engine sensor triggered warning'],
    diySteps: [
      { step: 1, title: 'Check warning lights', detail: 'Note all active warning lights and look them up in your vehicle manual.' },
      { step: 2, title: 'Inspect tyres and fluids', detail: 'Check tyre condition, oil, coolant, and brake fluid levels.' },
      { step: 3, title: 'Listen for sounds', detail: 'Note any grinding, knocking, or squealing to describe to a mechanic.' },
    ],
    safetyTips: ['Do not drive with a brake warning light active.', 'Keep hazard lights on if broken down on the road.'],
    needsProfessional: true,
    professionalReason: 'Engine and brake diagnostics need specialist tools and a trained mechanic.',
    youtubeQuery: 'car repair engine warning light diagnostic how to fix',
  },
  mobile_repair: {
    problem: 'Smartphone Issue', severity: 'low',
    explanation: 'Your smartphone has a hardware or software fault such as a cracked screen, battery drain, or charging port damage.',
    causes: ['Cracked or unresponsive screen', 'Worn battery', 'Damaged charging port'],
    diySteps: [
      { step: 1, title: 'Back up your data', detail: 'Enable backup via Google/iCloud before any repair attempt.' },
      { step: 2, title: 'Force restart', detail: 'Hold Power + Volume Down (Android) for 10 seconds to clear software glitches.' },
      { step: 3, title: 'Clean charging port', detail: 'Use a toothpick gently to remove lint — never use metal tools.' },
    ],
    safetyTips: ['Do not attempt screen replacements without proper suction tools.', 'Avoid batteries from unknown brands.'],
    needsProfessional: false, professionalReason: '',
    youtubeQuery: 'smartphone screen battery charging port repair tutorial',
  },
};

const KEYWORD_MAP = {
  ac_repair:       ['ac', 'air condition', 'hvac', 'cooling', 'split', 'aircon'],
  plumbing:        ['leak', 'pipe', 'water', 'drain', 'tap', 'faucet', 'plumb', 'sink'],
  electrical:      ['electric', 'wire', 'socket', 'switch', 'power', 'breaker', 'fuse'],
  washing_machine: ['washing', 'washer', 'laundry', 'dryer'],
  car_repair:      ['car', 'vehicle', 'engine', 'brake', 'tyre', 'tire', 'auto'],
  mobile_repair:   ['phone', 'mobile', 'screen', 'battery', 'iphone', 'android', 'charger'],
};

function ruleBasedAnalysis(userNote) {
  const lower = (userNote || '').toLowerCase();
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      const t = RULE_TEMPLATES[category];
      if (t) return { detected: true, category, ...t };
    }
  }
  return {
    detected: true, category: 'general', severity: 'medium',
    problem: 'Home Service Issue',
    explanation: 'I can see what looks like a home service problem. Please describe the issue in more detail for specific guidance.',
    causes: ['Further detail needed to identify the cause'],
    diySteps: [{ step: 1, title: 'Describe the problem', detail: 'Type a description of what you see so I can help further.' }],
    safetyTips: ['Stay safe — turn off utilities if there is any risk of harm.'],
    needsProfessional: true,
    professionalReason: 'Until the problem is identified a professional assessment is the safest option.',
    youtubeQuery: 'home appliance repair general guide',
  };
}

/* ─────────────────────────────────────────────────────────────────────
   analyseImage  — main export
───────────────────────────────────────────────────────────────────── */
async function analyseImage(base64Data, mediaType, userNote = '') {
  const client = getClient();

  // No API key → rule-based only
  if (!client) {
    console.warn('[ImageAnalysis] ANTHROPIC_API_KEY not set — using rule-based fallback');
    return ruleBasedAnalysis(userNote);
  }

  // Claude only accepts these MIME types
  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supported.includes(mediaType)) {
    console.warn('[ImageAnalysis] Unsupported media type:', mediaType, '— using fallback');
    return ruleBasedAnalysis(userNote);
  }

  try {
    const userContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
      { type: 'text',  text: userNote.trim()
          ? `User note: ${userNote}`
          : 'Please analyse this image and identify any home/vehicle service problems.' },
    ];

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',   // ← correct current model string
      max_tokens: 1200,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userContent }],
    });

    const raw     = response.content.find(b => b.type === 'text')?.text || '';
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    if (!cleaned) throw new Error('Empty response from API');

    const parsed = JSON.parse(cleaned);
    if (typeof parsed.detected !== 'boolean') throw new Error('Invalid response shape');

    return parsed;

  } catch (err) {
    console.error('[ImageAnalysis] API error:', err?.status, err?.message || err);
    // Return rule-based result so user always gets a useful response
    return ruleBasedAnalysis(userNote);
  }
}

module.exports = { analyseImage };