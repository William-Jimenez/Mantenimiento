import React, { useEffect, useId, useRef } from 'react';
import { EstadoNombre, PrioridadNombre } from '../types/domain';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Minus,
  MinusCircle,
  Sparkles,
  UserCheck,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';

/* ==========================================================================
   BUTTON PRIMITIVES
   Explicit transition properties, tactile press feedback, >= 44px hit areas
   ========================================================================== */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function PrimaryButton({
  children,
  className = '',
  disabled,
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] active:bg-[var(--brand-primary-active)] text-white rounded-[10px] px-5 py-2.5 min-h-[44px] text-[14px] font-semibold tracking-[0.01em] whitespace-nowrap shrink-0 shadow-[var(--shadow-btn-primary)] transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className = '',
  disabled,
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-[10px] px-4 py-2.5 min-h-[44px] text-[14px] font-medium whitespace-nowrap shrink-0 transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = '',
  disabled,
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 bg-[var(--status-danger)] hover:bg-[var(--status-danger-hover)] text-white rounded-[10px] px-5 py-2.5 min-h-[44px] text-[14px] font-semibold whitespace-nowrap shrink-0 transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--status-danger-text)] focus-visible:outline-offset-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
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
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap shrink-0 transition-[background-color,color] duration-150 ease-out cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ==========================================================================
   SEMANTIC STATUS & PRIORITY INDICATORS
   Never rely on color alone: distinct color + distinct icon + label
   ========================================================================== */

export function EstadoLabel({ estado }: { estado: EstadoNombre }) {
  const styles: Record<
    EstadoNombre,
    { bg: string; border: string; text: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    Pendiente: {
      bg: 'bg-[var(--status-warning-soft)]',
      border: 'border-[var(--status-warning-border)]',
      text: 'text-[var(--status-warning-text)]',
      Icon: Clock,
    },
    Asignada: {
      bg: 'bg-[var(--status-info-soft)]',
      border: 'border-[var(--status-info-border)]',
      text: 'text-[var(--status-info-text)]',
      Icon: UserCheck,
    },
    'En proceso': {
      bg: 'bg-[var(--ai-accent-soft)]',
      border: 'border-[var(--ai-accent-border)]',
      text: 'text-[var(--ai-accent-text)]',
      Icon: Wrench,
    },
    Finalizada: {
      bg: 'bg-[var(--status-success-soft)]',
      border: 'border-[var(--status-success-border)]',
      text: 'text-[var(--status-success-text)]',
      Icon: CheckCircle2,
    },
    Cancelada: {
      bg: 'bg-[var(--bg-subtle)]',
      border: 'border-[var(--border-default)]',
      text: 'text-[var(--text-muted)]',
      Icon: MinusCircle,
    },
    Rechazada: {
      bg: 'bg-[var(--status-danger-soft)]',
      border: 'border-[var(--status-danger-border)]',
      text: 'text-[var(--status-danger-text)]',
      Icon: XCircle,
    },
  };

  const { bg, border, text, Icon } = styles[estado];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-[12px] font-semibold tracking-[0.02em] whitespace-nowrap ${bg} ${border} ${text}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{estado}</span>
    </span>
  );
}

export function PrioridadLabel({ prioridad }: { prioridad?: PrioridadNombre | null }) {
  if (!prioridad) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] text-[var(--text-muted)] whitespace-nowrap">
        Sin definir
      </span>
    );
  }

  const cfgMap: Record<
    PrioridadNombre,
    { text: string; bg: string; border: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    Crítica: {
      text: 'text-[var(--status-danger-text)] font-semibold',
      bg: 'bg-[var(--status-danger-soft)]',
      border: 'border-[var(--status-danger-border)]',
      Icon: AlertOctagon,
    },
    Alta: {
      text: 'text-[var(--status-warning-text)] font-semibold',
      bg: 'bg-[var(--status-warning-soft)]',
      border: 'border-[var(--status-warning-border)]',
      Icon: ArrowUp,
    },
    Media: {
      text: 'text-[var(--status-info-text)] font-medium',
      bg: 'bg-[var(--status-info-soft)]',
      border: 'border-[var(--status-info-border)]',
      Icon: Minus,
    },
    Baja: {
      text: 'text-[var(--text-secondary)] font-medium',
      bg: 'bg-[var(--bg-subtle)]',
      border: 'border-[var(--border-default)]',
      Icon: ArrowDown,
    },
  };

  const { text, bg, border, Icon } = cfgMap[prioridad];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border text-[12px] whitespace-nowrap ${bg} ${border} ${text}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{prioridad}</span>
    </span>
  );
}

/* ==========================================================================
   FILTER CHIPS & STRUCTURAL CONTAINERS
   ========================================================================== */

export function FilterChip({
  active,
  variant = 'primary',
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  variant?: 'primary' | 'success';
}) {
  const activeStyle =
    variant === 'success'
      ? 'bg-[var(--status-success)] text-white border-[var(--status-success)] font-semibold shadow-xs'
      : 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] font-semibold shadow-xs';

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-[9px] border text-[13px] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 ${
        active
          ? activeStyle
          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SurfaceCard({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`surface-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function AlertBanner({
  variant = 'error',
  children,
  className = '',
  'data-testid': dataTestId,
}: {
  variant?: 'error' | 'warning' | 'success' | 'info' | 'ai';
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  const styles = {
    error: {
      wrap: 'bg-[var(--status-danger-soft)] border-[var(--status-danger-border)] text-[var(--status-danger-text)]',
      role: 'alert' as const,
      Icon: AlertCircle,
    },
    warning: {
      wrap: 'bg-[var(--status-warning-soft)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]',
      role: 'status' as const,
      Icon: AlertTriangle,
    },
    success: {
      wrap: 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]',
      role: 'status' as const,
      Icon: CheckCircle2,
    },
    info: {
      wrap: 'bg-[var(--status-info-soft)] border-[var(--status-info-border)] text-[var(--status-info-text)]',
      role: 'status' as const,
      Icon: Info,
    },
    ai: {
      wrap: 'bg-[var(--ai-accent-soft)] border-[var(--ai-accent-border)] text-[var(--ai-accent-text)]',
      role: 'status' as const,
      Icon: Sparkles,
    },
  };

  const { wrap, role, Icon } = styles[variant];

  return (
    <div
      role={role}
      data-testid={dataTestId}
      className={`flex items-start gap-3 rounded-[12px] border px-4 py-3 text-[14px] leading-[1.5] ${wrap} ${className}`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  backAction,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  backAction?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {backAction && <div>{backAction}</div>}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-2 max-w-[700px]">
          {eyebrow && (
            <p className="nav-label text-[var(--brand-primary-text)] flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)] inline-block"
              />
              <span>{eyebrow}</span>
            </p>
          )}
          <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.12] tracking-[-0.025em] font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="body-readable text-[var(--text-secondary)] max-w-[620px]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* ==========================================================================
   FORM PRIMITIVES
   ========================================================================== */

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
      className="block text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)] mb-1.5"
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-[var(--status-danger-text)] ml-1">
          *
        </span>
      )}
    </label>
  );
}

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export const inputBaseClass =
  'w-full bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] hover:border-[var(--border-strong)] focus:border-[var(--brand-primary-text)] focus:ring-3 focus:ring-[var(--ring-focus)] rounded-[10px] px-3.5 py-2.5 min-h-[44px] text-[15px] font-normal transition-[border-color,box-shadow,background-color] duration-150 outline-none';

/* ==========================================================================
   MODAL DIALOG (WCAG 2.2 Focus Restoration + Escape + Backdrop Blur)
   ========================================================================== */

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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus({ preventScroll: true });
    }, 10);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-overlay)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`animate-ds-enter w-full ${maxWidth} surface-elevated p-6 sm:p-7 max-h-[90vh] overflow-y-auto outline-none`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[var(--border-subtle)]">
          <h2
            id={titleId}
            className="text-[20px] sm:text-[22px] leading-[1.2] tracking-[-0.02em] font-bold text-[var(--text-primary)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-[10px] transition-[background-color,color] duration-150 cursor-pointer shrink-0 -mt-1 -mr-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ==========================================================================
   SKELETON & EMPTY STATES
   ========================================================================== */

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="surface-card divide-y divide-[var(--border-subtle)] overflow-hidden"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[58px] w-full px-5 flex items-center justify-between gap-5 animate-pulse"
        >
          <div className="h-3.5 w-1/5 bg-[var(--bg-subtle)] rounded" />
          <div className="h-3.5 w-2/5 bg-[var(--bg-subtle)] rounded" />
          <div className="h-3.5 w-1/6 bg-[var(--bg-subtle)] rounded" />
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
    <div className="surface-card px-6 py-12 sm:py-14 flex flex-col items-center text-center gap-3">
      <div
        aria-hidden="true"
        className="w-12 h-12 rounded-[14px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] mb-1"
      >
        <Info className="w-5 h-5" />
      </div>
      <p className="font-display text-[19px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
        {title}
      </p>
      {description && (
        <p className="body-readable text-[var(--text-secondary)] max-w-[480px]">
          {description}
        </p>
      )}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
