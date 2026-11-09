"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TriangleAlert, HelpCircle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3.5 text-left">
            {isDanger ? (
              <div className="flex items-center justify-center w-11 h-11 bg-destructive/10 text-destructive ring-1 ring-destructive/25 rounded-2xl shrink-0 mt-0.5">
                <TriangleAlert className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-11 h-11 bg-primary/10 text-primary ring-1 ring-primary/25 rounded-2xl shrink-0 mt-0.5">
                <HelpCircle className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1">
              <AlertDialogTitle className="font-display text-lg font-bold text-foreground">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 sm:justify-end gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            variant="outline"
            className="rounded-xl border-border/80 hover:bg-secondary"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            variant={isDanger ? "destructive" : "default"}
            className={
              isDanger
                ? "rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20 gap-2"
                : "rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 gap-2"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
