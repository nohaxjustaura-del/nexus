'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnnouncementBannerProps {
  message: string
  ctaText?: string
  ctaLink?: string
  dismissible?: boolean
  storageKey?: string
}

export function AnnouncementBanner({
  message,
  ctaText,
  ctaLink,
  dismissible = true,
  storageKey = 'announcement-dismissed',
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if banner was previously dismissed
    const isDismissed = localStorage.getItem(storageKey)
    setIsVisible(!isDismissed)
  }, [storageKey])

  const handleDismiss = () => {
    setIsVisible(false)
    if (dismissible) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (!isVisible) return null

  return (
    <div className="relative bg-gradient-to-r from-primary via-blue-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-sm md:text-base">
          <Megaphone className="h-5 w-5 flex-shrink-0 animate-pulse" />
          <p className="font-medium">
            {message}
            {ctaText && ctaLink && (
              <a
                href={ctaLink}
                className="ml-2 underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                {ctaText}
              </a>
            )}
          </p>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="ml-auto flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Dismiss announcement"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}




