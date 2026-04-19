/**
 * Cloudinary Service
 * Handles image upload, transformation, and deletion
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with env credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a single image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer from multer
 * @param {string} folder - Cloudinary folder path
 * @param {object} options - Additional Cloudinary options
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadImage(buffer, folder = 'travel-superapp/properties', options = {}) {
  const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Cloudinary upload timed out after 45s')), 45000);

    // No transformation params — keeps the signature simple and valid
    cloudinary.uploader.upload(
      base64,
      {
        folder,
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        clearTimeout(timer);
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
  });
}

/**
 * Upload multiple images in parallel
 * @param {Array<{buffer: Buffer, isPrimary: boolean}>} files
 * @param {string} folder
 * @returns {Promise<Array>}
 */
async function uploadMultipleImages(files, folder = 'travel-superapp/properties') {
  // Upload sequentially — parallel uploads compete for bandwidth on slow connections
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadImage(file.buffer, folder);
    results.push({
      ...result,
      isPrimary: i === 0,
      caption: file.originalname || '',
    });
  }
  return results;
}

/**
 * Delete an image from Cloudinary by public_id
 * @param {string} publicId
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Generate a thumbnail URL from an existing Cloudinary URL
 * @param {string} url - Original Cloudinary URL
 * @param {number} width
 * @param {number} height
 */
function getThumbnailUrl(url, width = 400, height = 300) {
  if (!url || !url.includes('cloudinary.com')) return url;

  // Insert transformation into the URL
  return url.replace(
    '/upload/',
    `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`
  );
}

module.exports = { uploadImage, uploadMultipleImages, deleteImage, getThumbnailUrl };
