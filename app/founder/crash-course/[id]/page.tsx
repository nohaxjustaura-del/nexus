import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  GraduationCap,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Lightbulb,
  Download,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function CrashCoursePage() {
  const course = {
    content: {
      whatTheyValue: [
        {
          title: 'Clear problem-solution fit',
          description: 'VCs invest in solutions to real, painful problems. Clearly articulate the problem, who experiences it, and why existing solutions fail.',
        },
        {
          title: 'Traction and proof points',
          description: 'Early metrics matter: revenue, users, retention, growth rate, or signed LOIs. Show momentum and product-market fit signals.',
        },
        {
          title: 'Strong founding team',
          description: 'Demonstrate why your team is uniquely positioned to solve this problem. Highlight relevant experience, technical expertise, or domain knowledge.',
        },
        {
          title: 'Large addressable market',
          description: 'Show a clear path to building a venture-scale business. Use bottoms-up market calculations, not just top-down TAM estimates.',
        },
      ],
      pitchStructure: [
        { section: 'Problem', time: '2 min', focus: 'Make the pain tangible. Why does this matter now?' },
        { section: 'Solution', time: '3 min', focus: 'Show your product. Demo beats slides every time.' },
        { section: 'Traction', time: '4 min', focus: 'Key metrics, growth trajectory, customer testimonials' },
        { section: 'Market', time: '3 min', focus: 'Market size + your go-to-market wedge strategy' },
        { section: 'Team', time: '2 min', focus: 'Why you? What makes you the right team for this?' },
        { section: 'Ask', time: '2 min', focus: 'How much you\'re raising and what milestones it unlocks' },
      ],
      questions: [
        {
          question: 'What\'s your customer acquisition strategy?',
          why: 'VCs want to understand how you\'ll scale beyond early adopters',
          answer: 'Prepare: CAC/LTV ratios, marketing channels tested, sales funnel metrics',
        },
        {
          question: 'How are you different from competitors?',
          why: 'Testing if you understand the competitive landscape',
          answer: 'Emphasize: unique value prop, unfair advantages, why customers choose you',
        },
        {
          question: 'What are your unit economics?',
          why: 'Can this business be profitable at scale?',
          answer: 'Show: gross margins, contribution margins, path to profitability',
        },
        {
          question: 'Why is now the right time for this?',
          why: 'VCs look for market timing and catalysts',
          answer: 'Explain: recent tech shifts, regulatory changes, or behavior changes',
        },
        {
          question: 'What keeps you up at night?',
          why: 'Assessing self-awareness and risk management',
          answer: 'Be honest about top 1-2 risks and your mitigation plans',
        },
      ],
      redFlags: [
        'No clear answer on how you make money',
        'Dismissing competitors or saying "we have no competition"',
        'Unrealistic financial projections or market size claims',
        'Lack of customer validation or user feedback',
        'Founder conflicts or unclear equity splits',
      ],
      warmIntros: [
        {
          path: 'Portfolio founders',
          details: 'Research the VC\'s portfolio and reach out to founders they\'ve backed. Ask for advice first, intro second.',
        },
        {
          path: 'Industry events & conferences',
          details: 'Attend sector-specific conferences where your target VCs speak or sponsor. Engage meaningfully.',
        },
        {
          path: 'Mutual connections',
          details: 'Use LinkedIn to find shared connections. Angels, advisors, and other founders can make strong intros.',
        },
        {
          path: 'Accelerator programs',
          details: 'Y Combinator, Techstars, and other accelerators provide direct access to top VCs through demo days.',
        },
      ],
      proofPoints: [
        'Revenue metrics: MRR/ARR, growth rate, customer count',
        'Product metrics: DAU/MAU, retention curves, engagement',
        'Customer validation: Testimonials, case studies, design partners',
        'Team credentials: Previous exits, domain expertise, technical background',
        'Competitive moat: Network effects, data advantages, IP, or brand',
      ],
      resources: [
        {
          title: 'Y Combinator\'s How to Pitch',
          description: 'The gold standard for startup pitching from the world\'s top accelerator',
          url: 'https://www.ycombinator.com/library/6q-how-to-pitch-your-startup',
        },
        {
          title: 'Sequoia\'s Writing a Business Plan',
          description: 'Framework used by one of the most successful VC firms',
          url: 'https://www.sequoiacap.com/article/writing-a-business-plan/',
        },
        {
          title: 'First Round Review',
          description: 'In-depth articles on fundraising, growth, and building startups',
          url: 'https://review.firstround.com/',
        },
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
            Fundraising Crash Course
          </Badge>
          <h1 className="mb-4 text-4xl font-bold">
            How to Pitch VCs Successfully
          </h1>
          <p className="text-lg text-muted-foreground">
            A comprehensive guide to crafting winning investor pitches
          </p>
        </div>

        {/* What They Value */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">1. What VCs Value Most</h2>
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
          <h2 className="mb-6 text-2xl font-bold">3. Common Questions VCs Ask</h2>
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
          <h2 className="mb-6 text-2xl font-bold">5. How to Get Warm Intros</h2>
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
            <CardContent className="pt-6">
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

        {/* Resources */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">7. Additional Resources</h2>
          <div className="space-y-4">
            {course.content.resources.map((resource, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {resource.title}
                  </CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {resource.url}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="mb-2 text-xl font-bold">Ready to Start Pitching?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Use this framework to tighten your pitch and aim at VCs who match your stage.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/founder/matches">
                <Button size="lg">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Find Your Matches
                </Button>
              </Link>
              <Link href="/founder/discover">
                <Button size="lg" variant="outline">
                  Browse All VCs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
