import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import Image from 'next/image'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Signapse - AI Sign Language Translation',
  description: 'Experience the future of accessibility with AI-powered ISL translation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {/* Top Navigation */}
        <nav className="fixed w-full z-50 py-4">
          <div className="absolute inset-0 bg-[#F5F3FF]/70 backdrop-blur-md" />
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative flex justify-between items-center">
              <Link href="/" className="flex items-center">
                <div className="bg-[#8B5CF6] rounded-lg p-2 mr-2">
                  <Image 
                    src="/images/logo.svg" 
                    alt="Signapse" 
                    width={24} 
                    height={24}
                    className="brightness-0 invert"
                  />
                </div>
                <span className="text-xl font-semibold text-gray-900">Signapse</span>
              </Link>

              <div className="hidden md:flex items-center space-x-8">
                <Link 
                  href="/#process" 
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-all duration-500 hover:scale-105"
                >
                  How it works
                </Link>

                <Link 
                  href="/#mission" 
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-all duration-500 hover:scale-105"
                >
                  Our mission
                </Link>

                <Link 
                  href="/extension" 
                  className="px-6 py-2 bg-[#8B5CF6] text-white rounded-full shadow-sm hover:bg-[#7C3AED] transition-colors"
                >
                  Get Extension
                </Link>
              </div>

              {/* Mobile menu button */}
              <button className="md:hidden">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
} 