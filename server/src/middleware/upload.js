const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if environment variables are provided
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Local storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `item-${uniqueSuffix}${ext}`);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (.jpg, .jpeg, .png, .webp) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

// Helper to process uploaded file (either local URL or Cloudinary URL)
const processUploadedFile = async (req, file) => {
  if (!file) return null;

  // If Cloudinary credentials are set up, upload to Cloudinary
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'sst_lost_found',
        transformation: [{ width: 1200, crop: 'limit' }, { quality: 'auto' }],
      });
      // Remove temporary local file
      fs.unlink(file.path, () => {});
      return { url: result.secure_url, publicId: result.public_id };
    } catch (err) {
      console.error('[Cloudinary] Upload failed, falling back to local file:', err.message);
    }
  }

  // Fallback: Local file path served via Express static
  const port = process.env.PORT || 5001;
  const baseUrl = `${req.protocol}://${req.get('host') || `localhost:${port}`}`;
  return {
    url: `${baseUrl}/uploads/${file.filename}`,
    publicId: file.filename,
  };
};

module.exports = { upload, processUploadedFile };
