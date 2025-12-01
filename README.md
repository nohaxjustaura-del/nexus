# FounderMatch

AI-powered platform connecting founders with compatible VCs, angels, and mentors.

## Features

- 🎯 **Evidence-Based Matching**: Find VCs that actually fit your profile
- 🤖 **AI Analysis**: Get compatibility scores with actionable insights
- 🔒 **Privacy First**: Your profile is private by default
- 📊 **Pitch Deck Analysis**: AI-powered feedback on your pitch materials
- 🎥 **Video Pitch Analysis**: Get insights on your video presentations
- 📝 **Resume Analysis**: Optimize your founder profile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma)
- **Styling**: Tailwind CSS
- **Authentication**: JWT-based auth
- **AI**: OpenAI GPT-4
- **Payments**: Stripe
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/foundermatch.git
cd foundermatch
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio
- `npm run optimize` - Optimize and clean build

## Project Structure

```
foundermatch/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── founder/           # Founder pages
│   ├── vc/                # VC pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI components
│   └── ...
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication
│   ├── db.ts             # Database client
│   ├── ai.ts             # AI utilities
│   └── ...
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Database seed
└── public/               # Static files

```

## Performance Optimizations

- ✅ Component memoization
- ✅ Image optimization with Next.js Image
- ✅ Code splitting and lazy loading
- ✅ Debounced search and scroll handlers
- ✅ Optimized animations with CSS transforms
- ✅ Service Worker for PWA capabilities
- ✅ Static page generation where possible

## Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ ARIA labels and roles
- ✅ Focus indicators
- ✅ Reduced motion support
- ✅ High contrast mode support

## SEO

- ✅ Optimized meta tags
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Structured data (JSON-LD)
- ✅ Sitemap generation
- ✅ robots.txt
- ✅ Canonical URLs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email support@foundermatch.com

---

Made with ❤️ for founders
