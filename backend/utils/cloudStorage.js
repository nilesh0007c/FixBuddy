// backend/utils/cloudStorage.js  — Cloudinary integration
// Install: npm install cloudinary
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer   - File buffer from multer memory storage
 * @param {string} folder   - Destination folder (e.g. 'chat', 'profiles')
 * @param {string} type     - 'image' | 'video' | 'raw' (for docs)
 * @returns {Promise<{url, publicId, thumbnailUrl?, duration?}>}
 */
exports.uploadToCloud = (buffer, folder = 'chat', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: resourceType === 'image'
          ? [{ quality: 'auto', fetch_format: 'auto' }]
          : undefined
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url:          result.secure_url,
          publicId:     result.public_id,
          thumbnailUrl: result.resource_type === 'video'
            ? result.secure_url.replace('/upload/', '/upload/so_0,e_thumbnail,w_300/')
            : null,
          duration:     result.duration || null,
          width:        result.width    || null,
          height:       result.height   || null
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
exports.deleteFromCloud = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
