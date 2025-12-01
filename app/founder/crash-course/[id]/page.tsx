import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Heart,
  GraduationCap,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  Download,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function CrashCoursePage({ params }: { params: { id: string } }) {
  // Mock crash course data
  const course = {
    investor: {
      firmName: 'AI Ventures',
      name: 'Sarah Chen',
      stage: 'Seed',
      sectors: ['AI/ML', 'SaaS'],
      checkSize: '$100K-$500K',
      applicationUrl: 'https://aiventures.com/apply',
    },
    content: {
      whatTheyValue: [
        {
          title: 'Technical founder with AI/ML expertise',
          description: 'Sarah prioritizes founders who deeply understand the technology. Show ML papers, OSS contributions, or previous AI projects.',
        },
        {
          title: 'Defensible data moat',
          description: 'Explain your proprietary dataset, data flywheel, or unique data access that competitors can\'t replicate.',
        },
        {
          title: 'Product-led traction',
          description: 'Early usage metrics matter more than revenue. Show DAU, retention, or API calls if B2B.',
        },
      ],
      pitchStructure: [
        { section: 'Problem', time: '2 min', focus: 'Why now? What changed in the market?' },
        { section: 'Solution', time: '3 min', focus: 'Demo the AI capability. Show, don\'t tell.' },
        { section: 'Traction', time: '4 min', focus: 'Model performance metrics, users, retention cohorts' },
        { section: 'Market', time: '3 min', focus: 'TAM + your wedge into the market' },
        { section: 'Team', time: '2 min', focus: 'Why you? Technical credibility' },
        { section: 'Ask', time: '2 min', focus: '$500K seed for 18-month runway' },
      ],
      questions: [
        {
          question: 'What\'s your model\'s performance vs baselines?',
          why: 'Sarah wants to see quantitative evidence your AI is better/faster/cheaper',
          answer: 'Prepare: benchmark table, latency metrics, cost per query',
        },
        {
          question: 'How do you prevent someone from replicating this with GPT-4?',
          why: 'Testing defensibility - is it just wrapper tech?',
          answer: 'Emphasize: proprietary data, fine-tuning, domain-specific evals',
        },
        {
          question: 'What\'s your data strategy?',
          why: 'AI moats often come from data, not just models',
          answer: 'Explain: data sources, flywheel effect, exclusivity',
        },
        {
          question: 'Show me your retention cohorts',
          why: 'Early product stickiness predicts PMF',
          answer: 'Have ready: weekly retention curves, power user stats',
        },
        {
          question: 'Who are your design partners?',
          why: 'Wants to see you\'re co-building with real users',
          answer: 'Name 2-3 companies testing your product + feedback loops',
        },
      ],
      redFlags: [
        'Saying "we use ChatGPT API" without differentiation',
        'No clear path to proprietary data or model improvement',
        'Vague about technical implementation details',
        'Unrealistic timelines for model development',
      ],
      warmIntros: [
        {
          path: 'Portfolio founders',
          details: 'Sarah invested in DataMind (AI analytics) and VectorDB Co. Reach out to those founders for intros.',
        },
        {
          path: 'AI/ML conferences',
          details: 'Sarah often attends NeurIPS, ICML. Get a booth or speaking slot.',
        },
        {
          path: 'Mutual angels',
          details: 'Connect with micro-VCs who co-invest with AI Ventures.',
        },
      ],
      proofPoints: [
        'Model benchmarks: Accuracy, latency, cost vs GPT-4/Claude',
        'Evaluation metrics: Domain-specific test sets',
        'Inference costs: $/1000 queries and optimization trajectory',
        'Data flywheel: How usage improves your model',
        'Security: Data privacy, PII handling, audit trail',
      ],
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-body px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/founder/matches">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Matches
            </Button>
          </Link>
          <Button size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
        {/* Hero */}
        <div className="mb-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <GraduationCap className="mr-1 h-3 w-3" />
            Crash Course
          </Badge>
          <h1 className="mb-4 text-4xl font-bold">
            How to Pitch {course.investor.firmName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Tailored guide for {course.investor.name} · {course.investor.stage} · {course.investor.sectors.join(', ')}
          </p>
        </div>

        {/* What They Value */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">1. What They Value Most</h2>
          <div className="space-y-4">
            {course.content.whatTheyValue.map((item, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pitch Structure */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">2. Pitch Structure (15-20 min)</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {course.content.pitchStructure.map((section, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {section.time}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{section.section}</div>
                      <div className="text-sm text-muted-foreground">{section.focus}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Questions */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">3. Five Questions They'll Ask</h2>
          <div className="space-y-4">
            {course.content.questions.map((q, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>{q.question}</span>
                  </CardTitle>
                  <CardDescription className="ml-9">{q.why}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="ml-9 rounded-lg bg-primary/5 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase text-primary">
                      How to Answer:
                    </div>
                    <p className="text-sm">{q.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Red Flags */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">4. Red Flags to Avoid</h2>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {course.content.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Warm Intros */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">5. How to Get a Warm Intro</h2>
          <div className="space-y-4">
            {course.content.warmIntros.map((intro, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {intro.path}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{intro.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Proof Points */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">6. Proof Points to Emphasize</h2>
          <Card>
            <CardHeader>
              <CardDescription>
                For {course.investor.sectors[0]} at {course.investor.stage} stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {course.content.proofPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="mb-2 text-xl font-bold">Ready to Apply?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              You've got the insider knowledge. Now craft your perfect pitch.
            </p>
            <div className="flex justify-center gap-4">
              <a href={course.investor.applicationUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg">
                  Apply to {course.investor.firmName}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/founder/matches">
                <Button size="lg" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Matches
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




