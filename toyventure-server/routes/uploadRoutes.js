// toyventure-server/routes/uploadRoutes.js
const path = require('path');
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage for direct upload stream to Cloudinary
const storage = multer.memoryStorage();

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp|svg|gif|mp4|webm|mkv|mov|avi/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/|video\//.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images and Videos only! Allowed formats: JPG, PNG, WEBP, SVG, GIF, MP4, WEBM, MKV, MOV, AVI'));
    }
}

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// FIX: Removed 'admin' middleware so regular users can upload images for returns
router.post('/', protect, upload.array('images', 7), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No media uploaded' });
    }

    try {
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const isVideo = file.mimetype.startsWith('video/');
                
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: isVideo ? 'video' : 'image',
                        folder: 'toyventure_assets'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );

                Readable.from(file.buffer).pipe(uploadStream);
            });
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        res.json(uploadedUrls);
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({ message: 'Error uploading media to Cloudinary' });
    }
});

module.exports = router;