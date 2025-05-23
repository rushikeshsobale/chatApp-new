import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaCamera, FaVideo, FaTimes, FaSmile } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { compressImage } from '../utils/imageCompression';

const CreateStory = ({ show, onHide, onCreateStory, userData }) => {
    const [media, setMedia] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [caption, setCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const handleMediaSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsCompressing(true);
            try {
                let processedFile = file;
                
                // Compress if it's an image
                if (file.type.startsWith('image/')) {
                    processedFile = await compressImage(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true
                    });
                }

                setMedia(processedFile);
                setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                setPreviewUrl(URL.createObjectURL(processedFile));
            } catch (error) {
                console.error('Error processing media:', error);
                // Fallback to original file if compression fails
                setMedia(file);
                setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                setPreviewUrl(URL.createObjectURL(file));
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (media) {
            onCreateStory({
                media,
                mediaType,
                caption
            });
            resetForm();
        }
    };

    const resetForm = () => {
        setMedia(null);
        setMediaType(null);
        setCaption('');
        setPreviewUrl(null);
        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={resetForm}
            centered
            size="lg"
            className="create-story-modal"
        >
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold">Create Story</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="row g-0">
                    {/* Left side - Media Preview */}
                    <div className="col-md-8">
                        <div 
                            className="media-preview-container"
                            style={{
                                height: '500px',
                                background: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}
                        >
                            {!previewUrl ? (
                                <div
                                    className="media-upload-area"
                                    style={{
                                        textAlign: 'center',
                                        padding: '40px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => document.getElementById('media-input').click()}
                                >
                                    <div className="mb-4">
                                        <div className="upload-icon-container mb-3">
                                            <FaCamera size={32} className="text-primary" />
                                            <FaVideo size={32} className="text-primary ms-2" />
                                        </div>
                                        <h5 className="text-dark mb-2">Create a Story</h5>
                                        <p className="text-muted mb-0">
                                            Share photos and videos that will disappear after 24 hours
                                        </p>
                                    </div>
                                    <button
                                        className="btn btn-primary rounded-pill px-4"
                                        onClick={() => document.getElementById('media-input').click()}
                                        disabled={isCompressing}
                                    >
                                        {isCompressing ? 'Processing...' : 'Select Media'}
                                    </button>
                                    <input
                                        id="media-input"
                                        type="file"
                                        className="d-none"
                                        accept="image/*,video/*"
                                        onChange={handleMediaSelect}
                                        disabled={isCompressing}
                                    />
                                </div>
                            ) : (
                                <>
                                    {mediaType === 'image' ? (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <video
                                            src={previewUrl}
                                            controls
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%'
                                            }}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3"
                                        onClick={() => {
                                            setMedia(null);
                                            setMediaType(null);
                                            setPreviewUrl(null);
                                        }}
                                        disabled={isCompressing}
                                    >
                                        <FaTimes />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right side - Caption and Controls */}
                    <div className="col-md-4">
                        <div className="p-4">
                            <div className="d-flex align-items-center mb-4">
                                <img
                                    src={userData?.profilePicture || "https://via.placeholder.com/40"}
                                    alt="Profile"
                                    className="rounded-circle me-3"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                />
                                <div>
                                    <h6 className="mb-0">{userData?.userName}</h6>
                                    <small className="text-muted">Your Story</small>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">Add to your story</label>
                                <div className="input-group">
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Write a caption..."
                                        style={{
                                            borderRadius: '10px',
                                            border: '1px solid #e0e0e0',
                                            padding: '12px',
                                            fontSize: '0.95rem',
                                            resize: 'none'
                                        }}
                                        disabled={isCompressing}
                                    />
                                    <button className="btn btn-outline-secondary" disabled={isCompressing}>
                                        <FaSmile />
                                    </button>
                                </div>
                            </div>

                            <div className="d-grid gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={!media || isCompressing}
                                    style={{
                                        borderRadius: '8px',
                                        padding: '10px',
                                        fontSize: '1rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    {isCompressing ? 'Processing...' : 'Share Story'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-light"
                                    onClick={resetForm}
                                    disabled={isCompressing}
                                    style={{
                                        borderRadius: '8px',
                                        padding: '10px',
                                        fontSize: '1rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <style jsx>{`
                .create-story-modal .modal-content {
                    border-radius: 15px;
                    border: none;
                    overflow: hidden;
                }
                .create-story-modal .modal-header {
                    padding: 1.5rem 1.5rem 0.5rem;
                }
                .upload-icon-container {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(13, 110, 253, 0.1);
                }
                .media-upload-area:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }
            `}</style>
        </Modal>
    );
};

export default CreateStory;