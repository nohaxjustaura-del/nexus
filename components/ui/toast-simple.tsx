// Simple no-op toast replacement to avoid webpack module loading issues
// This replaces the problematic toast system temporarily

export const toast = {
  success: (message?: string, duration?: number): void => {
    // No-op - toast notifications temporarily disabled
  },
  error: (message?: string, duration?: number): void => {
    // No-op - toast notifications temporarily disabled
  },
  info: (message?: string, duration?: number): void => {
    // No-op - toast notifications temporarily disabled
  },
  warning: (message?: string, duration?: number): void => {
    // No-op - toast notifications temporarily disabled
  },
  show: (props?: any): void => {
    // No-op - toast notifications temporarily disabled
  },
  subscribe: (listener?: any): (() => void) => {
    return () => {} // Return no-op unsubscribe function
  },
}

