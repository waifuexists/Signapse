'use client'

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function AudioTranslation() {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = 'http://127.0.0.1:8080/'}
              className="bg-[#8B5CF6] text-white px-8 py-4 rounded-xl text-xl font-semibold shadow-lg hover:bg-[#7C3AED] transition-colors"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
} 