const Provider = require('../models/Provider');
const Review   = require('../models/Review');
const axios    = require('axios');
const { haversine } = require('../utils/haversine');

// ── Register Provider ────────────────────────────────────────
exports.registerProvider = async (req, res, next) => {
  try {

    const existing = await Provider.findOne({ user: req.user._id });

    // If provider exists and NOT rejected → block registration
    if (existing && existing.verificationStatus !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Provider profile already exists and is under review or verified"
      });
    }

    // If provider was rejected → delete old record and allow new registration
    if (existing && existing.verificationStatus === "rejected") {
      await Provider.deleteOne({ _id: existing._id });
    }

    const { name, phone, services, description, city, state, address, hourlyRate, experience } = req.body;

    if (!req.files?.liveImage || !req.files?.idProofImage)
      return res.status(400).json({ success: false, message: 'Live image and ID proof are required' });

    const liveImage    = req.files.liveImage[0].path;
    const idProofImage = req.files.idProofImage[0].path;

    // Auto-geocode via OpenStreetMap Nominatim
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
      } catch (_) { /* geocoding is optional */ }
    }

    const parsedServices = Array.isArray(services)
      ? services
      : services?.split(',').map(s => s.trim()).filter(Boolean) || [];

    const provider = await Provider.create({
      user: req.user._id,
      name, phone,
      email: req.user.email,
      services: parsedServices.map(s => (typeof s === 'string' ? { name: s, category: s, price: 0 } : s)),
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

    if (city)     query['location.city'] = new RegExp(city, 'i');
    if (service)  query['services.name'] = new RegExp(service, 'i');
    if (category) query['services.category'] = new RegExp(category, 'i');
    if (search)   query.$or = [
      { name: new RegExp(search, 'i') },
      { 'services.name': new RegExp(search, 'i') },
      { 'services.category': new RegExp(search, 'i') },
    ];
    if (minRating) query.rating = { $gte: Number(minRating) };
    if (available === 'true') query['availability.isAvailable'] = true;

    let providers = await Provider.find(query)
      .populate('user', 'name email phone')
      .select('-idProofImage -liveImage');

    // Sort by distance if coordinates provided
    if (lat && lng) {
      providers = providers.map(p => ({
        ...p.toObject(),
        distance: (p.latitude && p.longitude)
          ? haversine(parseFloat(lat), parseFloat(lng), p.latitude, p.longitude)
          : 99999,
      })).sort((a, b) => a.distance - b.distance);
    }

    // Premium providers first
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

    const allowed = ['name', 'phone', 'bio', 'description', 'services', 'location', 'hourlyRate', 'experience', 'availability'];
    allowed.forEach(f => { if (req.body[f] !== undefined) provider[f] = req.body[f]; });

    if (req.file) provider.profileImage = '/uploads/' + req.file.filename;

    await provider.save();
    res.json({ success: true, data: provider, provider });
  } catch (err) { next(err); }
};