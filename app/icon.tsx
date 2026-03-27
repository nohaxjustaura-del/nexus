import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

const BRAND_NAVY = '#1D3567'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_NAVY,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            marginTop: -2,
          }}
        >
          N
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
