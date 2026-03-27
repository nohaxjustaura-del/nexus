import { VCSubnav } from '@/components/vc-subnav'

export default function VCLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VCSubnav />
      {children}
    </>
  )
}
