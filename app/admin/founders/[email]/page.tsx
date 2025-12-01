export const dynamic = 'force-dynamic'

async function fetchDetails(email: string) {
  const base = process.env.NEXT_PUBLIC_URL || ''
  const res = await fetch(`${base}/api/admin/founders/details/${encodeURIComponent(email)}`, { cache: 'no-store' })
  return res.ok ? res.json() : { error: 'Failed to load' }
}

export default async function FounderDetailPage({ params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email)
  const data = await fetchDetails(email)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Founder: {email}</h1>

      {'error' in data ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account */}
            <section className="rounded-md border p-4">
              <h2 className="mb-3 font-semibold">Account</h2>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="col-span-2">{data.user?.email || '-'}</dd>

                <dt className="text-muted-foreground">Email Verified</dt>
                <dd className="col-span-2">{data.user?.emailVerified ? 'Yes' : 'No'}</dd>

                <dt className="text-muted-foreground">Created</dt>
                <dd className="col-span-2">{data.user?.createdAt ? new Date(data.user.createdAt).toLocaleString() : '-'}</dd>

                <dt className="text-muted-foreground">Updated</dt>
                <dd className="col-span-2">{data.user?.updatedAt ? new Date(data.user.updatedAt).toLocaleString() : '-'}</dd>
              </dl>
            </section>

            {/* Verification */}
            <section className="rounded-md border p-4">
              <h2 className="mb-3 font-semibold">Verification</h2>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="col-span-2">
                  {data.verification?.status || 'N/A'}
                </dd>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="col-span-2">
                  {data.verification?.submittedAt ? new Date(data.verification.submittedAt).toLocaleString() : '-'}
                </dd>
                <dt className="text-muted-foreground">Verified</dt>
                <dd className="col-span-2">
                  {data.verification?.verifiedAt ? new Date(data.verification.verifiedAt).toLocaleString() : '-'}
                </dd>
                <dt className="text-muted-foreground">Reviewer</dt>
                <dd className="col-span-2">{data.verification?.reviewerEmail || '-'}</dd>
                <dt className="text-muted-foreground">File</dt>
                <dd className="col-span-2 break-all">{data.verification?.url || '-'}</dd>
              </dl>
              <a
                className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
                href={`/api/admin/founders/verification/file/${encodeURIComponent(email)}`}
              >
                Download ID
              </a>
            </section>
          </div>

          {/* Profile & Contact */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="rounded-md border p-4">
              <h2 className="mb-3 font-semibold">Profile</h2>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="col-span-2">{data.founder?.name || '-'}</dd>

                <dt className="text-muted-foreground">Stage</dt>
                <dd className="col-span-2">{data.founder?.stage ? String(data.founder.stage).replace(/\b\w/g, (c: string) => c.toUpperCase()) : '-'}</dd>

                <dt className="text-muted-foreground">Sectors</dt>
                <dd className="col-span-2">
                  {(() => {
                    try {
                      const arr = JSON.parse(data.founder?.sectors || '[]')
                      return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '-'
                    } catch { return '-' }
                  })()}
                </dd>

                <dt className="text-muted-foreground">Location</dt>
                <dd className="col-span-2">{data.founder?.location || '-'}</dd>

                <dt className="text-muted-foreground">Education</dt>
                <dd className="col-span-2">{data.founder?.education || '-'}</dd>

                <dt className="text-muted-foreground">Age</dt>
                <dd className="col-span-2">{data.founder?.age ?? '-'}</dd>
              </dl>
            </section>

            <section className="rounded-md border p-4">
              <h2 className="mb-3 font-semibold">Contact</h2>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="col-span-2">{data.contact?.phone || '-'}</dd>

                <dt className="text-muted-foreground">Alt Email</dt>
                <dd className="col-span-2">{data.contact?.altEmail || '-'}</dd>

                <dt className="text-muted-foreground">Website</dt>
                <dd className="col-span-2">{data.contact?.website || '-'}</dd>

                <dt className="text-muted-foreground">LinkedIn</dt>
                <dd className="col-span-2">{data.contact?.linkedin || '-'}</dd>

                <dt className="text-muted-foreground">City</dt>
                <dd className="col-span-2">{data.contact?.city || '-'}</dd>

                <dt className="text-muted-foreground">Country</dt>
                <dd className="col-span-2">{data.contact?.country || '-'}</dd>

                <dt className="text-muted-foreground">Updated</dt>
                <dd className="col-span-2">{data.contact?.updatedAt ? new Date(data.contact.updatedAt).toLocaleString() : '-'}</dd>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  )
}


