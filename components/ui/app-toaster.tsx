'use client'

import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-center"
      richColors
      closeButton
      duration={4000}
      gap={12}
      offset={{ bottom: '1.25rem' }}
      mobileOffset={{ bottom: '1rem', left: '0.75rem', right: '0.75rem' }}
      toastOptions={{
        classNames: {
          toast:
            'font-sans !rounded-xl !shadow-2xl !backdrop-blur-md !border !p-4 !text-[13px] !leading-snug',
          title: '!font-medium !text-[13px]',
          description: '!text-[12px] !opacity-90',
          closeButton:
            '!border-border/80 !bg-background/90 !text-foreground hover:!bg-muted !transition-colors',
        },
      }}
    />
  )
}
