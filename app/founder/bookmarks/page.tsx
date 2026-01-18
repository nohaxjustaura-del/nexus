import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ExternalLink,
  DollarSign,
  TrendingUp,
  Building2,
  MapPin,
  Trash2,
  MessageSquare,
  Target
} from "lucide-react"
import Link from "next/link"

export default function BookmarksPage() {
  // Mock data - in real app this would come from database
  const bookmarks = [
    {
      id: '1',
      investor: {
        firmName: 'AI Ventures',
        name: 'Sarah Chen',
        checkMin: 100,
        checkMax: 500,
        stages: ['Pre-Seed', 'Seed'],
        sectors: ['AI/ML', 'SaaS'],
        geoFocus: ['Global'],
        applicationUrl: 'https://aiventures.com/apply',
      },
      notes: 'Met at conference. Seems interested in our AI approach.',
      matchScore: 92,
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      investor: {
        firmName: 'Fintech First',
        name: 'Jessica Martinez',
        checkMin: 500,
        checkMax: 3000,
        stages: ['Seed', 'Series A'],
        sectors: ['Fintech', 'SaaS'],
        geoFocus: ['US', 'Global'],
        applicationUrl: 'https://fintechfirst.com/apply',
      },
      notes: 'High check size, but great banking connections',
      matchScore: 85,
      createdAt: '2024-01-14',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-4 md:py-6">
        {/* Tab Navigation */}
        <div className="mb-4 border-b">
          <nav className="flex items-center gap-1 -mb-px">
            <Link
              href="/founder/discover"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/founder/matches"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/founder/bookmarks"
              className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
            >
              Bookmarks
            </Link>
            <Link
              href="/founder/my-analyses"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              My Analyses
            </Link>
          </nav>
        </div>

        <div className="mb-4">
          <h1 className="mb-2 text-3xl font-bold">Your Bookmarked VCs</h1>
          <p className="text-muted-foreground">
            {bookmarks.length} investor{bookmarks.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {bookmarks.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-blue-50 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">No Bookmarks Yet</h2>
            <p className="mb-2 text-slate-600 max-w-md mx-auto">
              Start exploring and save your favorite VCs to keep track of them
            </p>
            <p className="mb-6 text-sm text-slate-500">
              Click the heart icon on any VC card to bookmark them
            </p>
            <Link href="/founder/discover">
              <Button size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700">
                <Target className="mr-2 h-5 w-5" />
                Discover VCs
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bookmarks.map((bookmark) => {
              const { investor } = bookmark
              return (
                <Card key={bookmark.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-1">{investor.firmName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{investor.name}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {bookmark.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Check Size */}
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        ${investor.checkMin}K - ${investor.checkMax}K
                      </span>
                    </div>

                    {/* Stages */}
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {investor.stages.map((stage) => (
                          <Badge key={stage} variant="outline" className="text-xs">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sectors */}
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {investor.sectors.map((sector) => (
                          <Badge key={sector} variant="outline" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Geography */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {investor.geoFocus.join(', ')}
                      </span>
                    </div>

                    {/* Notes */}
                    {bookmark.notes && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          Your Notes
                        </div>
                        <p className="text-sm">{bookmark.notes}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <a href={investor.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full" size="sm">
                        Apply
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                    <Button variant="outline" size="sm">
                      Edit Notes
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
