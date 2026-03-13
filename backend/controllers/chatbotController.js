'use strict';
// backend/controllers/chatbotController.js
// Self-contained — no top-level require of optional packages.
// Every external dependency is lazy-loaded inside the function that needs it,
// so a missing npm package never prevents the file from loading.

const { ApiError } = require('../utils/ApiError');

/* ─────────────────────────────────────────────────────────────────────
   SAFE UUID  — uses crypto.randomUUID (Node 14.17+) or falls back to
   a simple timestamp-based id if uuid package is not installed
───────────────────────────────────────────────────────────────────── */
function makeId() {
  try { return require('uuid').v4(); } catch (_) {}
  try { return require('crypto').randomUUID(); } catch (_) {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ─────────────────────────────────────────────────────────────────────
   LAZY MONGOOSE MODELS
───────────────────────────────────────────────────────────────────── */
let _CS, _KB;
function getModels() {
  if (_CS) return { CS: _CS, KB: _KB };
  const mongoose = require('mongoose');

  if (mongoose.models.ChatbotSession) {
    _CS = mongoose.model('ChatbotSession');
  } else {
    const Msg = new mongoose.Schema(
      { role: { type: String, enum: ['user','assistant','system'], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now } },
      { _id: false }
    );
    _CS = mongoose.model('ChatbotSession', new mongoose.Schema(
      { sessionId:   { type: String, required: true, unique: true, index: true },
        user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        messages:    [Msg],
        escalated:   { type: Boolean, default: false },
        escalatedAt: { type: Date,    default: null },
        rating:      { type: Number,  min: 1, max: 5, default: null },
        ratedAt:     { type: Date,    default: null },
        intent:      { type: String,  default: '' } },
      { timestamps: true }
    ));
  }

  if (mongoose.models.KnowledgeBase) {
    _KB = mongoose.model('KnowledgeBase');
  } else {
    _KB = mongoose.model('KnowledgeBase', new mongoose.Schema(
      { question:   { type: String, required: true },
        answer:     { type: String, required: true },
        keywords:   [{ type: String, lowercase: true }],
        category:   { type: String, default: 'general' },
        isActive:   { type: Boolean, default: true },
        usageCount: { type: Number,  default: 0 } },
      { timestamps: true }
    ));
  }

  return { CS: _CS, KB: _KB };
}

/* ─────────────────────────────────────────────────────────────────────
   INTENT DETECTION
───────────────────────────────────────────────────────────────────── */
const INTENT_MAP = {
  how_to_book:            ['how to book','how do i book','booking process','steps to book'],
  how_to_become_provider: ['become provider','join as provider','register as provider','how to register'],
  how_payment_works:      ['how payment','how to pay','payment process','payment method'],
  how_negotiation:        ['how negotiation','how to negotiate','bargaining','price negotiation'],
  how_cancel:             ['how to cancel','cancel process','cancellation steps'],
  booking_create:         ['book','booking','schedule','appointment','hire','reserve'],
  booking_cancel:         ['cancel','cancellation','refund'],
  booking_track:          ['track','status','where is','my booking','pending'],
  payment:                ['pay','payment','price','cost','charge','invoice','bill','fee'],
  bargain:                ['bargain','negotiate','discount','offer','deal','lower price'],
  provider:               ['provider','plumber','electrician','carpenter','cleaner','mechanic','find'],
  account:                ['account','login','sign up','register','password','profile'],
  review:                 ['review','rating','feedback','rate','stars','complaint'],
  support:                ['help','support','contact','human','agent','problem','issue'],
  greeting:               ['hi','hello','hey','good morning','good evening'],
  thanks:                 ['thank','thanks','thank you','thx','great','awesome'],
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }
  return 'unknown';
}

/* ─────────────────────────────────────────────────────────────────────
   STATIC RESPONSES
───────────────────────────────────────────────────────────────────── */
const RESPONSES = {
  greeting: ["👋 Hello! Welcome to **FixBuddy** — your Smart Local Services platform.\n\nI can help you:\n• 📅 Book & track services\n• 📸 Analyse problem images\n• 💰 Pricing & negotiation\n• 🔍 Find the right provider\n\nHow can I help?"],
  thanks: ["You're very welcome! 😊 Anything else I can help with?"],
  how_to_book: ["📅 **How to Book a Service:**\n\n1️⃣ Login to your FixBuddy account\n2️⃣ Search for the service you need\n3️⃣ Browse providers by rating & price\n4️⃣ Click **Book Now**\n5️⃣ Select date & time\n6️⃣ Fill service details\n7️⃣ Confirm — provider gets notified instantly\n\n📧 You'll get a confirmation email once the provider approves."],
  how_to_become_provider: ["🛠️ **How to Become a Provider:**\n\n1️⃣ Click **Join as Provider** and fill your details\n2️⃣ List your services, skills & pricing\n3️⃣ Wait for Admin Approval\n4️⃣ Profile goes live on the platform\n5️⃣ Start receiving bookings!\n\n✅ After approval you can accept/reject bookings, chat with users, and manage availability."],
  how_payment_works: ["💳 **How Payment Works:**\n\nPayment is direct between user & provider:\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking\n• Cash on completion\n\n📧 Auto-generated invoice sent after service completion."],
  how_negotiation: ["🤝 **How Negotiation Works:**\n\n1️⃣ Go to **My Bookings**\n2️⃣ Click **Negotiate Price**\n3️⃣ Enter your offer (up to 40% off)\n4️⃣ Provider can Accept, Counter, or Reject\n5️⃣ Up to **5 rounds** of back-and-forth\n6️⃣ Once agreed → price is locked\n\n🎯 Our AI suggests fair prices to speed things up!"],
  how_cancel: ["❌ **How to Cancel:**\n\n1️⃣ Go to **My Bookings**\n2️⃣ Select the booking\n3️⃣ Click **Cancel Booking**\n\n**Refund Policy:**\n• 24+ hours before → Full refund\n• 12–24 hours before → 50% refund\n• Same day → No refund\n\nRefunds process in 3–5 business days."],
  booking_create: ["📅 **Booking a Service:**\n\n1. Search for your service\n2. Pick a provider\n3. Click **Book Now**\n4. Select date & time\n5. Confirm\n\nYou'll get a confirmation email instantly!"],
  booking_cancel: ["❌ **Cancellation Policy:**\n\n• Free cancellation 24+ hours before\n• 50% refund 12–24 hours before\n• No refund same-day\n\nGo to **My Bookings** → Select → **Cancel Booking**"],
  booking_track: ["🔍 **Track Your Booking:**\n\n• **Pending** — Awaiting provider\n• **Confirmed** — Scheduled ✅\n• **In Progress** — Provider is working\n• **Completed** — Done!\n• **Cancelled** — Cancelled\n\nCheck **My Bookings** in your dashboard."],
  payment: ["💳 **Payment Options:**\n\n• Credit/Debit Cards\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking & Wallets\n\nAll transactions are SSL-encrypted 🔒"],
  bargain: ["🤝 **Price Negotiation:**\n\n1. Open booking details\n2. Click **Negotiate Price**\n3. Enter your offer (up to 40% off)\n4. Up to 5 rounds of negotiation\n\nOur AI suggests fair prices! 🎯"],
  provider: ["🔍 **Finding Providers:**\n\nFilter by location, rating, price, category & availability.\n\nAll providers are **verified & background-checked**.\n\nOr 📸 **upload an image** of your problem — I'll diagnose it and suggest the right provider!"],
  account: ["👤 **Account Help:**\n\n• Sign Up — Click Register\n• Login Issues — Use Forgot Password\n• Profile — Update from Dashboard\n• Notifications — Manage in Settings"],
  review: ["⭐ **Reviews & Ratings:**\n\nAfter completion:\n• Rate 1–5 stars\n• Write a review\n• Only verified customers can review\n\nGo to: **My Bookings** → Completed → **Leave Review**"],
  support: ["🆘 **Support:**\n\n• 📧 Email: support@FixBuddy.com\n• 📞 Phone: +91 1800-XXX-XXXX (9AM–6PM IST)\n• 💬 Click **Human** above to escalate\n\nOr 📸 upload an image of your problem!"],
  unknown: ["I'm not sure I understood that. Try asking about **bookings**, **payments**, **providers**, or **account** issues.\n\nOr 📸 **upload an image** of your problem — I'll diagnose it!"],
};

function getStaticResponse(intent) {
  const pool = RESPONSES[intent] || RESPONSES.unknown;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function searchKB(text) {
  try {
    const { KB } = getModels();
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return null;
    const entry = await KB.findOne({ keywords: { $in: words }, isActive: true }).sort({ usageCount: -1 });
    if (entry) { await KB.findByIdAndUpdate(entry._id, { $inc: { usageCount: 1 } }); return entry; }
  } catch (_) {}
  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   IMAGE ANALYSIS  — lazy Anthropic + rule-based fallback
───────────────────────────────────────────────────────────────────── */
let _anthropic = null;
function getAnthropicClient() {
  if (_anthropic) return _anthropic;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _anthropic;
  } catch (_) { return null; }
}

const RULE_TEMPLATES = {
  ac_repair:       { problem:'AC / Air Conditioner Issue', severity:'medium', explanation:'Your AC unit appears to have a fault affecting cooling performance.', causes:['Dirty air filter','Low refrigerant','Faulty capacitor'], diySteps:[{step:1,title:'Turn off the unit',detail:'Switch off from remote and isolate at the main breaker.'},{step:2,title:'Clean the filter',detail:'Remove the front panel, slide out the filter, wash with mild soap, dry fully, and refit.'},{step:3,title:'Check for ice',detail:'If coils are iced, switch to fan-only for 30 minutes to defrost.'}], safetyTips:['Never open refrigerant lines yourself.','Isolate power before cleaning.'], needsProfessional:true, professionalReason:'Refrigerant and compressor work needs a certified HVAC technician.', youtubeQuery:'AC air conditioner not cooling repair tutorial' },
  plumbing:        { problem:'Plumbing / Water Leak', severity:'high', explanation:'There appears to be a water leak or blockage that needs urgent attention.', causes:['Worn pipe joint','Blocked drain','Burst pipe'], diySteps:[{step:1,title:'Shut off water',detail:'Turn the stopcock clockwise until fully closed.'},{step:2,title:'Dry the area',detail:'Use towels and a bucket to remove standing water.'},{step:3,title:'Locate the leak',detail:'Inspect joints, valves, and visible pipe runs.'}], safetyTips:['Turn off electricity in flooded areas.','Do not use drain cleaners in standing water.'], needsProfessional:true, professionalReason:'Hidden leaks need professional tools to fix safely.', youtubeQuery:'plumbing water pipe leak repair how to fix' },
  electrical:      { problem:'Electrical Fault', severity:'high', explanation:'There is an electrical fault that poses a safety hazard. Do not work on live circuits.', causes:['Tripped breaker','Faulty socket','Overloaded circuit'], diySteps:[{step:1,title:'Switch off at breaker',detail:'Flip the circuit breaker to OFF at your distribution board.'},{step:2,title:'Check for overload',detail:'Unplug all devices on that circuit then reset the breaker.'},{step:3,title:'Test sockets',detail:'Use a plug-in tester to identify affected outlets.'}], safetyTips:['Never work on live wires.','Use a voltage tester first.'], needsProfessional:true, professionalReason:'Wiring must be done by a licensed electrician.', youtubeQuery:'electrical fault breaker repair home electrician' },
  washing_machine: { problem:'Washing Machine Fault', severity:'medium', explanation:'Your washing machine is not functioning correctly — likely a drainage, door, or motor issue.', causes:['Blocked drain filter','Faulty door seal','Worn belt'], diySteps:[{step:1,title:'Check the filter',detail:'Open the small door at the front bottom, place a bowl under it, unscrew, and remove debris.'},{step:2,title:'Inspect drain hose',detail:'Ensure the hose at the back is not kinked or blocked.'},{step:3,title:'Run drum clean',detail:'Run a 90°C cycle with a machine-cleaner tablet.'}], safetyTips:['Unplug before accessing internals.','Do not run with a torn door seal.'], needsProfessional:true, professionalReason:'Motor and control board repairs need a qualified technician.', youtubeQuery:'washing machine not draining not spinning repair' },
  car_repair:      { problem:'Vehicle Issue', severity:'medium', explanation:'Your vehicle has a fault that needs attention before driving.', causes:['Worn brake pads','Battery fault','Engine sensor warning'], diySteps:[{step:1,title:'Check warning lights',detail:'Note all active lights and check your vehicle manual.'},{step:2,title:'Inspect fluids & tyres',detail:'Check oil, coolant, brake fluid and tyre condition.'},{step:3,title:'Listen for sounds',detail:'Note any grinding or knocking to describe to a mechanic.'}], safetyTips:['Do not drive with a brake warning light on.','Use hazard lights if broken down.'], needsProfessional:true, professionalReason:'Engine and brake diagnostics need specialist tools.', youtubeQuery:'car repair engine warning light diagnostic fix' },
  mobile_repair:   { problem:'Smartphone Issue', severity:'low', explanation:'Your phone has a hardware or software fault such as a cracked screen, battery, or charging issue.', causes:['Cracked screen','Worn battery','Damaged charging port'], diySteps:[{step:1,title:'Back up data',detail:'Enable Google/iCloud backup before attempting any repair.'},{step:2,title:'Force restart',detail:'Hold Power + Volume Down for 10 seconds.'},{step:3,title:'Clean charging port',detail:'Use a toothpick gently to remove lint — no metal tools.'}], safetyTips:['Do not open the phone without proper tools.','Avoid unknown-brand batteries.'], needsProfessional:false, professionalReason:'', youtubeQuery:'smartphone screen battery charging port repair tutorial' },
};

const KEYWORD_MAP = {
  ac_repair:['ac','air condition','hvac','cooling','split','aircon'],
  plumbing:['leak','pipe','water','drain','tap','faucet','plumb','sink'],
  electrical:['electric','wire','socket','switch','power','breaker','fuse'],
  washing_machine:['washing','washer','laundry','dryer'],
  car_repair:['car','vehicle','engine','brake','tyre','tire','auto'],
  mobile_repair:['phone','mobile','screen','battery','iphone','android','charger'],
};

function ruleBasedAnalysis(note) {
  const lower = (note || '').toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORD_MAP)) {
    if (kws.some(k => lower.includes(k))) {
      const t = RULE_TEMPLATES[cat];
      if (t) return { detected:true, category:cat, ...t };
    }
  }
  return { detected:true, category:'general', severity:'medium', problem:'Home Service Issue', explanation:'I can see a service issue. Please describe the problem in more detail for specific guidance.', causes:['Further detail needed'], diySteps:[{step:1,title:'Describe the problem',detail:'Type what you see so I can give specific advice.'}], safetyTips:['Turn off utilities if there is any risk of harm.'], needsProfessional:true, professionalReason:'A professional assessment is safest until the problem is identified.', youtubeQuery:'home appliance repair guide' };
}

const IMAGE_SYSTEM = `You are an expert home-services diagnostic AI for FixBuddy (Smart Local Services).
Analyse the image and respond ONLY with a valid JSON object — no markdown, no extra text.
JSON shape: {"detected":true,"problem":"Short title","category":"ac_repair|plumbing|electrical|car_repair|washing_machine|mobile_repair|carpentry|cleaning|general","severity":"low|medium|high","explanation":"2-3 sentences","causes":["..."],"diySteps":[{"step":1,"title":"...","detail":"..."}],"safetyTips":["..."],"needsProfessional":true,"professionalReason":"...","youtubeQuery":"..."}
If image is not a service problem, set detected:false. Return ONLY JSON.`;

async function doImageAnalysis(base64Data, mediaType, note) {
  const client = getAnthropicClient();
  if (!client) {
    console.warn('[ImageAnalysis] No ANTHROPIC_API_KEY — using rule-based fallback');
    return ruleBasedAnalysis(note);
  }
  const supported = ['image/jpeg','image/png','image/gif','image/webp'];
  if (!supported.includes(mediaType)) return ruleBasedAnalysis(note);
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: IMAGE_SYSTEM,
      messages: [{ role:'user', content:[
        { type:'image', source:{ type:'base64', media_type:mediaType, data:base64Data } },
        { type:'text',  text: note?.trim() ? `User note: ${note}` : 'Analyse this image for home/vehicle service problems.' }
      ]}],
    });
    const raw = res.content.find(b => b.type==='text')?.text || '';
    const cleaned = raw.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
    if (!cleaned) throw new Error('Empty response');
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.detected !== 'boolean') throw new Error('Bad shape');
    return parsed;
  } catch (err) {
    console.error('[ImageAnalysis] API error:', err?.status, err?.message);
    return ruleBasedAnalysis(note);
  }
}

/* ─────────────────────────────────────────────────────────────────────
   YOUTUBE SEARCH  — lazy axios
───────────────────────────────────────────────────────────────────── */
async function searchYoutube(query, max=2) {
  if (!query || !process.env.YOUTUBE_API_KEY) return [];
  try {
    const axios = require('axios');
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params:{ key:process.env.YOUTUBE_API_KEY, q:`${query} tutorial`, part:'snippet', type:'video', maxResults:max, safeSearch:'strict' },
      timeout:5000,
    });
    return (data.items||[]).map(i=>({ videoId:i.id.videoId, title:i.snippet.title, thumbnail:i.snippet.thumbnails?.medium?.url||'', channelTitle:i.snippet.channelTitle, embedUrl:`https://www.youtube.com/embed/${i.id.videoId}?rel=0` }));
  } catch (err) {
    console.warn('[YouTube] search failed:', err.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────
   PROVIDER RECOMMENDATIONS
───────────────────────────────────────────────────────────────────── */
const CAT_KEYWORDS = { ac_repair:['ac','air conditioner','hvac','cooling'], plumbing:['plumber','plumbing','pipe','drain'], electrical:['electrician','electrical','wiring'], car_repair:['car','mechanic','auto'], washing_machine:['washing machine','appliance'], mobile_repair:['mobile','phone','screen'], carpentry:['carpenter','wood','furniture'], cleaning:['cleaning','cleaner'] };

async function findProviders(category, city='', limit=4) {
  try {
    const mongoose = require('mongoose');
    const Model = mongoose.models.Provider || mongoose.models.User;
    if (!Model) return [];
    const kws = CAT_KEYWORDS[category] || [];
    const q = {};
    if (kws.length) {
      const rx = new RegExp(kws.join('|'),'i');
      q.$or = [{ serviceCategory:rx },{ services:rx },{ specialization:rx },{ description:rx }];
    }
    if (city) {
      const cx = new RegExp(city,'i');
      q.$and = [...(q.$and||[]), { $or:[{city:cx},{'address.city':cx}] }];
    }
    const rows = await Model.find(q).sort({rating:-1}).limit(limit).select('name profileImage avatar serviceCategory rating reviewCount priceRange city isAvailable').lean();
    return rows.map(p=>({ id:p._id, name:p.name||'Provider', avatar:p.profileImage||p.avatar||null, category:p.serviceCategory||category, rating:p.rating||0, reviewCount:p.reviewCount||0, city:p.city||city, isAvailable:p.isAvailable!==false }));
  } catch (err) {
    console.warn('[Providers] query failed:', err.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTE HANDLERS
═══════════════════════════════════════════════════════════════════ */

exports.chat = async (req, res, next) => {
  try {
    const { CS } = getModels();
    const { message, sessionId } = req.body;
    const userId = req.user?.id || req.user?._id || null;
    const sid = sessionId || makeId();
    let session = await CS.findOne({ sessionId: sid });
    if (!session) session = await CS.create({ sessionId:sid, user:userId, messages:[{ role:'system', content:'FixBuddy Assistant' }] });
    if (session.escalated) return res.json({ success:true, sessionId:sid, reply:'🔁 Your session is with a human agent. Expect a reply within 2 hours.', escalated:true, intent:'escalated' });
    session.messages.push({ role:'user', content:message, createdAt:new Date() });
    const intent = detectIntent(message);
    session.intent = intent;
    const kb = await searchKB(message);
    const reply = kb ? `📚 ${kb.answer}` : getStaticResponse(intent);
    session.messages.push({ role:'assistant', content:reply, createdAt:new Date() });
    await session.save();
    res.json({ success:true, sessionId:sid, reply, intent, escalated:false });
  } catch (err) { next(err); }
};

exports.analyzeImage = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, 'No image file provided'));
    const { CS } = getModels();
    const { sessionId, note='', city='' } = req.body;
    const userId = req.user?.id || req.user?._id || null;

    const base64Data = req.file.buffer.toString('base64');
    const mediaType  = req.file.mimetype;

    const [analysis, videos] = await Promise.all([
      doImageAnalysis(base64Data, mediaType, note),
      searchYoutube('', 0), // will be replaced after analysis
    ]);

    const [ytVideos, providers] = await Promise.all([
      analysis.youtubeQuery ? searchYoutube(analysis.youtubeQuery, 2) : Promise.resolve([]),
      analysis.detected     ? findProviders(analysis.category, city, 4) : Promise.resolve([]),
    ]);

    const severityEmoji = { low:'🟢', medium:'🟡', high:'🔴' }[analysis.severity] || '⚪';
    let reply = analysis.detected
      ? `${severityEmoji} **Detected: ${analysis.problem}**\n\n${analysis.explanation}${analysis.needsProfessional ? '\n\n⚠️ **Professional recommended:** ' + analysis.professionalReason : ''}`
      : "I couldn't identify a specific problem. Please describe the issue in text, or try a clearer photo.";

    const sid = sessionId || makeId();
    let session = await CS.findOne({ sessionId: sid });
    if (!session) session = await CS.create({ sessionId:sid, user:userId, messages:[{ role:'system', content:'FixBuddy Assistant' }] });
    session.messages.push({ role:'user',      content:`[Image uploaded]${note ? ': '+note : ''}`, createdAt:new Date() });
    session.messages.push({ role:'assistant', content:reply, createdAt:new Date() });
    session.intent = `image_analysis:${analysis.category}`;
    await session.save();

    res.json({ success:true, sessionId:sid, reply, analysis, videos:ytVideos, providers, intent:`image_analysis:${analysis.category}`, escalated:false });
  } catch (err) {
    console.error('[analyzeImage]', err?.message || err);
    next(err);
  }
};

exports.getProviders = async (req, res, next) => {
  try {
    const { category='general', city='', limit=4 } = req.body;
    const providers = await findProviders(category, city, Math.min(limit, 10));
    res.json({ success:true, providers });
  } catch (err) { next(err); }
};

exports.escalate = async (req, res, next) => {
  try {
    const { CS } = getModels();
    const session = await CS.findOne({ sessionId: req.params.sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));
    session.escalated = true; session.escalatedAt = new Date();
    if (req.user?.id) session.user = req.user.id;
    const msg = "🔁 Your conversation has been escalated to a human agent. We'll reply within 2 hours (9AM–6PM IST, Mon–Sat).";
    session.messages.push({ role:'assistant', content:msg, createdAt:new Date() });
    await session.save();
    res.json({ success:true, escalated:true, message:msg });
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { CS } = getModels();
    const session = await CS.findOne({ sessionId: req.params.sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));
    const userId = (req.user?.id || req.user?._id)?.toString();
    if (session.user && session.user.toString() !== userId && req.user?.role !== 'admin') return next(new ApiError(403, 'Access denied'));
    res.json({ success:true, data:{ sessionId:session.sessionId, messages:session.messages.filter(m=>m.role!=='system'), escalated:session.escalated, rating:session.rating, createdAt:session.createdAt } });
  } catch (err) { next(err); }
};

exports.rateSession = async (req, res, next) => {
  try {
    const { CS } = getModels();
    const { sessionId, rating } = req.body;
    if (!sessionId)                        return next(new ApiError(400, 'sessionId required'));
    if (!rating || rating < 1 || rating > 5) return next(new ApiError(400, 'Rating must be 1–5'));
    const session = await CS.findOne({ sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));
    session.rating = Math.round(rating); session.ratedAt = new Date();
    await session.save();
    res.json({ success:true, rated:true, rating:session.rating });
  } catch (err) { next(err); }
};

exports.adminGetSessions = async (req, res, next) => {
  try {
    const { CS } = getModels();
    const page=Math.max(1,parseInt(req.query.page)||1), limit=Math.min(100,parseInt(req.query.limit)||20);
    const filter={};
    if (req.query.escalated !== undefined) filter.escalated = req.query.escalated==='true';
    const [sessions, total] = await Promise.all([CS.find(filter).populate('user','name email').sort('-createdAt').skip((page-1)*limit).limit(limit).select('-messages'), CS.countDocuments(filter)]);
    res.json({ success:true, sessions, total, page, pages:Math.ceil(total/limit) });
  } catch (err) { next(err); }
};

exports.adminCreateKnowledge = async (req, res, next) => {
  try {
    const { KB } = getModels();
    const { question, answer, keywords=[], category='general' } = req.body;
    if (!question) return next(new ApiError(400, 'question required'));
    if (!answer)   return next(new ApiError(400, 'answer required'));
    res.status(201).json({ success:true, data: await KB.create({ question, answer, keywords, category }) });
  } catch (err) { next(err); }
};

exports.adminUpdateKnowledge = async (req, res, next) => {
  try {
    const { KB } = getModels();
    const entry = await KB.findByIdAndUpdate(req.params.id, req.body, { new:true });
    if (!entry) return next(new ApiError(404, 'Not found'));
    res.json({ success:true, data:entry });
  } catch (err) { next(err); }
};

exports.adminDeleteKnowledge = async (req, res, next) => {
  try {
    const { KB } = getModels();
    const entry = await KB.findByIdAndDelete(req.params.id);
    if (!entry) return next(new ApiError(404, 'Not found'));
    res.json({ success:true, message:'Deleted' });
  } catch (err) { next(err); }
};