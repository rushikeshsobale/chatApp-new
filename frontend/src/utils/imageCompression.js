export const compressImage = async (file, options = {}) => {
    const defaultOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressedFile = await imageCompression(file, finalOptions);
        
        // Create a new file with the compressed data
        return new File([compressedFile], file.name, {
            type: file.type,
            lastModified: file.lastModified,
        });
    } catch (error) {
        console.error('Error compressing image:', error);
        return file; // Return original file if compression fails
    }
}; 