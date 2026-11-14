import React, { useEffect } from 'react';
import { EstadoNombre, PrioridadNombre } from '../types/domain';
import { X } from 'lucide-react';

export function PrimaryButton({
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-[6px] bg-electric-iris text-bone-white rounded-[24px] px-[20px] py-[12px] min-h-[44px] text-[14px] font-semibold uppercase tracking-[0.35px] whitespace-nowrap shrink-0 transition-opacity duration-150 cursor-pointer hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-[6px] bg-void text-bone-white border border-white/25 hover:border-bone-white rounded-[24px] px-[18px] py-[11px] min-h-[44px] text-[14px] font-normal uppercase tracking-[0.35px] whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-[6px] text-[14px] font-normal text-ash-gray hover:text-bone-white underline-offset-4 hover:underline whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Unboxed typographic status indicator (no pill capsules; respects Zero-Pill discipline & Dala palette)
 */
export function EstadoLabel({ estado }: { estado: EstadoNombre }) {
  const styles: Record<EstadoNombre, { color: string; symbol: string }> = {
    Pendiente: { color: 'text-saffron-spark', symbol: '△' },
    Asignada: { color: 'text-electric-iris', symbol: '◈' },
    'En proceso': { color: 'text-electric-iris', symbol: '▶' },
    Finalizada: { color: 'text-deep-verdant', symbol: '✓' },
    Cancelada: { color: 'text-ash-gray', symbol: '—' },
    Rechazada: { color: 'text-saffron-spark', symbol: '✕' },
  };
  const cfg = styles[estado];
  return (
    <span className={`inline-flex items-center gap-[6px] text-[14px] font-semibold uppercase tracking-[0.35px] whitespace-nowrap ${cfg.color}`}>
      <span aria-hidden="true" className="text-[11px] leading-none">
        {cfg.symbol}
      </span>
      <span>{estado}</span>
    </span>
  );
}

export function PrioridadLabel({ prioridad }: { prioridad?: PrioridadNombre | null }) {
  if (!prioridad) {
    return <span className="text-[14px] text-ash-gray">Sin definir</span>;
  }
  const colorMap: Record<PrioridadNombre, string> = {
    Crítica: 'text-saffron-spark font-semibold',
    Alta: 'text-saffron-spark',
    Media: 'text-bone-white',
    Baja: 'text-silver-mist',
  };
  return <span className={`text-[14px] whitespace-nowrap ${colorMap[prioridad]}`}>{prioridad}</span>;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[14px] font-semibold uppercase tracking-[0.35px] text-silver-mist mb-[6px]"
    >
      {children}
      {required && <span className="text-saffron-spark ml-1">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-[6px] text-[13px] text-saffron-spark">
      {message}
    </p>
  );
}

export const inputBaseClass =
  'w-full bg-void text-bone-white placeholder:text-ash-gray border border-white/20 focus:border-electric-iris rounded-[12px] px-[16px] py-[12px] min-h-[44px] text-[16px] font-normal transition-colors outline-none';

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-[560px]',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-black/85"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-void border border-white/25 rounded-[24px] p-[24px] sm:p-[30px] max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-[18px] mb-[24px]">
          <h2 id="modal-title" className="text-[27px] leading-[1.15] tracking-[-0.48px] text-bone-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="text-ash-gray hover:text-bone-white p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-[18px] py-[18px]" aria-busy="true" aria-label="Cargando contenido">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[48px] w-full border-b border-white/10 flex items-center justify-between gap-[18px] animate-pulse"
        >
          <div className="h-[14px] w-1/4 bg-white/10 rounded" />
          <div className="h-[14px] w-1/3 bg-white/10 rounded" />
          <div className="h-[14px] w-1/6 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-[60px] border-t border-b border-white/12 flex flex-col items-start gap-[18px]">
      <p className="text-[24px] leading-[1.25] tracking-[-0.48px] text-bone-white">{title}</p>
      {description && <p className="body-ultralight text-silver-mist max-w-[540px]">{description}</p>}
      {action && <div className="pt-[6px]">{action}</div>}
    </div>
  );
}
