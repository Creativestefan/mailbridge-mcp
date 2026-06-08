import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: null,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "24px",
          "--description-color": "var(--muted-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg rounded-[24px] border p-4",
          title: "group-[.toast]:text-foreground group-[[data-type=error]]:!text-destructive font-semibold text-sm",
          description: "group-[.toast]:!text-muted-foreground group-[.toast]:!opacity-100 text-xs",
          actionButton: "group-[.toast]:inline-flex group-[.toast]:shrink-0 group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:!rounded-full group-[.toast]:border group-[.toast]:border-transparent group-[.toast]:bg-clip-padding group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:whitespace-nowrap group-[.toast]:transition-all group-[.toast]:outline-none group-[.toast]:select-none group-[.toast]:active:translate-y-px group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/80 group-[.toast]:h-8 group-[.toast]:px-3",
          cancelButton: "group-[.toast]:inline-flex group-[.toast]:shrink-0 group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:!rounded-full group-[.toast]:border group-[.toast]:bg-clip-padding group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:whitespace-nowrap group-[.toast]:transition-all group-[.toast]:outline-none group-[.toast]:select-none group-[.toast]:active:translate-y-px group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 group-[.toast]:border-border group-[.toast]:h-8 group-[.toast]:px-3",
          closeButton: "group-[.toast]:!rounded-full",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
