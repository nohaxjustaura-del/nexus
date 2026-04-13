import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium tracking-[0.01em] ring-offset-background transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-[box-shadow,background-color,transform] duration-200 hover:bg-primary/92 hover:shadow-md hover:shadow-primary/25 active:translate-y-px active:bg-primary/86 motion-reduce:active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90 active:bg-destructive/85',
        outline:
          'border border-border/50 bg-background/40 text-foreground backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-border/70 hover:bg-muted/50 dark:bg-transparent dark:hover:bg-muted/40',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/72',
        ghost: 'text-foreground hover:bg-muted/50 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-12 px-8 text-[15px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export { buttonVariants }
