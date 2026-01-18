export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-14">
        <h1 className="mb-4 text-3xl font-bold">Security</h1>
        <p className="text-muted-foreground">
          Data in transit is protected with TLS; data at rest is encrypted. We apply least‑privilege
          access and monitor for abuse. We regularly conduct security audits and update our systems
          to protect your information.
        </p>
      </div>
    </div>
  )
}


