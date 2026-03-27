'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Target, MapPin, DollarSign, ExternalLink, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface RankedVC {
  id: string
  firmName: string
  similarity: number
  metadata: {
    stages?: string[]
    sectors?: string[]
    geography?: string[]
    checkSize?: string
    fundType?: string
  }
}

interface SmartMatchResultsProps {
  matches: RankedVC[]
  showAll?: boolean
}

export function SmartMatchResults({ matches, showAll = false }: SmartMatchResultsProps) {
  if (!matches || matches.length === 0) {
    return null
  }

  const displayMatches = showAll ? matches : matches.slice(0, 10)

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Semantic match results
              <Badge className="bg-purple-100 text-purple-800">
                {matches.length} matches
              </Badge>
            </CardTitle>
            <CardDescription>
              Ranked by overlap between your pitch text and investor profiles
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayMatches.map((match, index) => (
            <Link
              key={match.id}
              href={`/founder/discover?highlight=${match.id}`}
              className="block"
            >
              <div className="p-4 rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-purple-600">
                        #{index + 1}
                      </span>
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                        {match.firmName}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {match.metadata.fundType && (
                        <Badge variant="outline" className="text-xs capitalize bg-white">
                          {match.metadata.fundType}
                        </Badge>
                      )}
                      {match.metadata.stages && match.metadata.stages.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-white">
                          <Target className="h-3 w-3 mr-1" />
                          {match.metadata.stages.slice(0, 2).join(', ')}
                        </Badge>
                      )}
                      {match.metadata.geography && match.metadata.geography.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-white">
                          <MapPin className="h-3 w-3 mr-1" />
                          {match.metadata.geography[0]}
                        </Badge>
                      )}
                      {match.metadata.checkSize && (
                        <Badge variant="outline" className="text-xs bg-white">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {match.metadata.checkSize}
                        </Badge>
                      )}
                    </div>
                    
                    {match.metadata.sectors && match.metadata.sectors.length > 0 && (
                      <p className="text-xs text-slate-600">
                        Focus: {match.metadata.sectors.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(match.similarity * 100)}%
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        fit score
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
          
          {!showAll && matches.length > 10 && (
            <div className="text-center pt-2">
              <Link href="/founder/discover">
                <Button variant="outline" size="sm" className="border-purple-300 hover:bg-purple-50">
                  View all {matches.length} matches
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartMatchResults
