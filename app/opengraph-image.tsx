import { ImageResponse } from 'next/og'
import { BRAND_DEFAULT_TITLE, BRAND_NAME } from '@/lib/brand'

export const runtime = 'edge'

export const alt = BRAND_DEFAULT_TITLE
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

const BRAND_NAVY = '#1D3567'

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
          background: `linear-gradient(160deg, ${BRAND_NAVY} 0%, #0f2447 100%)`,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.06em',
          }}
        >
          {BRAND_NAME}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: 'rgba(255,255,255,0.92)',
            textAlign: 'center',
            maxWidth: 880,
            lineHeight: 1.35,
          }}
        >
          Investor matching for founders
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: 'rgba(255,255,255,0.78)',
            textAlign: 'center',
            maxWidth: 820,
          }}
        >
          Stage, sector, thesis, and how you operate
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
