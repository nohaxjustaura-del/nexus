interface CalendlyWidget {
  initPopupWidget: (options: { url: string }) => void
  closePopupWidget: () => void
  initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void
}

declare global {
  interface Window {
    Calendly?: CalendlyWidget
  }
}

export {}
