'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface AnimatedWordProps {
  word: string;
  index: number;
  inView: boolean;
}

// AnimatedWord component for individual word animations
const AnimatedWord = ({ word, index, inView }: AnimatedWordProps) => {
  // First three words are dark, rest are gray
  const isDark = index < 3;
  
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: inView ? 1 : 0, 
        y: inView ? 0 : 20 
      }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.1, // Stagger each word
      }}
      className={`inline-block mr-[0.2em] ${isDark ? 'text-gray-900' : 'text-gray-400'}`}
    >
      {word}
    </motion.span>
  )
}

export default function Home() {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedFileType, setSelectedFileType] = useState('video')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const slides = [
    {
      title: "Indian Sign Language (ISL) Train Announcements",
      description: "Making train travel accessible for the Deaf community",
      image: "/images/slide1.jpg"
    },
    {
      title: "Real-time ISL Translation",
      description: "Instant translation of announcements into ISL",
      image: "/images/slide2.jpg"
    }
  ]

  // Refs for scroll animations
  const signStudioRef = useRef(null)
  const missionRef = useRef(null)
  const transportRef = useRef(null)
  const accessibilityRef = useRef(null)
  const ctaRef = useRef(null)

  // Check if sections are in view
  const isSignStudioVisible = useInView(signStudioRef, { once: true, margin: "-100px" })
  const isMissionVisible = useInView(missionRef, { once: true, margin: "-100px" })
  const isTransportVisible = useInView(transportRef, { once: true, margin: "-100px" })
  const isAccessibilityVisible = useInView(accessibilityRef, { once: true, margin: "-100px" })
  const isCtaVisible = useInView(ctaRef, { once: true, margin: "-100px" })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type based on selectedFileType
    let validTypes: string[] = [];
    let maxSize = 100 * 1024 * 1024; // 100MB default

    switch (selectedFileType) {
      case 'video':
        validTypes = ['video/mp4', 'video/quicktime'];
        break;
      case 'document':
        validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        maxSize = 10 * 1024 * 1024; // 10MB for documents
        break;
      case 'audio':
        validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a'];
        maxSize = 50 * 1024 * 1024; // 50MB for audio
        break;
    }

    if (!validTypes.includes(selectedFile.type)) {
      setError(`Please upload a valid ${selectedFileType} file`);
      return;
    }

    if (selectedFile.size > maxSize) {
      setError(`File size should be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsUploading(true)
    setError('')
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      setUploadSuccess(true)
      // Redirect to the local server after successful upload
      window.location.href = 'http://localhost:4000/'
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Function to start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setAudioStream(stream)
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedBlob(audioBlob)
        setFile(new File([audioBlob], 'recorded-audio.wav', { type: 'audio/wav' }))
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      // Start timer
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setError('Unable to access microphone. Please check your permissions.')
    }
  }

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      audioStream?.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setAudioStream(null)
      
      // Clear timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [audioStream])

  // Add scroll function at the top level of the component, after other state declarations
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
          {/* Static gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F5F3FF]/10 via-[#F5F3FF]/5 to-[#F5F3FF]/0 z-20" />
          
          {/* Images */}
          <div className="absolute inset-0">
            {slides.map((slide, index) => (
              <motion.div
                key={slide.image}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: index === currentSlide ? 1 : 0,
                  scale: index === currentSlide ? 1 : 1.1
                }}
                transition={{ 
                  duration: 1.2,
                  ease: [0.4, 0, 0.2, 1]
                }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  zIndex: index === currentSlide ? 10 : 0
                }}
              >
                <div className="absolute inset-0 bg-black/10" />
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={index === 0}
                  quality={75}
                  sizes="100vw"
                  className="object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-30 container mx-auto px-6 pt-48 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-16"
            >
              <div className="flex flex-col gap-8">
                <h1 className="text-7xl leading-tight font-bold bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] bg-clip-text text-transparent drop-shadow-sm max-w-4xl">
                  Sign Language Translation
                </h1>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex gap-4 mt-16"
          >
            <Link href="http://127.0.0.1:5000/">
              <motion.button
                className={`px-6 py-2 rounded-lg shadow-sm ${
                  currentSlide === 0 
                    ? 'bg-[#8B5CF6] text-white' 
                    : 'bg-white text-gray-800 hover:bg-white/90 transition-colors'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Video Translation
              </motion.button>
            </Link>
            <Link href="http://127.0.0.1:8080/">
              <motion.button
                className={`px-6 py-2 rounded-lg shadow-sm ${
                  currentSlide === 1 
                    ? 'bg-[#8B5CF6] text-white' 
                    : 'bg-white text-gray-800 hover:bg-white/90 transition-colors'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Audio Translation
              </motion.button>
            </Link>
            
          </motion.div>

          {/* Slide indicators */}
          <div className="flex space-x-2 mt-6">
            {slides.map((_, index) => (
              <motion.button
                key={index}
                className={`w-2 h-2 rounded-full ${
                  currentSlide === index ? 'bg-[#8B5CF6]' : 'bg-gray-400/30'
                }`}
                onClick={() => setCurrentSlide(index)}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Logo and Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
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
              <span className="text-xl font-semibold text-gray-900">Signapse</span>
            </Link>

            <div className="flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('process')}
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                How it works
              </button>
              <button
                onClick={() => scrollToSection('mission')}
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Our mission
              </button>
              <Link 
                href="/signapse-extension.zip"
                className="bg-[#8B5CF6] text-white px-4 py-2 rounded-lg hover:bg-[#7C3AED] transition-colors"
                download="signapse-extension.zip"
              >
                Get Extension
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* SignStudio Platform Section */}
      <motion.section 
        ref={signStudioRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isSignStudioVisible ? 1 : 0, y: isSignStudioVisible ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="relative py-24 overflow-hidden bg-gradient-to-b from-[#F5F3FF] to-white"
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Platform Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Platform Header */}
                <div className="bg-[#1F2937] p-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#8B5CF6] rounded p-1">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">SignStudio</span>
                  </div>
                </div>

                {/* Platform Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Upload</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-3">1. Select type of file you are uploading:</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setSelectedFileType('video')}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            selectedFileType === 'video' 
                              ? 'bg-[#1F2937] text-white' 
                              : 'bg-white text-gray-600 border hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Video</span>
                        </button>
                        <button 
                          onClick={() => setSelectedFileType('document')}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            selectedFileType === 'document' 
                              ? 'bg-[#1F2937] text-white' 
                              : 'bg-white text-gray-600 border hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Document</span>
                        </button>
                        <button 
                          onClick={() => setSelectedFileType('audio')}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            selectedFileType === 'audio' 
                              ? 'bg-[#1F2937] text-white' 
                              : 'bg-white text-gray-600 border hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          <span>Audio</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-600 mb-3">2. Upload your {selectedFileType} here</p>
                      <p className="text-sm text-gray-500 mb-4">
                        {selectedFileType === 'video' && 'You can upload your video file here and subtitle files on the next stage.'}
                        {selectedFileType === 'document' && 'Upload your document for translation into sign language.'}
                        {selectedFileType === 'audio' && 'Choose to upload an audio file or record live using your microphone.'}
                      </p>
                      
                      {selectedFileType === 'audio' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => fileInputRef.current?.click()}
                              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#A78BFA] hover:bg-gray-50 transition-all duration-200"
                            >
                              <div className="p-3 bg-[#A78BFA]/10 rounded-full mb-4">
                                <svg className="w-8 h-8 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              </div>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Audio File</h4>
                              <p className="text-sm text-gray-500 text-center">Upload existing audio files from your device</p>
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                              />
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={isRecording ? stopRecording : startRecording}
                              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed ${
                                isRecording ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-[#A78BFA] hover:bg-gray-50'
                              } rounded-xl transition-all duration-200`}
                            >
                              <div className={`p-3 ${isRecording ? 'bg-red-100' : 'bg-[#A78BFA]/10'} rounded-full mb-4`}>
                                <svg 
                                  className={`w-8 h-8 ${isRecording ? 'text-red-500' : 'text-[#A78BFA]'}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  {isRecording ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                  )}
                                </svg>
                              </div>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">
                                {isRecording ? 'Stop Recording' : 'Record Live'}
                              </h4>
                              {isRecording ? (
                                <p className="text-sm text-red-500 font-medium">{formatTime(recordingTime)}</p>
                              ) : (
                                <p className="text-sm text-gray-500 text-center">Use your microphone to record audio in real-time</p>
                              )}
                            </motion.button>
                          </div>

                          {(file || recordedBlob) && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-[#A78BFA] rounded-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-900 font-medium">
                                    {file ? file.name : 'Recorded Audio'}
                                  </p>
                                  <p className="text-sm text-gray-500">Ready to translate</p>
                                </div>
                                <button
                                  onClick={handleUpload}
                                  disabled={isUploading}
                                  className={`bg-[#A78BFA] text-white px-6 py-2 rounded-lg text-sm transition-all duration-200 ${
                                    isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#9061F9]'
                                  }`}
                                >
                                  {isUploading ? 'Uploading...' : 'Start Translation'}
                                </button>
                              </div>
                              {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="w-full h-2 bg-gray-200 rounded-full mt-4">
                                  <div 
                                    className="h-full bg-[#A78BFA] rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <div className="flex flex-col items-center gap-4">
                            {uploadSuccess ? (
                              <div className="flex items-center gap-2 text-green-500">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="font-medium">Upload successful!</p>
                              </div>
                            ) : file ? (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[#8B5CF6]">
                                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <p className="text-[#8B5CF6] font-medium">{file.name}</p>
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                  <div className="w-full h-2 bg-gray-200 rounded-full">
                                    <div 
                                      className="h-full bg-[#8B5CF6] rounded-full transition-all duration-300"
                                      style={{ width: `${uploadProgress}%` }}
                                    />
                                  </div>
                                )}
                                <button 
                                  onClick={handleUpload}
                                  disabled={isUploading}
                                  className={`mt-4 bg-[#8B5CF6] text-white px-4 py-2 rounded-lg text-sm transition-colors ${
                                    isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]'
                                  }`}
                                >
                                  {isUploading ? 'Uploading...' : 'Start Translation'}
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="p-3 bg-gray-50 rounded-full">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-gray-600">Drag your {selectedFileType} here to import</p>
                                  <input
                                    type="file"
                                    accept={
                                      selectedFileType === 'video' ? '.mp4,.mov' :
                                      selectedFileType === 'document' ? '.pdf,.doc,.docx,.txt' :
                                      '.mp3,.wav,.m4a'
                                    }
                                    onChange={handleFileChange}
                                    className="hidden"
                                    ref={fileInputRef}
                                    id="file-upload"
                                  />
                                  <label
                                    htmlFor="file-upload"
                                    className="mt-3 bg-[#8B5CF6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7C3AED] transition-colors inline-block cursor-pointer"
                                  >
                                    + Choose a {selectedFileType}
                                  </label>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {selectedFileType === 'video' && 'Supported formats: MP4, MOV'}
                                  {selectedFileType === 'document' && 'Supported formats: PDF, DOCX, TXT'}
                                  {selectedFileType === 'audio' && 'Supported formats: MP3, WAV, M4A'}
                                </p>
                                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Content */}
            <div>
              <div className="inline-flex items-center bg-[#ECFDF5] text-[#059669] rounded-full px-3 py-1 text-sm mb-6">
                <span className="mr-1">✨</span> SignStudio <span className="ml-1">✨</span>
              </div>
              
              <motion.h2 
                className="text-5xl font-bold mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.span 
                  className="text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Simplify Your{" "}
                </motion.span>
                <motion.span 
                  className="text-gray-900"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Video Translation{" "}
                </motion.span>
                <motion.span 
                  className="text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  Today
                </motion.span>
              </motion.h2>

              <motion.p 
                className="text-gray-600 text-lg mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6,
                  delay: 1.2,
                  ease: "easeOut"
                }}
              >
                Our groundbreaking platform is live, making it easier than ever to translate and create videos in sign language. Don't miss out—explore the future of accessibility and sign up now to get started!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.5,
                  delay: 1.5,
                  ease: "easeOut"
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  href="/signapse-extension.zip"
                  className="inline-flex items-center bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-medium group hover:bg-[#7C3AED] transition-colors"
                  download="signapse-extension.zip"
                >
                  <span>Get Extension</span>
                  <div className="ml-4 bg-white rounded-full p-2">
                    <motion.svg 
                      className="w-5 h-5 text-[#8B5CF6]" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      initial={{ x: 0 }}
                      animate={{ x: [0, 5, 0] }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </motion.svg>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Video Translation Platform Section */}
      <motion.section 
        ref={missionRef}
        id="mission"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isMissionVisible ? 1 : 0, y: isMissionVisible ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="relative py-24 bg-[#A78BFA]/20"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-center text-5xl font-bold mb-16">
            <span className="text-gray-400">The </span>
            <span className="text-gray-900">Mission</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content Card */}
            <div className="lg:col-span-7 bg-[#1F2937] rounded-3xl p-10 text-white">
              <h3 className="text-4xl font-medium leading-tight mb-6">
                <span className="text-gray-400">Introducing our </span>
                <span className="text-white">real-time Generative AI sign language translation software</span>
                <span className="text-gray-400">, designed to break down communication barriers instantly.</span>
              </h3>

              <p className="text-gray-400 text-lg mb-8">
                Our diverse team, composed of engineers and researchers that are dedicated to creating cutting-edge AI sign language solutions. We specialise in providing seamless In American Sign Language (ASL) translation and interpretation of Hindi and other regional languages audio files can be done by our Tanslator
              </p>

              <Link href="/about" className="bg-white text-gray-900 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors">
                More about us
              </Link>
            </div>

            {/* Right Side Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-6">
              {/* Video Card */}
              <div className="relative aspect-video bg-gray-800 rounded-3xl overflow-hidden">
                <video 
                  src="/images/si.mp4"
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-6">
                {/* BSL Announcements Card */}
                <div className="bg-[#ECFDF5] rounded-3xl p-6 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-5xl font-bold text-gray-900">
                      Over<br />5,000
                    </h4>
                    <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <p className="text-[#059669] text-sm">
                    ISL train announcements generated daily throughout India
                  </p>
                </div>

                {/* Deaf People Stats Card */}
                <div className="bg-[#A78BFA]/20 rounded-3xl p-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Profoundly Deaf people worldwide
                  </p>
                  <h4 className="text-6xl font-bold text-gray-900">
                    430m
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Transport Section */}
      <motion.section 
        ref={transportRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isTransportVisible ? 1 : 0, y: isTransportVisible ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="py-20 bg-gray-50"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">
              Sign Language Translator
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Enhance the teaching experience for Deaf students with our digital sign language displays, available through ASL.
            </p>
            <Link href="/learn-more" className="text-[#8B5CF6] font-semibold hover:text-[#7C3AED] transition-all">
              Learn more →
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Accessibility Section */}
      <motion.section 
        ref={accessibilityRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isAccessibilityVisible ? 1 : 0, y: isAccessibilityVisible ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="relative py-24 bg-white"
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Main Content */}
            <div>
              <h2 className="text-5xl font-medium leading-tight mb-12">
                {[
                  "Enhance",
                  "your",
                  "organisation's",
                  "accessibility",
                  "for",
                  "Deaf",
                  "people",
                  "with",
                  "our",
                  "cutting-edge",
                  "Generative",
                  "AI",
                  "sign",
                  "language",
                  "translation.",
                  "Perfect",
                  "for",
                  "public",
                  "space",
                  "announcements,",
                  "videos,",
                  "and",
                  "websites,",
                  "our",
                  "technology",
                  "ensures",
                  "accurate",
                  "and",
                  "engaging",
                  "communication."
                ].map((word, index) => (
                  <AnimatedWord 
                    key={index} 
                    word={word} 
                    index={index}
                    inView={isAccessibilityVisible}
                  />
                ))}
              </h2>

              <div className="space-y-8">
                <p className="text-gray-600 text-lg">
                  Public spaces, websites, and videos are easily navigable for hearing individuals, but for Deaf people, these can be challenging to access due to barriers in understanding audio or written text.
                </p>

                <p className="text-gray-600 text-lg">
                  <span className="text-gray-900 font-medium">Since sign language is the first language for most Deaf individuals</span>, written text can be particularly difficult to comprehend without hearing the associated sounds. We are dedicated to bridging this gap and ensuring your organisation is fully accessible.
                </p>

                <p className="text-gray-600 text-lg">
                  That's why we've developed our Sign Language Translation Software, powered by advanced Generative AI technology, to deliver photo-realistic and highly accurate translations. Make your content truly inclusive and reach everyone effectively.
                </p>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href="/signapse-extension.zip"
                    className="inline-flex items-center bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-medium group hover:bg-[#7C3AED] transition-colors"
                    download="signapse-extension.zip"
                  >
                    <span>Get Extension</span>
                    <div className="ml-4 bg-white rounded-full p-2">
                      <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Right side - Process Steps */}
            <div id="process">
              <h2 className="text-4xl font-medium mb-12">
                <span className="text-gray-400">How </span>
                <span className="text-gray-900">it works</span>
              </h2>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="flex items-start gap-6">
                  <div className="bg-[#1F2937] rounded-xl p-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Large dataset of sign language</h3>
                    <p className="text-gray-600">Signapse utilises a vast collection of sign language videos made by qualified translators to ensure translations are as accurate as possible.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-6">
                  <div className="bg-[#1F2937] rounded-xl p-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Video selection</h3>
                    <p className="text-gray-600">Our AI technology selects and combines the most appropriate sign language videos based on your content.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-6">
                  <div className="bg-[#1F2937] rounded-xl p-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">AI-powered blending</h3>
                    <p className="text-gray-600">Advanced AI algorithms seamlessly blend the selected videos together for natural transitions.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-6">
                  <div className="bg-[#1F2937] rounded-xl p-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Integration</h3>
                    <p className="text-gray-600">Seamlessly integrate the translated content into your existing platforms and workflows.</p>
                  </div>
                </div>

                {/* Image Placeholder */}
                <div className="mt-12 relative">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <div className="bg-gray-100 rounded-3xl aspect-[4/3] relative overflow-hidden">
                        <Image
                          src="/images/sign3.jpg"
                          alt="Sign Language Translation Process"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-[#86EFAC] text-[#059669] px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="bg-gray-100 rounded-3xl aspect-square mb-4 relative overflow-hidden">
                        <Image
                          src="/images/sign4.jpg"
                          alt="Sign Language Example"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="bg-gray-100 rounded-3xl aspect-square relative overflow-hidden">
                        <Image
                          src="/images/sign3.jpg"
                          alt="Sign Language Demonstration"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        ref={ctaRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isCtaVisible ? 1 : 0, y: isCtaVisible ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="relative py-24 bg-[#1F2937]"
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Image */}
            <div className="relative">
              <div className="relative bg-gray-800 rounded-3xl aspect-[4/3] overflow-hidden">
                <Image
                  src="/images/sign.jpg"
                  alt="Sign Language Interpreter demonstrating sign language"
                  fill
                  className="object-cover object-center"
                  priority
                  quality={100}
                />
                <div className="absolute inset-0 bg-black/20" /> {/* Subtle overlay for text contrast */}
              </div>
            </div>

            {/* Right side - Content */}
            <div className="text-white">
              <h2 className="text-5xl font-medium mb-8">
                <span className="text-white">Get involved </span>
                <span className="text-gray-400">with us</span>
              </h2>

              <div className="space-y-6">
                <p className="text-lg">
                  We are seeking <span className="text-[#8B5CF6]">forward-thinking clients</span> that aim to build the next generation of access for sign language users.
                </p>

                <p className="text-gray-400 text-lg">
                  We value working with those <span className="text-white">who want to be part of the future of equality and are keen to improve operational efficiency</span>. If you would like to transform accessibility for sign language users at your business, please get our extension.
                </p>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-4"
                >
                  <Link 
                    href="/signapse-extension.zip"
                    className="inline-flex items-center bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-medium group hover:bg-[#7C3AED] transition-colors"
                    download="signapse-extension.zip"
                  >
                    <span>Get Extension</span>
                    <div className="ml-4 bg-white rounded-full p-2">
                      <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contact Section */}
      <section className="py-24 bg-[#A78BFA] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white rounded-full filter blur-2xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-white rounded-full filter blur-2xl" />
        </div>

        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-4">
              <span className="text-white">Get In </span>
              <span className="text-white">Touch</span>
            </h2>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Have a question or want to collaborate? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-8">Send us a Message</h3>
              <form className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/20 focus:border-[#A78BFA] transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Your Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/20 focus:border-[#A78BFA] transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">Your Message</label>
                  <textarea
                    id="message"
                    placeholder="How can we help you?"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/20 focus:border-[#A78BFA] transition-all duration-200 resize-none"
                  />
                </div>
                <motion.button 
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#A78BFA] text-white py-4 px-6 rounded-xl font-medium hover:bg-[#9061F9] transition-all duration-200"
                >
                  Send Message
                </motion.button>
              </form>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-8">Contact Information</h3>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group">
                    <div className="bg-[#A78BFA] p-3 rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email us at</p>
                      <a href="mailto:Signapse@dtu.ac.in" className="text-gray-900 hover:text-[#A78BFA] transition-colors">Signapse@dtu.ac.in</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group">
                    <div className="bg-[#A78BFA] p-3 rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h.01M12 10h.01M21 10h.01M3 14h.01M12 14h.01M21 14h.01M3 18h18M3 6h18" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Follow us on Twitter</p>
                      <a href="https://twitter.com/Signapse" className="text-gray-900 hover:text-[#A78BFA] transition-colors">@Signapse</a>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Meet Our Team</h4>
                  
                  <div className="space-y-4">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group"
                    >
                      <div className="w-16 h-16 bg-[#A78BFA] rounded-xl p-1">
                        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                          <Image
                            src="/images/manmeet.jpg"
                            alt="Manmeet"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Manmeet</h4>
                        <p className="text-sm text-gray-600">Web Developer</p>
                      </div>
                    </motion.div>

                    {/* Madhav's Card */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group"
                    >
                      <div className="w-16 h-16 bg-[#A78BFA] rounded-xl p-1">
                        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                          <Image
                            src="/images/madhav.jpg"
                            alt="Madhav Gandhi"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Madhav Gandhi</h4>
                        <p className="text-sm text-gray-600">AI Developer</p>
                      </div>
                    </motion.div>

                    {/* Aditya's Card */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group"
                    >
                      <div className="w-16 h-16 bg-[#A78BFA] rounded-xl p-1">
                        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                          <Image
                            src="/images/aditya.jpg"
                            alt="Aditya Singh Bisht"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Aditya Singh Bisht</h4>
                        <p className="text-sm text-gray-600">3D Model Expert</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Logo and Address */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-2 mb-8">
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
                <span className="text-xl text-gray-900">Signapse</span>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 mb-4">Address</h3>
                <p className="text-gray-600">Delhi Technological University</p>
                <p className="text-gray-600">Shahbad Daulatpur</p>
                <p className="text-gray-600">Main Bawana Road, Rohini</p>
                <p className="text-gray-600">Delhi, 110042</p>
              </div>
            </div>

            {/* Products */}
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-900 mb-4">Products</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/platform" className="text-gray-600 hover:text-gray-900 transition-colors">
                    SignStudio Platform
                  </Link>
                </li>
                <li>
                  <Link href="/transport" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Solution for Transport
                  </Link>
                </li>
              </ul>
            </div>

            {/* Menu */}
            <div className="md:col-span-4">
              <h3 className="font-medium text-gray-900 mb-4">Menu</h3>
              <ul className="grid grid-cols-2 gap-3">
                <li>
                  <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Use cases
                  </Link>
                </li>
                <li>
                  <Link href="/white-papers" className="text-gray-600 hover:text-gray-900 transition-colors">
                    White papers
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/news" className="text-gray-600 hover:text-gray-900 transition-colors">
                    News
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Contact us
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/partnership" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Partnership
                  </Link>
                </li>
                <li>
                  <Link href="/team" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Join the Team
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact and Social */}
            <div className="md:col-span-3 flex flex-col justify-between">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  href="/contact"
                  className="inline-flex items-center bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-medium group hover:bg-[#7C3AED] transition-colors"
                >
                  <span>Contact us</span>
                  <div className="ml-4 bg-white rounded-full p-2">
                    <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.div>

              <div className="flex gap-4 mt-8">
                <Link href="https://facebook.com" className="bg-white rounded-full p-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                  </svg>
                </Link>
                <Link href="https://instagram.com" className="bg-white rounded-full p-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </Link>
                <Link href="https://youtube.com" className="bg-white rounded-full p-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </Link>
                <Link href="https://linkedin.com" className="bg-white rounded-full p-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
} 