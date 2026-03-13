'use strict';
// backend/services/youtubeService.js

const axios = require('axios');

const YT_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

async function searchVideos(query, maxResults = 3) {
  // ✅ Read key here (inside function), NOT at module level.
  // Module-level read happens before dotenv.config() runs = always undefined.
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YT_API_KEY) {
    console.warn('[YouTube] YOUTUBE_API_KEY not set — returning empty results');
    return [];
  }

  if (!query) return [];

  try {
    const { data } = await axios.get(YT_BASE_URL, {
      params: {
        key:               YT_API_KEY,
        q:                 `${query} tutorial repair fix how to`,
        part:              'snippet',
        type:              'video',
        maxResults,
        relevanceLanguage: 'en',
        safeSearch:        'strict',
        videoDuration:     'medium', // 4–20 min tutorials
      },
      timeout: 5000,
    });

    return (data.items || []).map(item => ({
      videoId:      item.id.videoId,
      title:        item.snippet.title,
      thumbnail:    item.snippet.thumbnails?.medium?.url || '',
      channelTitle: item.snippet.channelTitle,
      url:          `https://www.youtube.com/watch?v=${item.id.videoId}`,
      embedUrl:     `https://www.youtube.com/embed/${item.id.videoId}?rel=0&modestbranding=1`,
    }));
  } catch (err) {
    console.error('[YouTube] search failed:', err.message);
    return [];
  }
}

module.exports = { searchVideos };