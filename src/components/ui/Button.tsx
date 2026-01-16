import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center font-medium rounded-button transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Variants
            "bg-accent-blue text-white hover:bg-accent-blue-hover":
              variant === "primary",
            "bg-bg-tertiary text-text-primary border border-border-subtle hover:bg-bg-elevated hover:border-border":
              variant === "secondary",
            "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary":
              variant === "ghost",
            "bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20":
              variant === "danger",
            // Sizes
            "text-xs px-3 py-1.5": size === "sm",
            "text-sm px-4 py-2": size === "md",
            "text-base px-6 py-3": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

