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
  const closingProgrammaticallyRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      closingProgrammaticallyRef.current = false;
      dialog.showModal();
    } else if (!open && dialog.open) {
      closingProgrammaticallyRef.current = true;
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      if (closingProgrammaticallyRef.current) {
        closingProgrammaticallyRef.current = false;
        return;
      }
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
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="m-auto rounded-2xl overflow-visible shadow-2xl"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className={`${maxWidthClass} max-h-[90dvh] phum-panel rounded-2xl overflow-hidden flex flex-col`}>
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
        <div
          className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          }}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
};
