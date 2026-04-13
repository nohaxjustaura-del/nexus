import { redirect } from 'next/navigation'

/** Legacy URL: Why NEXUS content now lives on the home page (`/#why-nexus`). */
export default function WhyNexusPage() {
  redirect('/')
}
