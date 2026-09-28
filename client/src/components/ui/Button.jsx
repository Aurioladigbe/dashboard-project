import { forwardRef } from "react";

const VARIANTS = {
  primary: "bg-tile-rss text-ink-950 hover:bg-white",
  secondary: "border border-ink-600 text-white hover:bg-ink-700",
  danger: "bg-danger text-ink-950 hover:bg-white",
};

const Button = forwardRef(function Button(
  { variant = "primary", className = "", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
