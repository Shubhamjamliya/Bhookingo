import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Button } from "@food/components/ui/button"
import { Loader2, AlertTriangle, Info } from "lucide-react"

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  loading = false,
}) {
  const isDestructive = confirmVariant === "destructive"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-white p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <div className="p-6 sm:p-8">
          <DialogHeader className="space-y-4">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
              {isDestructive ? (
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
              ) : (
                <Info className="h-8 w-8 text-blue-600" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="text-xl font-semibold text-gray-900 tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 font-medium">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>
        <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8 border-t border-gray-100">
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:ml-3 sm:w-auto transition-all duration-200 ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md' : 'shadow-sm hover:shadow-md'}`}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="mt-3 w-full sm:mt-0 sm:w-auto bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            {cancelText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
