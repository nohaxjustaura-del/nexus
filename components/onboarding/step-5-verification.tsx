'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Rocket, Loader2 } from "lucide-react"

interface Step5VerificationProps {
  idFile: File | null
  setIdFile: (file: File | null) => void
  idUploading: boolean
  setIdUploading: (uploading: boolean) => void
  idUploaded: boolean
  setIdUploaded: (uploaded: boolean) => void
  saving: boolean
  setStep: (step: number) => void
  handleSubmit: () => Promise<void>
}

export function Step5Verification({ 
  idFile, 
  setIdFile, 
  idUploading, 
  setIdUploading, 
  idUploaded, 
  setIdUploaded, 
  saving, 
  setStep, 
  handleSubmit 
}: Step5VerificationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Identity</CardTitle>
        <CardDescription>For trust and safety. Upload a government ID (PNG, JPG, or PDF).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="id-upload">Upload ID (max 10MB)</Label>
          <Input
            id="id-upload"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => setIdFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            disabled={idUploading || saving}
          />
          {idUploaded && (
            <p className="text-sm text-green-600">✅ ID uploaded successfully</p>
          )}
          <p className="text-xs text-muted-foreground">Why we ask: Helps prevent impersonation and spam. We store only a verification status and provider reference.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep(4)} className="flex-1 gap-2" disabled={idUploading || saving}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            className="flex-1"
            disabled={!idFile || idUploading}
            onClick={async () => {
              if (!idFile) return
              setIdUploading(true)
              try {
                const fd = new FormData()
                fd.append('file', idFile)
                const res = await fetch('/api/founder/verify-id', {
                  method: 'POST',
                  body: fd,
                  credentials: 'include',
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Upload failed')
                setIdUploaded(true)
              } catch (e: any) {
                alert(e.message || 'Upload failed')
              } finally {
                setIdUploading(false)
              }
            }}
          >
            {idUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload ID'
            )}
          </Button>
        </div>

        <div className="pt-2">
          <Button 
            onClick={async () => {
              if (!idUploaded) {
                alert('Please upload your ID before continuing.')
                return
              }
              await handleSubmit()
            }} 
            className="w-full" 
            size="lg"
            disabled={saving || !idUploaded}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Finish & Submit
                <Rocket className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


