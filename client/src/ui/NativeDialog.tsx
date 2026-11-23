import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface NativeDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Reusable warm-wood Phum Khnhom village modal backed by native <dialog>.
 * Uses showModal() + closedby="any" + pointerdown/pointerup bounding-box fallback.
 */
export const NativeDialog: React.FC<NativeDialogProps> = ({
  open,
  title,
  subtitle,
  onClose,
  maxWidthClass = 'w-[min(94vw,660px)]',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="m-auto rounded-2xl overflow-visible shadow-2xl"
    >
      <div className={`${maxWidthClass} max-h-[88dvh] phum-panel rounded-2xl overflow-hidden flex flex-col`}>
        <div className="px-4 py-3 phum-wood flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display font-bold text-base text-amber-100 truncate">
              {title}
            </h2>
            {subtitle && <p className="text-[11px] text-amber-200/85 truncate">{subtitle}</p>}
          </div>
          <form method="dialog">
            <button
              type="submit"
              aria-label="Close dialog"
              className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-red-700 text-amber-100 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </dialog>
  );
};
