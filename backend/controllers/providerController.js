const Provider = require('../models/Provider');
const Review   = require('../models/Review');
const axios    = require('axios');
const { haversine } = require('../utils/haversine');

// ── Helper: safely parse a value that may already be an object or a JSON string ──
const parseField = (val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'object') return val;            // already parsed (JSON body)
  if (typeof val === 'string') {
    try { return JSON.parse(val); }                   // came from FormData as string
    catch { return val; }                             // plain string — leave as-is
  }
  return val;
};

// ── Register Provider ────────────────────────────────────────
exports.registerProvider = async (req, res, next) => {
  try {
    const existing = await Provider.findOne({ user: req.user._id });

    if (existing && existing.verificationStatus !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Provider profile already exists and is under review or verified',
      });
    }

    if (existing && existing.verificationStatus === 'rejected') {
      await Provider.deleteOne({ _id: existing._id });
    }

    const { name, phone, services, description, city, state, address, hourlyRate, experience } = req.body;

    if (!req.files?.liveImage || !req.files?.idProofImage)
      return res.status(400).json({ success: false, message: 'Live image and ID proof are required' });

    const liveImage    = req.files.liveImage[0].path;
    const idProofImage = req.files.idProofImage[0].path;

    // ── Geocode ──
    let lat = null, lng = null;
    if (city) {
      try {
        const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: `${city}, ${state || 'India'}`, format: 'json', limit: 1 },
          headers: { 'User-Agent': 'SmartLocalServices/1.0' },
        });
        if (geoRes.data.length > 0) {
          lat = parseFloat(geoRes.data[0].lat);
          lng = parseFloat(geoRes.data[0].lon);
        }
      } catch (_) { /* optional */ }
    }

    // ── Parse services ──
    // Accepts three shapes:
    //   1. Already an array of objects:  [{ name, category, price, priceUnit }]  (JSON body)
    //   2. A JSON string of that array:  '[{"name":"Plumber","price":500}]'       (FormData)
    //   3. A plain comma string:         "Plumber, Electrician"                   (legacy)
    let parsedServices = parseField(services);

    if (typeof parsedServices === 'string') {
      // plain comma-separated fallback — price unknown, default to 0
      parsedServices = parsedServices
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => ({ name: s, category: s, price: 0, priceUnit: 'hour' }));
    } else if (Array.isArray(parsedServices)) {
      // Normalise each entry — fill in missing fields
      parsedServices = parsedServices.map(s =>
        typeof s === 'string'
          ? { name: s, category: s, price: 0, priceUnit: 'hour' }
          : {
              name:      s.name      || '',
              category:  s.category  || s.name || '',
              description: s.description || '',
              price:     Number(s.price)    || 0,   // ← price is NOW saved
              priceUnit: s.priceUnit || 'hour',
            }
      );
    } else {
      parsedServices = [];
    }

    const provider = await Provider.create({
      user: req.user._id,
      name, phone,
      email: req.user.email,
      services: parsedServices,
      description: description || '',
      location: { city: city || '', state: state || '', address: address || '' },
      latitude: lat,
      longitude: lng,
      liveImage, idProofImage,
      hourlyRate: Number(hourlyRate) || 0,
      experience: Number(experience) || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Awaiting admin verification.',
      data: provider,
    });
  } catch (err) { next(err); }
};

// ── Get All Public Providers ─────────────────────────────────
exports.getProviders = async (req, res, next) => {
  try {
    const { city, service, category, lat, lng, minRating, available, search } = req.query;

    const query = { isVerified: true, verificationStatus: 'verified', isActive: true };

    if (city)     query['location.city']       = new RegExp(city, 'i');
    if (service)  query['services.name']       = new RegExp(service, 'i');
    if (category) query['services.category']   = new RegExp(category, 'i');
    if (minRating) query.rating                = { $gte: Number(minRating) };
    if (available === 'true') query['availability.isAvailable'] = true;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { 'services.name': new RegExp(search, 'i') },
      { 'services.category': new RegExp(search, 'i') },
    ];

    let providers = await Provider.find(query)
      .populate('user', 'name email phone')
      .select('-idProofImage -liveImage');

    if (lat && lng) {
      providers = providers.map(p => ({
        ...p.toObject(),
        distance: (p.latitude && p.longitude)
          ? haversine(parseFloat(lat), parseFloat(lng), p.latitude, p.longitude)
          : 99999,
      })).sort((a, b) => a.distance - b.distance);
    }

    providers.sort((a, b) => {
      if (a.subscription === 'premium' && b.subscription !== 'premium') return -1;
      if (b.subscription === 'premium' && a.subscription !== 'premium') return 1;
      return 0;
    });

    res.json({ success: true, count: providers.length, providers, data: providers });
  } catch (err) { next(err); }
};

// ── Get Single Provider (with reviews) ───────────────────────
exports.getProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('user', 'name email phone');
    if (!provider)
      return res.status(404).json({ success: false, message: 'Provider not found' });

    const reviews = await Review.find({ provider: provider._id })
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(20);

    res.json({ success: true, provider, reviews, data: provider });
  } catch (err) { next(err); }
};

// ── Get My Provider Profile ───────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id })
      .populate('user', 'name email phone');
    if (!provider)
      return res.status(404).json({ success: false, message: 'Provider profile not found' });

    res.json({ success: true, provider, data: provider });
  } catch (err) { next(err); }
};

// ── Update Provider Profile ───────────────────────────────────
exports.updateProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider)
      return res.status(404).json({ success: false, message: 'Provider not found' });

    // ── Simple scalar fields ──
    const scalars = ['name', 'phone', 'bio', 'description', 'hourlyRate', 'experience'];
    scalars.forEach(f => {
      if (req.body[f] !== undefined) provider[f] = req.body[f];
    });

    // ── JSON fields (may arrive as string from FormData or as object from JSON body) ──

    // location
    const location = parseField(req.body.location);
    if (location && typeof location === 'object') {
      provider.location = {
        city:    location.city    ?? provider.location?.city    ?? '',
        state:   location.state   ?? provider.location?.state   ?? '',
        address: location.address ?? provider.location?.address ?? '',
        pincode: location.pincode ?? provider.location?.pincode ?? '',
      };
    }

    // availability
    const availability = parseField(req.body.availability);
    if (availability && typeof availability === 'object') {
      provider.availability = {
        isAvailable:  availability.isAvailable  ?? provider.availability?.isAvailable  ?? true,
        workingDays:  availability.workingDays   ?? provider.availability?.workingDays  ?? [],
        workingHours: {
          start: availability.workingHours?.start ?? provider.availability?.workingHours?.start ?? '09:00',
          end:   availability.workingHours?.end   ?? provider.availability?.workingHours?.end   ?? '18:00',
        },
      };
    }

    // services — normalise and preserve price
    const rawServices = parseField(req.body.services);
    if (rawServices !== undefined) {
      if (Array.isArray(rawServices)) {
        provider.services = rawServices.map(s =>
          typeof s === 'string'
            ? { name: s, category: s, price: 0, priceUnit: 'hour' }
            : {
                name:        s.name        || '',
                category:    s.category    || s.name || '',
                description: s.description || '',
                price:       Number(s.price)    || 0,   // ← price saved correctly
                priceUnit:   s.priceUnit   || 'hour',
              }
        );
      } else if (typeof rawServices === 'string' && rawServices.trim()) {
        // plain comma string fallback
        provider.services = rawServices
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => ({ name: s, category: s, price: 0, priceUnit: 'hour' }));
      }
    }

    // ── Profile image ──
    if (req.file) provider.profileImage = '/uploads/' + req.file.filename;

    await provider.save();
    res.json({ success: true, data: provider, provider });
  } catch (err) { next(err); }
};