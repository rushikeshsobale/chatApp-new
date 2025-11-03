import React, { useState, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import { FaCamera, FaVideo, FaTimes, FaPlusCircle, FaArrowRight, FaCompress } from 'react-icons/fa';
import { motion } from 'framer-motion';
// Assuming this utility is available and works as intended
// import { compressImage } from '../utils/imageCompression'; 

// Placeholder for compressImage if you don't have the actual utility in this environment
const compressImage = (file) => new Promise(resolve => resolve(file)); 

// --- Component Start ---

const CreateStory = ({ show, onHide, onCreateStory, userData }) => {
    const [media, setMedia] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [caption, setCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);

    // Clean up object URLs when they are no longer needed
    const cleanupPreviewUrl = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    }, [previewUrl]);

    const resetForm = useCallback(() => {
        cleanupPreviewUrl();
        setMedia(null);
        setMediaType(null);
        setCaption('');
        setPreviewUrl(null);
        onHide();
    }, [onHide, cleanupPreviewUrl]);

    const handleMediaSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            cleanupPreviewUrl(); // Cleanup previous URL before setting a new one
            setIsCompressing(true);
            
            try {
                let processedFile = file;
                const newMediaType = file.type.startsWith('image/') ? 'image' : 'video';
                
                // Compress if it's an image
                if (newMediaType === 'image') {
                    processedFile = await compressImage(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true
                    });
                }
                
                setMedia(processedFile);
                setMediaType(newMediaType);
                setPreviewUrl(URL.createObjectURL(processedFile));
            } catch (error) {
                console.error('Error processing media:', error);
                // Fallback to original file if compression fails
                setMedia(file);
                setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                setPreviewUrl(URL.createObjectURL(file));
            } finally {
                setIsCompressing(false);
                // Reset file input value to allow selecting the same file again
                e.target.value = null; 
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault(); // Good practice, though not strictly needed without a <form>
        if (media && !isCompressing) {
            onCreateStory({
                media,
                mediaType,
                caption
            });
            resetForm();
        }
    };
    
    // Framer motion variants for the media upload area
    const uploadVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    };

    const mediaIcon = useMemo(() => mediaType === 'image' ? <FaCamera size={18} /> : <FaVideo size={18} />, [mediaType]);

    return (
        <Modal
            show={show}
            onHide={resetForm}
            centered
            size="md" // Smaller size for a modern, focused look
            className="create-story-modal-genz"
        >
            <Modal.Header closeButton className="border-0 p-3 pb-0">
                <Modal.Title className="fw-bold fs-6">
                    <span className="text-primary me-1"><FaPlusCircle /></span> 
                    New Story
                </Modal.Title>
            </Modal.Header>
            
            {/* The main content area is wrapped in a 'form' only for the onSubmit handler for accessibility, but no default submission is allowed. */}
            <form onSubmit={handleSubmit}>
                <Modal.Body className="p-3 pt-2">
                    <div className="row g-2"> {/* Tighter gutters for mobile */}
                        {/* Left side - Media Preview */}
                        <div className={`col-12 ${previewUrl ? 'col-md-7' : 'col-md-12'}`}>
                            <div 
                                className="media-preview-container-genz"
                                // Reduced height for mobile/short content vibe
                                style={{ height: previewUrl ? '200px' : '200px', position: 'relative' }} 
                            >
                                {!previewUrl ? (
                                    <motion.div 
                                        className="media-upload-area-genz p-4"
                                        initial="hidden"
                                        animate="visible"
                                        variants={uploadVariants}
                                        onClick={() => document.getElementById('media-input-genz').click()}
                                    >
                                        <div className="upload-icon-container-genz mb-2">
                                            <FaCamera size={24} className="text-white" />
                                            <FaVideo size={24} className="text-white ms-2" />
                                        </div>
                                        <h6 className="text-white mb-1">Tap to Share Life</h6>
                                        <p className="text-light small mb-3">
                                            Photo/Video 🤳 (24h vibe)
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-light btn-sm rounded-pill px-3"
                                            disabled={isCompressing}
                                        >
                                            {isCompressing ? <><FaCompress className="me-1"/> Processing...</> : 'Select Media'}
                                        </button>
                                        <input
                                            id="media-input-genz"
                                            type="file"
                                            className="d-none"
                                            accept="image/*,video/*"
                                            onChange={handleMediaSelect}
                                            disabled={isCompressing}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        {mediaType === 'image' ? (
                                            <img src={previewUrl} alt="Preview" className="media-preview-content" />
                                        ) : (
                                            <video src={previewUrl} controls className="media-preview-content" />
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 m-2 shadow-sm"
                                            onClick={() => { setMedia(null); setMediaType(null); setPreviewUrl(null); cleanupPreviewUrl(); }}
                                            disabled={isCompressing}
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Right side - Caption and Controls (Conditionally show controls side-by-side on larger screens) */}
                        {previewUrl && (
                             <motion.div 
                                className="col-12 col-md-5"
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                             >
                                <div className="p-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <img
                                            src={userData?.profilePicture || "https://via.placeholder.com/40"}
                                            alt="Profile"
                                            className="rounded-circle me-2"
                                            style={{ width: '30px', height: '30px', objectFit: 'cover', border: '2px solid var(--bs-primary)' }}
                                        />
                                        <div>
                                            <h6 className="mb-0 small fw-bold">{userData?.userName || 'Your Name'}</h6>
                                            <small className="text-muted" style={{fontSize: '0.7rem'}}>Adding {mediaIcon}</small>
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label fs-9 small">Caption (optional)</label>
                                        <textarea
                                            className="form-control"
                                            rows="2" // Smaller rows for short content
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            placeholder="Say something cool..."
                                            disabled={isCompressing}
                                            style={{
                                                borderRadius: '10px',
                                                border: '2px solid #ddd',
                                                padding: '6px',
                                                fontSize: '0.85rem', // Smaller text on mobile
                                                resize: 'none',
                                            }}
                                        />
                                    </div>

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit" // Set to submit to trigger form handler
                                            className="btn btn-primary btn-sm fw-bold"
                                            disabled={!media || isCompressing}
                                            style={{ borderRadius: '8px', padding: '6px', fontSize: '0.8rem' }}
                                        >
                                            {isCompressing ? 'Processing...' : <>Share Vibe <FaArrowRight className="ms-1"/></>}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={resetForm}
                                            disabled={isCompressing}
                                            style={{ borderRadius: '8px', padding: '6px', fontSize: '0.8rem' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </Modal.Body>
            </form>

            {/* Gen Z-inspired Styling */}
            <style jsx>{`
                .create-story-modal-genz .modal-content {
                
                    border: none;
                    overflow: hidden;
                }
                .create-story-modal-genz .modal-body {
                    padding: 10px;
                }
                .media-preview-container-genz {
                   
                    background: #20232a; /* Darker background for contrast */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }
                .media-upload-area-genz {
                    text-align: center;
                    cursor: pointer;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(45deg, #4f46e5, #8b5cf6); /* Vibrant gradient */
                    transition: transform 0.2s;
                }
                .media-upload-area-genz:hover {
                    transform: scale(1.02);
                }
                .upload-icon-container-genz {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 60px; /* Smaller icon container */
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(5px);
                }
                .media-preview-content {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; /* Changed to cover for a fuller look */
                    display: block;
                }
            `}</style>
        </Modal>
    );
};

export default CreateStory;