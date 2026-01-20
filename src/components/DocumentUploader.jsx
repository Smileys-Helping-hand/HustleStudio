import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiFile, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import PropTypes from 'prop-types';

const DocumentUploader = ({ 
  onUploadComplete, 
  acceptedTypes = 'image/*,application/pdf,.txt',
  maxSizeMB = 10,
  multiple = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const acceptedTypesArray = acceptedTypes.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const fileType = file.type;

    const isAccepted = acceptedTypesArray.some(acceptedType => {
      if (acceptedType.includes('*')) {
        // Handle wildcards like image/*
        const category = acceptedType.split('/')[0];
        return fileType.startsWith(category);
      }
      if (acceptedType.startsWith('.')) {
        // Handle extensions like .pdf
        return fileExtension === acceptedType.toLowerCase();
      }
      // Handle mime types like application/pdf
      return fileType === acceptedType;
    });

    if (!isAccepted) {
      return `File type not supported. Accepted: ${acceptedTypes}`;
    }

    return null;
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [multiple]);

  const handleFileInput = useCallback((e) => {
    setError(null);
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, [multiple]);

  const handleFiles = (files) => {
    if (!multiple && files.length > 1) {
      setError('Please upload only one file at a time');
      return;
    }

    const validatedFiles = [];
    const errors = [];

    files.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validatedFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
      return;
    }

    setSelectedFiles(validatedFiles);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUploadComplete(multiple ? selectedFiles : selectedFiles[0]);
      setSelectedFiles([]);
    } catch (err) {
      console.error('[DocumentUploader] Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-gold bg-gold/10 scale-[1.02]'
            : 'border-white/20 bg-black/20 hover:border-white/30 hover:bg-black/30'
        }`}
      >
        <input
          type="file"
          onChange={handleFileInput}
          accept={acceptedTypes}
          multiple={multiple}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center py-12 px-6">
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <FiUpload className={`w-12 h-12 mb-4 transition-colors ${
              isDragging ? 'text-gold' : 'text-white/40'
            }`} />
          </motion.div>

          <p className="text-lg font-medium text-white mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-white/50 mb-4">or click to browse</p>
          
          <div className="flex flex-wrap gap-2 justify-center text-xs text-white/40">
            <span>Max size: {maxSizeMB}MB</span>
            <span>•</span>
            <span>{multiple ? 'Multiple files' : 'Single file'}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Files List */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium text-white/70">
              Selected Files ({selectedFiles.length})
            </p>
            
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5">
                    <FiFile className="w-5 h-5 text-white/60" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-white/50">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="text-white/40 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-orange-400 px-6 py-3 font-medium text-black transition-all hover:shadow-lg hover:shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-5 h-5" />
                  <span>Upload & Extract Data</span>
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

DocumentUploader.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  acceptedTypes: PropTypes.string,
  maxSizeMB: PropTypes.number,
  multiple: PropTypes.bool,
};

export default DocumentUploader;
