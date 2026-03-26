import { toast as sonnerToast } from 'sonner'

function withDuration(
  fn: (message: string, opts?: { duration?: number }) => string | number
) {
  return (message?: string, duration?: number) => {
    if (message === undefined) return
    return fn(message, duration !== undefined ? { duration } : undefined)
  }
}

export const toast = {
  success: withDuration(sonnerToast.success),
  error: withDuration(sonnerToast.error),
  info: withDuration(sonnerToast.info),
  warning: withDuration(sonnerToast.warning),
  show: (props?: { title?: string; message?: string; duration?: number }) => {
    if (!props) return
    const msg = props.title ?? props.message ?? ''
    if (!msg) return
    sonnerToast(msg, { duration: props.duration })
  },
  subscribe: (): (() => void) => () => {},
}
