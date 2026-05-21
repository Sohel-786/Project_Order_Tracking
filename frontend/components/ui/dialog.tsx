"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { registerDialog, getScrollLockCount, isTopDialog, getDialogStackIndex } from "@/lib/dialog-stack";

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function isHeaderCloseButton(el: HTMLElement): boolean {
  return (
    el.tagName === "BUTTON" &&
    (el.getAttribute("title") === "Close" || el.getAttribute("aria-label") === "Close dialog")
  );
}

function getPreferredInitialFocus(container: HTMLElement): HTMLElement | undefined {
  const focusable = getFocusableElements(container);
  const firstField = focusable.find(
    (el) =>
      el.tagName === "INPUT" ||
      el.tagName === "SELECT" ||
      el.tagName === "TEXTAREA" ||
      el.getAttribute("role") === "combobox"
  );
  if (firstField) return firstField;
  return focusable.find((el) => !isHeaderCloseButton(el)) ?? focusable[0];
}

function isTextEntryElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type.toLowerCase();
    return !["button", "submit", "reset", "checkbox", "radio", "file", "hidden", "range", "color"].includes(type);
  }
  return el.isContentEditable;
}

function moveFocusInDialog(container: HTMLElement, direction: "next" | "prev") {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active ? focusable.indexOf(active) : -1;

  let nextIndex: number;
  if (currentIndex === -1) {
    nextIndex = direction === "next" ? 0 : focusable.length - 1;
  } else if (direction === "next") {
    nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
  } else {
    nextIndex = currentIndex === 0 ? focusable.length - 1 : currentIndex - 1;
  }

  focusable[nextIndex]?.focus();
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  /** Optional class for the overlay (e.g. z-[1100] for nested dialogs to appear above baseline z-1000) */
  overlayClassName?: string;
  /** When false, content area uses overflow-hidden and flex column; use for forms with internal scroll + sticky footer */
  contentScroll?: boolean;
  /** When false, clicking the backdrop does not close the dialog (default true) */
  closeOnBackdropClick?: boolean;
  /** When true, the header close (X) button is disabled */
  closeButtonDisabled?: boolean;
  /** When true, the default header (title and X button) is hidden */
  hideHeader?: boolean;
  /** When false, this dialog does not lock body scroll (use for attachment list/viewer to avoid scroll lock issues) */
  lockScroll?: boolean;
  /**
   * When true, pressing Esc will show a confirmation dialog *only if* `isDirty` is true.
   * This does not affect closing via Cancel buttons, X button, or backdrop clicks.
   */
  confirmOnEscWhenDirty?: boolean;
  /** Set true when the form inside the dialog has unsaved changes. */
  isDirty?: boolean;
  /** Optional confirm dialog title (Esc only). */
  escConfirmTitle?: string;
  /** Optional confirm dialog message (Esc only). */
  escConfirmDescription?: string;
  /** Custom class for the dialog container */
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  overlayClassName,
  contentScroll = true,
  closeOnBackdropClick = false,
  closeButtonDisabled = false,
  hideHeader = false,
  lockScroll = true,
  confirmOnEscWhenDirty = false,
  isDirty = false,
  escConfirmTitle = "Unsaved Changes",
  escConfirmDescription = "You have unsaved changes in the form. Are you sure you want to close? All filled information will be lost.",
  className,
}: DialogProps) {
  // Store the element that had focus before the dialog opened
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeButtonDisabledRef = useRef(closeButtonDisabled);
  const isDirtyRef = useRef(isDirty);
  const confirmOnEscWhenDirtyRef = useRef(confirmOnEscWhenDirty);
  const [escConfirmOpen, setEscConfirmOpen] = useState(false);
  const escConfirmOpenRef = useRef(false);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [layerZIndex, setLayerZIndex] = useState(1000);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closeButtonDisabledRef.current = closeButtonDisabled;
  }, [closeButtonDisabled]);
  useEffect(() => {
    isDirtyRef.current = !!isDirty;
  }, [isDirty]);
  useEffect(() => {
    confirmOnEscWhenDirtyRef.current = !!confirmOnEscWhenDirty;
  }, [confirmOnEscWhenDirty]);
  useEffect(() => {
    escConfirmOpenRef.current = escConfirmOpen;
  }, [escConfirmOpen]);
  useEffect(() => {
    // Reset Esc confirm each time the dialog closes/opens
    if (!isOpen) setEscConfirmOpen(false);
  }, [isOpen]);

  // Handle focus storage and return only on open/close transitions
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // When closing, return focus to previous element if it still exists
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        // Small delay to ensure the dialog is gone and no race conditions with other focus events
        const timer = setTimeout(() => {
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // We need a stable function to register in the stack.
  // This ensures that even if the onClose prop changes (causing are-render),
  // the identity of the entry in the stack stays the same, allowing isTopDialog to work.
  const handleClose = useCallback(() => {
    if (closeButtonDisabledRef.current) return;

    // Esc confirm flow: global Esc calls this close fn.
    // Only show confirm when requested + dirty; otherwise close immediately.
    if (escConfirmOpenRef.current) {
      setEscConfirmOpen(false);
      return;
    }
    if (confirmOnEscWhenDirtyRef.current && isDirtyRef.current) {
      setEscConfirmOpen(true);
      return;
    }
    onCloseRef.current();
  }, []);

  // Lock body scroll and handle accessibility event listeners (Esc is handled globally by dialog-stack)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Only the topmost dialog handles keyboard focus (nested master dialogs from item form, etc.)
      if (!isTopDialog(handleClose)) return;

      // If the Esc confirmation sub-dialog is open, it has its own focus/key management
      if (escConfirmOpenRef.current) return;

      if (!dialogRef.current) return;

      const active = document.activeElement as HTMLElement | null;

      // Tab / Shift+Tab — focus trap within this dialog
      if (e.key === "Tab") {
        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (active === firstElement || !dialogRef.current.contains(active)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else if (active === lastElement || !dialogRef.current.contains(active)) {
          e.preventDefault();
          firstElement.focus();
        }
        return;
      }

      // Arrow keys — move between fields and footer actions (skip when editing text in inputs)
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (isTextEntryElement(active)) return;
        e.preventDefault();
        moveFocusInDialog(dialogRef.current, e.key === "ArrowRight" ? "next" : "prev");
      }
    };

    if (isOpen) {
      // Add this dialog to the stack (optionally without scroll lock for attachment dialogs)
      const cleanup = registerDialog(handleClose, { lockScroll });
      const syncZIndex = () => setLayerZIndex(1000 + getDialogStackIndex(handleClose) * 100);
      syncZIndex();
      requestAnimationFrame(syncZIndex);

      // Lock scroll only when the first scroll-locking dialog opens
      if (lockScroll && getScrollLockCount() === 1) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      window.addEventListener("keydown", handleKeyDown, true);

      return () => {
        // Remove from stack
        cleanup();

        // Unlock scroll only when no scroll-locking dialogs remain
        if (getScrollLockCount() === 0) {
          document.body.style.overflow = "";
          document.documentElement.style.overflow = "";
        }

        window.removeEventListener("keydown", handleKeyDown, true);
      };
    }
  }, [isOpen, handleClose]);

  // Focus first form field when this dialog opens and is top of stack (nested dialogs included)
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      if (!dialogRef.current || !isTopDialog(handleClose)) return;
      const target = getPreferredInitialFocus(dialogRef.current);
      target?.focus({ preventScroll: true });
    }, 120);

    return () => clearTimeout(focusTimer);
  }, [isOpen, handleClose]);
  
  // Handle focus for the Esc confirmation sub-dialog
  useEffect(() => {
    if (escConfirmOpen) {
      // Small delay to ensure the sub-dialog is rendered
      const timer = setTimeout(() => {
        stayButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [escConfirmOpen]);

  const sizeClasses: Record<NonNullable<DialogProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
    "3xl": "max-w-7xl",
    "4xl": "max-w-[1500px]",
    "5xl": "max-w-[1750px]",
    full: "w-[96vw] h-[94vh] max-w-none max-h-[94vh]",
  };

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (closeOnBackdropClick) onClose();
            }}
            style={{ zIndex: layerZIndex }}
            className={cn(
              "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
              overlayClassName,
            )}
          >
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              className={cn(
                "bg-white dark:bg-[#0d1117] text-card-foreground rounded-xl shadow-2xl w-full max-h-[96vh] flex flex-col relative focus:outline-none overflow-hidden border border-secondary-200 dark:border-border",
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {!hideHeader && (
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h2 id="dialog-title" className="text-xl font-semibold text-foreground">{title}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onClose();
                    }}
                    disabled={closeButtonDisabled}
                    className="h-8 w-8 p-0"
                    title={closeButtonDisabled ? "Please wait" : "Close"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {hideHeader && !closeButtonDisabled && (
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all z-[1010]"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              <div
                className={cn(
                  "flex-1 min-h-0",
                  contentScroll
                    ? "overflow-y-auto p-6"
                    : "overflow-hidden flex flex-col"
                )}
              >
                {children}
              </div>
            </motion.div>

            {/* Esc-only unsaved changes confirm */}
            <AnimatePresence>
              {escConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // clicking backdrop of confirm = stay (do not close original)
                    setEscConfirmOpen(false);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    className="w-full max-w-md rounded-xl border border-secondary-200 dark:border-secondary-800 bg-white dark:bg-[#06080a] text-card-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label={escConfirmTitle}
                    onKeyDown={(e) => {
                      // Navigate between the two buttons using Tab or Arrow keys
                      if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        if (document.activeElement === stayButtonRef.current) {
                          closeButtonRef.current?.focus();
                        } else {
                          stayButtonRef.current?.focus();
                        }
                      }
                    }}
                  >
                    <div className="p-6 border-b border-secondary-200 dark:border-secondary-800">
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{escConfirmTitle}</h3>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">
                        {escConfirmDescription}
                      </p>

                      <div className="flex gap-3 pt-2">
                        <Button
                          ref={stayButtonRef}
                          type="button"
                          variant="outline"
                          className="flex-1 hover:bg-secondary-100 dark:hover:bg-secondary-900/50 dark:border-secondary-700 font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#06080a]"
                          onClick={() => setEscConfirmOpen(false)}
                        >
                          No, Stay
                        </Button>
                        <Button
                          ref={closeButtonRef}
                          type="button"
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-md active:scale-95 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-[#06080a]"
                          onClick={() => {
                            setEscConfirmOpen(false);
                            onCloseRef.current();
                          }}
                        >
                          Yes, Close
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Portal to document.body so the dialog is above the sidebar (escapes content area z-0 stacking context)
  if (mounted && typeof document !== "undefined") {
    return createPortal(dialogContent, document.body);
  }
  return null;
}
// Exportable sub-components for cleaner usage
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>;
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>;
}
