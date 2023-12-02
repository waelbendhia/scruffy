"use client";
import { useFormStatus } from "react-dom";

const AdminButton = ({
  children,
  className,
  disabled,
  ...props
}: React.ComponentProps<"button">) => {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className ?? ""} ${pending ? "animate-pulse" : ""}`}
      disabled={pending || disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default AdminButton;
