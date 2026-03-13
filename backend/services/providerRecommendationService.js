'use strict';
// backend/services/providerRecommendationService.js
//
// Queries the existing Provider/User model to surface nearby, relevant
// service providers after an image analysis. Adapts gracefully when the
// Provider model does not exist or has a different schema.

const mongoose = require('mongoose');

/* ── Category → keyword mappings for Provider service field matching ─ */
const CATEGORY_KEYWORDS = {
  ac_repair:       ['ac', 'air conditioner', 'hvac', 'cooling', 'split ac'],
  plumbing:        ['plumber', 'plumbing', 'pipe', 'drain', 'water'],
  electrical:      ['electrician', 'electrical', 'wiring', 'power'],
  car_repair:      ['car', 'vehicle', 'automobile', 'mechanic', 'auto'],
  washing_machine: ['washing machine', 'washer', 'laundry', 'appliance'],
  mobile_repair:   ['mobile', 'phone', 'smartphone', 'screen', 'battery'],
  carpentry:       ['carpenter', 'wood', 'furniture', 'door'],
  cleaning:        ['cleaning', 'cleaner', 'housekeeping', 'maid'],
  general:         [],
};

/* ─────────────────────────────────────────────────────────────────────
   getProviderModel — lazy-loads Provider model; handles missing model
───────────────────────────────────────────────────────────────────── */
function getProviderModel() {
  // Many booking platforms store providers in 'User' with role:'provider'
  // or in a dedicated 'Provider' model. We try both.
  if (mongoose.models.Provider) return mongoose.model('Provider');
  if (mongoose.models.User)     return mongoose.model('User');
  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   getRecommendedProviders
   @param {string} category  — from imageAnalysis.category
   @param {string} [city]    — optional city string from user profile
   @param {number} [limit=4]
   @returns {Array}          — provider objects safe to send to frontend
───────────────────────────────────────────────────────────────────── */
async function getRecommendedProviders(category, city = '', limit = 4) {
  try {
    const Model = getProviderModel();
    if (!Model) return [];

    const keywords = CATEGORY_KEYWORDS[category] || [];

    // Build a flexible query that works with both Provider and User models
    const query = { $or: [] };

    // Role-based filter (User model)
    query.$or.push({ role: 'provider' });
    // Dedicated Provider model — no role field needed; match isApproved
    query.$or.push({ isApproved: true });

    // Keyword match against common service description fields
    if (keywords.length) {
      const keywordRegex = new RegExp(keywords.join('|'), 'i');
      query.$and = [
        {
          $or: [
            { serviceCategory: keywordRegex },
            { services:        keywordRegex },
            { 'service.name':  keywordRegex },
            { specialization:  keywordRegex },
            { description:     keywordRegex },
          ],
        },
      ];
    }

    // Optional city filter
    if (city) {
      const cityRegex = new RegExp(city, 'i');
      (query.$and = query.$and || []).push({
        $or: [
          { city: cityRegex },
          { 'address.city': cityRegex },
          { location: cityRegex },
        ],
      });
    }

    // If $or is empty it will break the query; remove it
    if (!query.$or.length) delete query.$or;

    const providers = await Model
      .find(query)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .select('name profileImage avatar photo serviceCategory services rating reviewCount priceRange city address isAvailable')
      .lean();

    // Normalise to a consistent shape regardless of model schema
    return providers.map(p => ({
      id:          p._id,
      name:        p.name || 'Service Provider',
      avatar:      p.profileImage || p.avatar || p.photo || null,
      category:    p.serviceCategory || category,
      rating:      p.rating || 0,
      reviewCount: p.reviewCount || 0,
      priceRange:  p.priceRange || null,
      city:        p.city || p.address?.city || city || '',
      isAvailable: p.isAvailable !== false, // default true
    }));
  } catch (err) {
    console.error('[ProviderRecommendation] query failed:', err.message);
    return [];
  }
}

module.exports = { getRecommendedProviders };