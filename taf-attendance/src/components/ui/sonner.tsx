<<<<<<< HEAD
import { useTheme } from "next-themes";
=======
import * as React from "react";
import { useTheme } from "@/hooks/useTheme";
>>>>>>> e59b52a9ca54cce2f46bcd9901a6e01b514500b1
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
<<<<<<< HEAD
  const { theme = "system" } = useTheme();
=======
  const { theme = "light" } = useTheme();
>>>>>>> e59b52a9ca54cce2f46bcd9901a6e01b514500b1

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
