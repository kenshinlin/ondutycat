"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/utils";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  position?: "right" | "left";
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

const sizeClasses = {
  sm: "w-[400px]",
  md: "w-[500px]",
  lg: "w-[600px]",
  xl: "w-[800px]",
  full: "w-[90vw] max-w-[1200px]",
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "lg",
  position = "right",
  showCloseButton = true,
  closeOnBackdropClick = false,
}: DrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }

    // Cleanup on unmount
    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 animate-fade-in",
          closeOnBackdropClick && "cursor-pointer",
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Drawer */}
      <div
        className={cn(
          "relative h-full bg-white shadow-2xl overflow-hidden animate-slide-in flex flex-col",
          sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg,
          position === "right" ? "ml-auto" : "mr-auto",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || icon || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 className="text-lg font-semibold text-card-foreground truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-6">{children}</div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-2 border-t border-border bg-gray-50/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Drawer Header Component
export interface DrawerHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function DrawerHeader({ title, description, icon }: DrawerHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div>
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// Drawer Body Component
export interface DrawerBodyProps {
  children: ReactNode;
  className?: string;
}

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

// Drawer Footer Component
export interface DrawerFooterProps {
  children: ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>{children}</div>
  );
}
