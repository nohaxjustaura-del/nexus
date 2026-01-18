"use client"

import { TrendInsight } from "@/lib/yc-trends"
import { TrendingUp, Flame, User, Target, Sparkles } from "lucide-react"

interface YCTrendsInsightsProps {
  trends?: {
    batch: string
    analyzedAt: Date
    topSectors: string[]
    emergingPatterns: string[]
    avgTraction: { revenue: number; users: number }
    founderProfile: string
  }
  insights?: TrendInsight[]
  scoreAdjustment?: number
  hotSectorMatches?: string[]
}

export function YCTrendsInsights({
  trends,
  insights,
  scoreAdjustment,
  hotSectorMatches,
}: YCTrendsInsightsProps) {
  if (!trends && !insights) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Current YC Trends Overview */}
      {trends && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🔥 {trends.batch} YC Trends (AI-Updated)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hot Sectors Right Now:
              </p>
              <div className="flex flex-wrap gap-2">
                {trends.topSectors.map((sector) => (
                  <span
                    key={sector}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      hotSectorMatches?.includes(sector)
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 ring-2 ring-orange-500"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                    }`}
                  >
                    {hotSectorMatches?.includes(sector) && "🔥 "}
                    {sector}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emerging Patterns:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {trends.emergingPatterns.slice(0, 3).map((pattern) => (
                  <li key={pattern} className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Avg Traction</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${(trends.avgTraction.revenue / 1000).toFixed(1)}K MRR
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Typical Users</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {trends.avgTraction.users.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-gray-500 dark:text-gray-400">Founder Profile</p>
                <p className="font-semibold text-gray-900 dark:text-white text-xs">
                  {trends.founderProfile}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your YC Fit Analysis
            </h3>
            {scoreAdjustment !== undefined && scoreAdjustment > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                  +{scoreAdjustment} points
                </span>
              </div>
            )}
          </div>
          
          <div className="grid gap-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === "hot_sector"
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                    : insight.type === "emerging_pattern"
                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                    : insight.type === "founder_profile"
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {insight.type === "hot_sector" && (
                      <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    )}
                    {insight.type === "emerging_pattern" && (
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    )}
                    {insight.type === "founder_profile" && (
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    )}
                    {insight.type === "traction_level" && (
                      <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {insight.description}
                    </p>
                    <div className="bg-white/50 dark:bg-black/20 rounded px-3 py-2 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">💡 Action:</span>{" "}
                        {insight.actionableAdvice}
                      </p>
                    </div>
                    
                    {insight.examples && insight.examples.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                          Examples from {trends?.batch}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {insight.examples.map((example, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-white/70 dark:bg-black/30 rounded text-gray-600 dark:text-gray-400"
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Relevance
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {insight.relevanceScore}
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
