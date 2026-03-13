const Provider  = require('../models/Provider');
const Review    = require('../models/Review');
const User      = require('../models/User');
const axios     = require('axios');
const { haversine } = require('../utils/haversine');

// ─────────────────────────────────────────────────────────────
// Helper — safely parse a value that may already be an object
// or a JSON string (FormData sends everything as strings)
// ─────────────────────────────────────────────────────────────
const parseField = (val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try   { return JSON.parse(val); }
    catch { return val; }
  }
  return val;
};

// ─────────────────────────────────────────────────────────────
// Helper — normalise a raw services value into the schema shape
// ─────────────────────────────────────────────────────────────
const normaliseServices = (raw) => {
  if (!raw) return [];

  const parsed = parseField(raw);

  if (typeof parsed === 'string' && parsed.trim()) {
    // plain comma string  →  "Plumber, Electrician"
    return parsed
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ name: s, category: s, description: '', price: 0, priceUnit: 'hour' }));
  }

  if (Array.isArray(parsed)) {
    return parsed.map(s =>
      typeof s === 'string'
        ? { name: s, category: s, description: '', price: 0, priceUnit: 'hour' }
        : {
            name:        s.name        || '',
            category:    s.category    || s.name || '',
            description: s.description || '',
            price:       Number(s.price)   || 0,
            priceUnit:   s.priceUnit   || 'hour',
          }
    );
  }

  return [];
};

// ─────────────────────────────────────────────────────────────
// Helper — geocode a city string via Nominatim
// ─────────────────────────────────────────────────────────────
const geocode = async (city, state = 'India') => {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${city}, ${state}`, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'SmartLocalServices/1.0' },
    });
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (_) { /* geocoding is best-effort */ }
  return { lat: null, lng: null };
};

// ═════════════════════════════════════════════════════════════
// @route   POST /api/providers/register
// @access  Private
// ═════════════════════════════════════════════════════════════
exports.registerProvider = async (req, res, next) => {
  try {
    const existing = await Provider.findOne({ user: req.user._id });

    // Block re-registration unless the previous attempt was rejected
    if (existing && existing.verificationStatus !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Provider profile already exists and is under review or already verified.',
      });
    }

    // Clean up a rejected profile before re-registering
    if (existing?.verificationStatus === 'rejected') {
      await Provider.deleteOne({ _id: existing._id });
    }

    // Validate required file uploads
    if (!req.files?.liveImage || !req.files?.idProofImage) {
      return res.status(400).json({
        success: false,
        message: 'Both a live photo and an ID proof image are required.',
      });
    }

    const {
      name, phone, description,
      city, state, address,
      hourlyRate, experience,
    } = req.body;

    const liveImage    = req.files.liveImage[0].path;
    const idProofImage = req.files.idProofImage[0].path;

    // Geocode the supplied city
    const { lat, lng } = city ? await geocode(city, state) : { lat: null, lng: null };

    // Create provider document
    const provider = await Provider.create({
      user:        req.user._id,
      name,
      phone,
      email:       req.user.email,
      services:    normaliseServices(req.body.services),
      description: description || '',
      location: {
        city:    city    || '',
        state:   state   || '',
        address: address || '',
      },
      latitude:    lat,
      longitude:   lng,
      liveImage,
      idProofImage,
      hourlyRate:  Number(hourlyRate)  || 0,
      experience:  Number(experience)  || 0,
    });

    // ✅ Promote the user's role so auth middleware lets them through
    await User.findByIdAndUpdate(req.user._id, { role: 'provider' });

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. Awaiting admin verification.',
      data:    provider,
    });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════════════════════════
// @route   GET /api/providers
// @access  Public
// ═════════════════════════════════════════════════════════════
exports.getProviders = async (req, res, next) => {
  try {
    const { city, service, category, lat, lng, minRating, available, search } = req.query;

    // Base query — only show active, verified providers
    const query = {
      isVerified:         true,
      verificationStatus: 'verified',
      isActive:           true,
    };

    if (city)      query['location.city']              = new RegExp(city,     'i');
    if (service)   query['services.name']              = new RegExp(service,  'i');
    if (category)  query['services.category']          = new RegExp(category, 'i');
    if (minRating) query.rating                        = { $gte: Number(minRating) };
    if (available === 'true') query['availability.isAvailable'] = true;

    if (search) {
      query.$or = [
        { name:               new RegExp(search, 'i') },
        { 'services.name':    new RegExp(search, 'i') },
        { 'services.category':new RegExp(search, 'i') },
      ];
    }

    let providers = await Provider.find(query)
      .populate('user', 'name email phone')
      .select('-idProofImage -liveImage')
      .lean();

    // ── Distance sort (if coordinates supplied) ──
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      providers = providers
        .map(p => ({
          ...p,
          distance: (p.latitude && p.longitude)
            ? haversine(userLat, userLng, p.latitude, p.longitude)
            : 99999,
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    // ── Premium providers always bubble up ──
    providers.sort((a, b) => {
      if (a.subscription === 'premium' && b.subscription !== 'premium') return -1;
      if (b.subscription === 'premium' && a.subscription !== 'premium') return  1;
      return 0;
    });

    return res.json({
      success:   true,
      count:     providers.length,
      providers,
      data:      providers,
    });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════════════════════════
// @route   GET /api/providers/:id
// @access  Public
// ═════════════════════════════════════════════════════════════
exports.getProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const reviews = await Review.find({ provider: provider._id })
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(20);

    return res.json({ success: true, provider, reviews, data: provider });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════════════════════════
// @route   GET /api/providers/profile
// @access  Private / provider
// ═════════════════════════════════════════════════════════════
exports.getMyProfile = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id })
      .populate('user', 'name email phone');

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    return res.json({ success: true, provider, data: provider });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════════════════════════
// @route   PUT /api/providers/my-profile
// @access  Private / provider
// ═════════════════════════════════════════════════════════════
exports.updateProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // ── Scalar fields ──
    const scalars = ['name', 'phone', 'bio', 'description', 'hourlyRate', 'experience'];
    scalars.forEach(field => {
      if (req.body[field] !== undefined) provider[field] = req.body[field];
    });

    // ── Location ──
    const location = parseField(req.body.location);
    if (location && typeof location === 'object') {
      provider.location = {
        city:    location.city    ?? provider.location?.city    ?? '',
        state:   location.state   ?? provider.location?.state   ?? '',
        address: location.address ?? provider.location?.address ?? '',
        pincode: location.pincode ?? provider.location?.pincode ?? '',
      };

      // Re-geocode if city changed
      if (location.city) {
        const { lat, lng } = await geocode(location.city, location.state);
        if (lat) { provider.latitude  = lat; }
        if (lng) { provider.longitude = lng; }
      }
    }

    // ── Availability ──
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

    // ── Services ──
    const rawServices = parseField(req.body.services);
    if (rawServices !== undefined) {
      provider.services = normaliseServices(rawServices);
    }

    // ── Profile image ──
    if (req.file) {
      provider.profileImage = '/uploads/' + req.file.filename;
    }

    await provider.save();

    return res.json({ success: true, data: provider, provider });
  } catch (err) { next(err); }
};