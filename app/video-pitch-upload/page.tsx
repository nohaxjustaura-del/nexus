'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Heart, 
  Upload, 
  Video,
  Play,
  CheckCircle,
  AlertCircle,
  X,
  FileVideo,
  Clock,
  Zap
} from "lucide-react"
import Link from "next/link"

export default function VideoPitchUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a valid video file (MP4, MOV, or WebM)')
        return
      }
      
      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024 // 500MB
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 500MB')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setUploaded(false)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile)
      setVideoPreview(previewUrl)
    }
  }

  const handleRemoveFile = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setFile(null)
    setVideoPreview(null)
    setError(null)
    setUploaded(false)
    setUploadProgress(0)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video file first')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // TODO: Replace with actual API call when ready
      // const formData = new FormData()
      // formData.append('file', file)
      // 
      // const response = await fetch('/api/analyze-video-pitch', {
      //   method: 'POST',
      //   body: formData,
      //   credentials: 'include',
      // })

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploaded(true)
      setUploading(false)

      // TODO: Handle actual response
      // if (!response.ok) {
      //   throw new Error('Upload failed')
      // }
      // const data = await response.json()
      // Handle success...

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NEXUS</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-primary">
              Home
            </Link>
            <Link href="/founder/discover" className="text-sm font-medium hover:text-primary">
              Discover Investors
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <Video className="mr-1 h-3 w-3" />
            Video Pitch Evaluation
          </Badge>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Upload Your Video Pitch
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Notes on delivery and content, plus investor shortlists and outreach angles from your video.
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Upload Your Video</CardTitle>
            <CardDescription>
              Supported formats: MP4, MOV, WebM • Max size: 500MB • Recommended: 2-10 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            {!file ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-muted/30 p-12 text-center transition-colors hover:border-primary hover:bg-muted/50">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <Label htmlFor="video-upload" className="cursor-pointer">
                  <span className="text-lg font-medium text-primary hover:underline">
                    Click to upload video
                  </span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </Label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/mov,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  MP4, MOV, or WebM format • Up to 500MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Preview */}
                {videoPreview && (
                  <div className="relative rounded-lg border-2 border-border overflow-hidden bg-black">
                    <video 
                      src={videoPreview} 
                      controls 
                      className="w-full"
                      style={{ maxHeight: '500px' }}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* File Info */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileVideo className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileVideo className="h-3 w-3" />
                            {formatFileSize(file.size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {file.type.split('/')[1].toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {uploaded && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Video uploaded successfully!</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your video is being processed. Analysis results will be available soon.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="mt-2 text-sm">{error}</p>
                  </div>
                )}

                {/* Upload Button */}
                {!uploaded && (
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading || !file}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Zap className="mr-2 h-4 w-4 animate-pulse" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Analyze Video
                      </>
                    )}
                  </Button>
                )}

                {/* Reset Button */}
                {uploaded && (
                  <Button 
                    onClick={handleRemoveFile}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Upload Another Video
                  </Button>
                )}
              </div>
            )}

            {/* Info Section */}
            <div className="rounded-lg border bg-muted/30 p-6">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                What Happens Next?
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Your video will be transcribed and analyzed by AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>You'll receive scores for presentation quality and content quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Get personalized feedback on strengths and areas to improve</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Receive top investor recommendations with application strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Learn the best approach for each investor (warm intro, cold email, timing)</span>
                </li>
              </ul>
            </div>

            {/* Tips Section */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
              <h3 className="mb-4 font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Zap className="h-4 w-4" />
                Tips for Best Results
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li> -  Keep your pitch between 2-10 minutes for optimal analysis</li>
                <li> -  Ensure good audio quality so your speech can be transcribed accurately</li>
                <li> -  Include specific metrics (revenue, users, growth rates) in your pitch</li>
                <li> -  Clearly explain your problem, solution, and market opportunity</li>
                <li> -  Show enthusiasm and confidence in your delivery</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? <Link href="/" className="text-primary hover:underline">Contact support</Link> or{' '}
            <Link href="/founder/discover" className="text-primary hover:underline">browse investors</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

















