"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "2xl",
  showCloseButton = true,
  closeOnBackdropClick = true,
}: ModalProps) {
  // Lock body scroll when modal is open
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      {closeOnBackdropClick ? (
        <div
          className="absolute inset-0 bg-black/50 animate-fade-in"
          onClick={onClose}
        />
      ) : (
        <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      )}

      {/* Modal */}
      <div
        className={cn(
          "relative bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in flex flex-col",
          sizeClasses[size as keyof typeof sizeClasses] || sizeClasses["2xl"]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || icon || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
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
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
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
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Modal Footer Button Group
export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return <div className={cn("flex items-center gap-3", className)}>{children}</div>;
}

// Modal Header Component
export interface ModalHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function ModalHeader({ title, description, icon }: ModalHeaderProps) {
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

// Modal Body Component
export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
