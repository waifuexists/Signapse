'use client'

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

type FileType = 'video' | 'document' | 'audio' | null;

export default function Upload() {
  const [selectedType, setSelectedType] = useState<FileType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    
    // Validate file type based on selected type
    let validTypes: string[] = [];
    let maxSize = 0;
    
    switch (selectedType) {
      case 'video':
        validTypes = ['video/mp4', 'video/quicktime'];
        maxSize = 100 * 1024 * 1024; // 100MB for video
        break;
      case 'document':
        validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        maxSize = 10 * 1024 * 1024; // 10MB for documents
        break;
      case 'audio':
        validTypes = ['audio/mpeg', 'audio/wav'];
        maxSize = 15 * 1024 * 1024; // 15MB for audio
        break;
    }

    if (!validTypes.includes(uploadedFile.type)) {
      setError(`Please upload a valid ${selectedType} file`);
      return;
    }

    if (uploadedFile.size > maxSize) {
      setError(`File size should be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setFile(uploadedFile);
    setError('');
    setUploadSuccess(false);
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: selectedType === 'video' 
      ? { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'] }
      : selectedType === 'document'
      ? { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
      : selectedType === 'audio'
      ? { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'] }
      : undefined,
    maxFiles: 1,
    disabled: !selectedType || isUploading
  });

  const handleUpload = async () => {
    if (!file || !selectedType) return;

    try {
      setIsUploading(true);
      setError('');
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', selectedType);

      // Show initial progress
      setUploadProgress(20);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Show progress during server processing
      setUploadProgress(60);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Show completion progress
      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ rotate: 20 }}
                className="bg-[#A78BFA] p-2 rounded-xl"
              >
                <Image 
                  src="/images/hand-icon.svg"
                  alt="Hand Icon" 
                  width={32} 
                  height={32}
                  className="brightness-0 invert"
                />
              </motion.div>
              <span className="ml-2 text-xl font-bold text-gray-900">Signapse</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Upload</h1>
          
          {/* Step 1: File Type Selection */}
          <div className="mb-8">
            <h2 className="text-xl text-gray-700 mb-4">1. Select type of file you are uploading:</h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedType('video');
                  setFile(null);
                  setError('');
                  setUploadSuccess(false);
                }}
                disabled={isUploading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
                  isUploading ? 'opacity-50 cursor-not-allowed' :
                  selectedType === 'video'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]'
                    : 'border-gray-200 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video
              </button>
              
              <button
                onClick={() => {
                  setSelectedType('document');
                  setFile(null);
                  setError('');
                  setUploadSuccess(false);
                }}
                disabled={isUploading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
                  isUploading ? 'opacity-50 cursor-not-allowed' :
                  selectedType === 'document'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]'
                    : 'border-gray-200 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document
              </button>
              
              <button
                onClick={() => {
                  setSelectedType('audio');
                  setFile(null);
                  setError('');
                  setUploadSuccess(false);
                }}
                disabled={isUploading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
                  isUploading ? 'opacity-50 cursor-not-allowed' :
                  selectedType === 'audio'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]'
                    : 'border-gray-200 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                Audio
              </button>
            </div>
          </div>

          {/* Step 2: File Upload */}
          {selectedType && (
            <div>
              <h2 className="text-xl text-gray-700 mb-4">2. Upload your {selectedType} here</h2>
              <p className="text-gray-600 mb-4">
                You can upload your {selectedType} file here
                {selectedType === 'video' && ' and subtitle files on the next stage'}.
              </p>
              
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed ${
                  isUploading ? 'border-gray-300 bg-gray-50' :
                  isDragActive ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-gray-300'
                } rounded-lg p-12 cursor-pointer transition-colors ${
                  isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    {uploadSuccess ? (
                      <div className="flex items-center gap-2 text-green-500">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : file ? (
                      <div className="flex items-center gap-2 text-[#8B5CF6]">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                  <div className="text-gray-600">
                    {uploadSuccess ? (
                      <p className="text-green-500 font-medium">Upload successful!</p>
                    ) : file ? (
                      <>
                        <p className="text-[#8B5CF6] font-medium">{file.name}</p>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                            <div 
                              className="h-full bg-[#8B5CF6] rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}
                        <button 
                          onClick={handleUpload}
                          disabled={isUploading}
                          className={`mt-4 px-6 py-2 bg-[#8B5CF6] text-white rounded-lg transition-colors ${
                            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]'
                          }`}
                        >
                          {isUploading ? 'Uploading...' : 'Start Translation'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">
                          {isDragActive
                            ? `Drop your ${selectedType} here`
                            : `Drag your ${selectedType} here to import`}
                        </p>
                        <button 
                          className={`mt-4 px-6 py-2 bg-[#8B5CF6] text-white rounded-lg transition-colors ${
                            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]'
                          }`}
                          disabled={isUploading}
                        >
                          + Choose a {selectedType}
                        </button>
                      </>
                    )}
                    {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
                    <p className="mt-4 text-sm text-gray-500">
                      {selectedType === 'video' && 'Supported formats: MP4, MOV'}
                      {selectedType === 'document' && 'Supported formats: PDF, DOC, DOCX'}
                      {selectedType === 'audio' && 'Supported formats: MP3, WAV'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 