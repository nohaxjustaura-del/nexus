'use client'

import { useState, useEffect } from 'react'
import { 
  FileText,
  Video,
  Lightbulb,
  Shield
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PitchDeckAnalysisTab } from "@/components/ai-analysis/pitch-deck-tab"
import { VideoPitchAnalysisTab } from "@/components/ai-analysis/video-pitch-tab"
import { PitchIdeaAnalysisTab } from "@/components/ai-analysis/pitch-idea-tab"

export default function AIAnalysisPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('pitch-idea')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Hero - Simplified */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl md:text-4xl font-bold text-foreground">
            AI Analysis
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your materials and get matched with compatible investors
          </p>
        </div>

        {/* Privacy strip - Simplified */}
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          <Shield className="inline-block mr-2 h-4 w-4 text-muted-foreground" />
          <span>100% Private & Secure</span>
          <span className="mx-2">•</span>
          <span>Auto-deleted in 30-90 days</span>
        </div>

        {/* Tabs - Simplified */}
        <div className="mb-8 flex justify-center">
          <nav className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setActiveTab('pitch-deck')}
              className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'pitch-deck'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <FileText className="h-4 w-4" />
              Pitch Deck
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'video'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <Video className="h-4 w-4" />
              Video Pitch
            </button>
            <button
              onClick={() => setActiveTab('pitch-idea')}
              className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'pitch-idea'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              Pitch Idea
            </button>
          </nav>
        </div>

        {/* Tab Content - Animated */}
        <div className="w-full animate-fade-in">
          {activeTab === 'pitch-deck' && <PitchDeckAnalysisTab />}
          {activeTab === 'video' && <VideoPitchAnalysisTab />}
          {activeTab === 'pitch-idea' && <PitchIdeaAnalysisTab />}
        </div>
      </div>
    </div>
  )
}
