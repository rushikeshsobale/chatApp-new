const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Story = require('../Modules/Story');
const verifyToken = require('./verifyToken');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const Muser = require("../Modules/Muser.js");
// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 50 * 1024 * 1024, // 5MB limit for stories
        files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'));
        }
    }
});

// Helper function to compress video
const compressVideo = async (inputBuffer) => {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.mp4`);

    // Write input buffer to temp file
    await fs.promises.writeFile(inputPath, inputBuffer);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264', // Use H.264 codec
                '-crf 28', // Constant Rate Factor (lower = better quality, 28 is a good balance)
                '-preset medium', // Encoding preset
                '-c:a aac', // Audio codec
                '-b:a 128k', // Audio bitrate
                '-vf scale=1080:1920:force_original_aspect_ratio=decrease', // Resize to story dimensions
                '-pix_fmt yuv420p' // Pixel format for better compatibility
            ])
            .output(outputPath)
            .on('end', async () => {
                try {
                    const compressedBuffer = await fs.promises.readFile(outputPath);
                    // Clean up temp files
                    await fs.promises.unlink(inputPath);
                    await fs.promises.unlink(outputPath);
                    resolve(compressedBuffer);
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (err) => {
                // Clean up temp files
                fs.unlink(inputPath, () => {});
                fs.unlink(outputPath, () => {});
                reject(err);
            })
            .run();
    });
};

// Middleware to compress media before upload
const compressMedia = async (req, res, next) => {
    if (!req.file) return next();
    
    try {
        if (req.file.mimetype.startsWith('image/')) {
            const compressedBuffer = await sharp(req.file.buffer)
                .resize(1080, 1920, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toBuffer();
            
            req.file.buffer = compressedBuffer;
            req.file.size = compressedBuffer.length;
        } else if (req.file.mimetype.startsWith('video/')) {
            const compressedBuffer = await compressVideo(req.file.buffer);
            req.file.buffer = compressedBuffer;
            req.file.size = compressedBuffer.length;
        }
    } catch (error) {
        console.error('Error compressing media:', error);
    }
    next();
};

// Create a new story
router.post('/create', verifyToken, upload.single('media'), compressMedia, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const { caption } = req.body;
        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';

        // Upload to S3
        const uploadResult = await uploadToS3(req.file, {
            folder: 'stories',
            checkDuplicate: false
        });

        const story = new Story({
            userId: req.decoded.userId,
            media: uploadResult.url,
            mediaType,
            caption
        });

        await story.save();
        res.status(201).json({ success: true, story });
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all stories for a user
router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const stories = await Story.find({ userId: req.params.userId })
            .populate('userId', 'userName profilePicture')
            .sort({ createdAt: -1 });
        res.json({ success: true, stories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all stories for the feed (stories from users the current user follows)
router.get('/feed', verifyToken, async (req, res) => {
    try {
        const user = await Muser.findById(req.decoded.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get stories from user's following and their own stories
        const stories = await Story.find({
            userId: { $in: [...user.following, req.decoded.userId] },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
        .populate({
            path: 'userId',
            select: 'userName profilePicture',
            model: 'Muser'
        })
        .sort({ createdAt: -1 });

        res.json({ success: true, stories });
    } catch (error) {
        console.error('Error fetching stories feed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark a story as viewed
router.post('/view/:storyId', verifyToken, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) {
            return res.status(404).json({ success: false, error: 'Story not found' });
        }

        if (!story.viewers.includes(req.decoded.userId)) {
            story.viewers.push(req.decoded.userId);
            await story.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a story
router.delete('/:storyId', verifyToken, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) {
            return res.status(404).json({ success: false, error: 'Story not found' });
        }

        if (story.userId.toString() !== req.decoded.userId.toString()) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // Delete from S3
        await deleteFromS3(story.media);
        
        await story.remove();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 