export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have questions or feedback? We'd love to hear from you.
        </p>
        <div className="prose prose-slate max-w-none">
          <p>
            For general inquiries, please reach out to us at{" "}
            <a href="mailto:contact@foundermatch.com" className="text-primary hover:underline">
              contact@foundermatch.com
            </a>
          </p>
          <p>
            For VC partnerships and opportunities, please contact{" "}
            <a href="mailto:partners@foundermatch.com" className="text-primary hover:underline">
              partners@foundermatch.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}







