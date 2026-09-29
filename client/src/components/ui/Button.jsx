import { forwardRef } from "react";

const VARIANTS = {
  primary:
    "bg-frost text-night shadow-[0_0_0_1px_rgb(255_255_255/0.12),0_10px_30px_-10px_rgb(143_162_255/0.7)] hover:bg-white",
  secondary: "border border-white/10 bg-white/[0.04] text-frost hover:border-white/20 hover:bg-white/[0.08]",
  danger: "border border-alert/35 bg-alert/[0.14] text-alert hover:bg-alert/25",
};

const Button = forwardRef(function Button(
  { variant = "primary", className = "", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
