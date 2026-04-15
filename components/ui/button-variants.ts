import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium tracking-[0.01em] ring-offset-background transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm transition-[box-shadow,background-color] duration-200 hover:bg-primary/90 hover:shadow-md btn-shine',
        destructive:
          'bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90 active:bg-destructive/85',
        outline:
          'border border-border/70 bg-background text-foreground transition-[background-color,border-color] duration-200 hover:border-border hover:bg-muted/55 dark:bg-card',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-muted/60 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-7 text-[15px]',
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
