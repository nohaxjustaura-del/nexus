import { ImageResponse } from 'next/og'
import { BRAND_DEFAULT_TITLE, BRAND_NAME } from '@/lib/brand'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = BRAND_DEFAULT_TITLE
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Image generation
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #155DFD 0%, #7AA8FF 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
            }}
          >
            ❤️
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {BRAND_NAME}
          </div>
        </div>
        <div
          style={{
            fontSize: '36px',
            color: 'white',
            opacity: 0.95,
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Find VCs Who Actually Fit You
        </div>
        <div
          style={{
            fontSize: '24px',
            color: 'white',
            opacity: 0.85,
            marginTop: '20px',
            textAlign: 'center',
          }}
        >
          Evidence-based matching by stage, sector, vision, and working style
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}




