const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const auth = require('../middleware/auth');

const router = express.Router();

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

let storage;
let upload;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'dreambuild',
      allowedFormats: ['jpg', 'png', 'jpeg', 'gif', 'pdf', 'docx'],
    },
  });
} else {
  // Use local storage as fallback
  console.log('Cloudinary not configured, using local storage');

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload image
router.post('/image', auth, (req, res) => {
  const uploadHandler = upload.single('image');

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        message: 'Upload failed',
        error: err.message
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      let url;
      if (isCloudinaryConfigured) {
        url = req.file.path; // Cloudinary URL
      } else {
        // Local file URL
        url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      }

      console.log('Successfully uploaded single image');
      res.json({ url });
    } catch (err) {
      console.error('Upload processing failed:', err);
      res.status(500).json({ message: 'Upload processing failed', error: err.message });
    }
  });
});

// Upload multiple images
router.post('/images', auth, (req, res) => {
  console.log('🔄 Received image upload request');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Authorization:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('User ID:', req.user?.id);

  const uploadHandler = upload.array('images', 10);

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      console.error('Error details:', err.message);
      return res.status(400).json({
        message: 'Upload failed',
        error: err.message
      });
    }

    try {
      console.log('📁 Files received:', req.files ? req.files.length : 0);

      if (!req.files || req.files.length === 0) {
        console.log('⚠️ No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Log file details
      req.files.forEach((file, index) => {
        console.log(`📄 File ${index + 1}:`, {
          originalname: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });
      });

      const urls = req.files.map(file => {
        if (isCloudinaryConfigured) {
          console.log('☁️ Using Cloudinary URL:', file.path);
          return file.path; // Cloudinary URL
        } else {
          // Use relative URL that works in both development and production
          const localUrl = `/uploads/${file.filename}`;
          console.log('💾 Using local URL:', localUrl);
          return localUrl;
        }
      });

      console.log(`✅ Successfully uploaded ${urls.length} images:`, urls);
      res.json({ urls });
    } catch (err) {
      console.error('❌ Upload processing failed:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ message: 'Upload processing failed', error: err.message });
    }
  });
});

// Upload document
router.post('/document', auth, upload.single('document'), (req, res) => {
  try {
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;