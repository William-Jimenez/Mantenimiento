import React, { useMemo, useRef, useState } from 'react';
import { Check, FileText, Search, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AlertBanner,
  EmptyState,
  FieldError,
  FieldLabel,
  FilterChip,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import {
  formatearTamano,
  MAX_FOTOS,
  MAX_PDFS,
  puedeCrearSolicitud,
  validarArchivoEvidencia,
} from '../services/domainRules';
import { ErrorScreen } from './ErrorScreen';

interface PendingFile {
  id: string;
  tipo: 'FOTOGRAFIA' | 'PDF';
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  dataUrl: string;
}

export function NewRequestScreen() {
  const {
    currentUser,
    isAdmin,
    currentEmpleado,
    empleados,
    recursos,
    tiposRecurso,
    crearSolicitud,
    navigate,
  } = useApp();

  const submissionTokenRef = useRef<string>(
    `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  if (!puedeCrearSolicitud(currentUser)) {
    return <ErrorScreen tipo="sin-permiso" />;
  }

  const [solicitanteQuery, setSolicitanteQuery] = useState('');
  const [solicitanteId, setSolicitanteId] = useState<number>(currentEmpleado?.id ?? 0);

  const [tipoFiltro, setTipoFiltro] = useState<number>(0);
  const [recursoQuery, setRecursoQuery] = useState('');
  const [recursoId, setRecursoId] = useState<number>(0);

  const [descripcion, setDescripcion] = useState('');
  const [archivos, setArchivos] = useState<PendingFile[]>([]);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const empleadosActivos = useMemo(
    () => empleados.filter((e) => e.activo),
    [empleados]
  );

  const empleadosFiltrados = useMemo(() => {
    const q = solicitanteQuery.trim().toLowerCase();
    if (!q) return empleadosActivos;
    return empleadosActivos.filter(
      (e) =>
        `${e.nombres} ${e.apellidos}`.toLowerCase().includes(q) ||
        e.documento.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q)
    );
  }, [empleadosActivos, solicitanteQuery]);

  const recursosActivos = useMemo(
    () => recursos.filter((r) => r.activo),
    [recursos]
  );

  const recursosFiltrados = useMemo(() => {
    const q = recursoQuery.trim().toLowerCase();
    return recursosActivos.filter((r) => {
      if (tipoFiltro !== 0 && r.tipoRecursoId !== tipoFiltro) return false;
      if (!q) return true;
      return (
        r.nombre.toLowerCase().includes(q) ||
        r.codigo.toLowerCase().includes(q) ||
        r.ubicacion.toLowerCase().includes(q)
      );
    });
  }, [recursosActivos, tipoFiltro, recursoQuery]);

  const hasDirtyData =
    descripcion.trim().length > 0 || recursoId !== 0 || archivos.length > 0;

  const handleCancelClick = () => {
    if (hasDirtyData) {
      setConfirmDiscardOpen(true);
    } else {
      navigate('/');
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setArchivoError(null);

    let fotosCount = archivos.filter((a) => a.tipo === 'FOTOGRAFIA').length;
    let pdfsCount = archivos.filter((a) => a.tipo === 'PDF').length;
    const validToAdd: PendingFile[] = [];

    for (const file of Array.from(fileList)) {
      let headerBytes: Uint8Array | undefined;
      try {
        if (typeof file.slice === 'function') {
          const buf = await file.slice(0, 16).arrayBuffer();
          headerBytes = new Uint8Array(buf);
        }
      } catch {
        // Fallback if arrayBuffer slice is unavailable
      }
      const check = validarArchivoEvidencia(file, fotosCount, pdfsCount, headerBytes);
      if (!check.ok) {
        setArchivoError(check.error);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      });

      if (check.tipo === 'FOTOGRAFIA') fotosCount += 1;
      else pdfsCount += 1;

      validToAdd.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tipo: check.tipo,
        nombreOriginal: file.name,
        tipoMime:
          file.type ||
          (check.tipo === 'PDF' ? 'application/pdf' : 'image/jpeg'),
        tamanoBytes: file.size,
        dataUrl,
      });
    }

    if (validToAdd.length > 0) {
      setArchivos((prev) => [...prev, ...validToAdd]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nuevosErrores: Record<string, string> = {};
    if (isAdmin && !solicitanteId) {
      nuevosErrores.solicitanteId = 'Seleccione el empleado solicitante.';
    }
    if (!recursoId) {
      nuevosErrores.recursoId = 'Seleccione un recurso.';
    }
    const descClean = descripcion.trim();
    if (descClean.length < 20) {
      nuevosErrores.descripcion = 'Debe tener al menos 20 caracteres.';
    } else if (descClean.length > 2000) {
      nuevosErrores.descripcion = 'No puede superar los 2 000 caracteres.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresCampo(nuevosErrores);
      return;
    }

    setErroresCampo({});
    setSubmitting(true);

    window.setTimeout(() => {
      const res = crearSolicitud({
        submissionToken: submissionTokenRef.current,
        recursoId,
        descripcion: descClean,
        solicitanteId: isAdmin ? solicitanteId : undefined,
        archivos: archivos.map((a) => ({
          tipo: a.tipo,
          nombreOriginal: a.nombreOriginal,
          tipoMime: a.tipoMime,
          tamanoBytes: a.tamanoBytes,
          dataUrl: a.dataUrl,
        })),
      });

      setSubmitting(false);

      if (!res.ok || !res.data) {
        if (res.campo) {
          setErroresCampo({ [res.campo]: res.error ?? 'Dato inválido.' });
        } else {
          setErroresCampo({
            general: res.error ?? 'No pudimos registrar la solicitud. Intente de nuevo.',
          });
        }
        return;
      }

      navigate(`/solicitudes/${res.data.id}?nueva=1`);
    }, 240);
  };

  const fotosActuales = archivos.filter((a) => a.tipo === 'FOTOGRAFIA').length;
  const pdfsActuales = archivos.filter((a) => a.tipo === 'PDF').length;
  const descLen = descripcion.trim().length;

  return (
    <section className="max-w-[900px] space-y-7">
      <PageHeader
        backAction={
          <GhostButton onClick={handleCancelClick} className="-ml-2.5">
            ← Volver al inicio
          </GhostButton>
        }
        eyebrow="M3 · Registro de solicitud"
        title="Nueva solicitud de mantenimiento"
        description={
          isAdmin
            ? 'Registre una solicitud propia o en nombre de un empleado activo adjuntando la evidencia disponible.'
            : 'Seleccione el recurso afectado, describa el daño y adjunte fotografías o documentos PDF si cuenta con ellos.'
        }
      />

      {erroresCampo.general && (
        <AlertBanner variant="error">{erroresCampo.general}</AlertBanner>
      )}

      {recursosActivos.length === 0 ? (
        <EmptyState
          title="No hay recursos registrados"
          description={
            isAdmin
              ? 'Debe existir al menos un recurso activo para asociar una solicitud.'
              : 'Pida al Administrador que registre un recurso activo antes de crear una solicitud.'
          }
          action={
            isAdmin ? (
              <PrimaryButton onClick={() => navigate('/admin/recursos/nuevo')}>
                Registrar recurso
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Step 1 (Admin only, RC-03): Solicitante */}
          {isAdmin && (
            <SurfaceCard className="space-y-4">
              <FieldLabel htmlFor="solicitante-buscar" required>
                Empleado solicitante
              </FieldLabel>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="solicitante-buscar"
                  type="search"
                  value={solicitanteQuery}
                  onChange={(e) => setSolicitanteQuery(e.target.value)}
                  placeholder="Buscar por nombre, documento o correo…"
                  className={`${inputBaseClass} pl-10`}
                />
              </div>

              {empleadosFiltrados.length === 0 ? (
                <AlertBanner variant="warning">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>No hay empleados activos con ese criterio.</span>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/empleados/nuevo')}
                      className="underline font-semibold text-[var(--text-primary)] cursor-pointer"
                    >
                      Registrar empleado
                    </button>
                  </div>
                </AlertBanner>
              ) : (
                <select
                  aria-label="Seleccionar empleado solicitante"
                  value={solicitanteId}
                  onChange={(e) => setSolicitanteId(Number(e.target.value))}
                  className={inputBaseClass}
                >
                  <option value={0}>— Seleccione un empleado —</option>
                  {empleadosFiltrados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombres} {emp.apellidos} ({emp.documento}) — {emp.cargo}
                    </option>
                  ))}
                </select>
              )}
              <FieldError message={erroresCampo.solicitanteId} />
            </SurfaceCard>
          )}

          {/* Step 2: Recurso activo con filtro por tipo */}
          <SurfaceCard className="space-y-4">
            <FieldLabel htmlFor="recurso-buscar" required>
              Recurso afectado
            </FieldLabel>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={tipoFiltro === 0} onClick={() => setTipoFiltro(0)}>
                Todos los tipos
              </FilterChip>
              {tiposRecurso.map((t) => (
                <FilterChip
                  key={t.id}
                  active={tipoFiltro === t.id}
                  onClick={() => setTipoFiltro(t.id)}
                >
                  {t.nombre}
                </FilterChip>
              ))}
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="recurso-buscar"
                type="search"
                value={recursoQuery}
                onChange={(e) => setRecursoQuery(e.target.value)}
                placeholder="Buscar recurso por código, nombre o ubicación…"
                className={`${inputBaseClass} pl-10`}
              />
            </div>

            <div className="max-h-[260px] overflow-y-auto border border-[var(--border-default)] rounded-[12px] bg-[var(--bg-canvas)]/60 divide-y divide-[var(--border-subtle)]">
              {recursosFiltrados.length === 0 ? (
                <p className="p-4 text-[14px] text-[var(--text-muted)]">
                  No hay recursos activos que coincidan con la búsqueda.
                </p>
              ) : (
                recursosFiltrados.map((rec) => {
                  const tipo = tiposRecurso.find((t) => t.id === rec.tipoRecursoId);
                  const selected = recursoId === rec.id;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setRecursoId(rec.id);
                        setErroresCampo((prev) => ({ ...prev, recursoId: '' }));
                      }}
                      className={`w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors duration-150 ${
                        selected
                          ? 'bg-[var(--brand-primary-soft)]'
                          : 'hover:bg-[var(--bg-subtle)]/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            selected
                              ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                              : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                        </span>
                        <span className="font-mono-code text-[12px] font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--status-warning-text)] shrink-0">
                          {rec.codigo}
                        </span>
                        <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                          {rec.nombre}
                        </span>
                      </div>
                      <span className="text-[12px] text-[var(--text-muted)] pl-7 sm:pl-0 shrink-0">
                        {tipo?.nombre} · {rec.ubicacion}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <FieldError message={erroresCampo.recursoId} />
          </SurfaceCard>

          {/* Step 3: Descripción */}
          <SurfaceCard className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel htmlFor="solicitud-desc" required>
                Descripción del problema
              </FieldLabel>
              <span
                className={`text-[12px] font-mono-code font-medium px-2.5 py-0.5 rounded-[6px] border ${
                  descLen < 20
                    ? 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                    : 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                }`}
              >
                {descLen} / 2000 caracteres (mín. 20)
              </span>
            </div>
            <textarea
              id="solicitud-desc"
              rows={5}
              maxLength={2000}
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                if (e.target.value.trim().length >= 20) {
                  setErroresCampo((prev) => ({ ...prev, descripcion: '' }));
                }
              }}
              placeholder="Describa qué falla presenta el recurso, desde cuándo ocurre y si afecta la operación…"
              className={inputBaseClass}
            />
            <FieldError message={erroresCampo.descripcion} />
          </SurfaceCard>

          {/* Step 4: Evidencias */}
          <SurfaceCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <FieldLabel htmlFor="evidencias-input">Evidencias (opcional)</FieldLabel>
              <span className="text-[12px] font-mono-code text-[var(--text-muted)]">
                Fotos: {fotosActuales}/{MAX_FOTOS} (JPEG/PNG, máx. 5 MB) · PDF: {pdfsActuales}/
                {MAX_PDFS} (máx. 10 MB)
              </span>
            </div>

            <label
              htmlFor="evidencias-input"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  void handleFilesSelected(e.dataTransfer.files);
                }
              }}
              className={`flex flex-col items-center justify-center gap-2.5 border-2 border-dashed rounded-[14px] p-7 cursor-pointer transition-[border-color,background-color] duration-150 text-center ${
                isDragging
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-canvas)]/50 hover:border-[var(--brand-primary-text)] hover:bg-[var(--bg-subtle)]/40'
              }`}
            >
              <span className="w-11 h-11 rounded-[12px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] flex items-center justify-center text-[var(--brand-primary-text)]">
                <Upload className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                Arrastre y suelte o seleccione fotografías y documentos PDF
              </span>
              <span className="text-[13px] text-[var(--text-muted)] max-w-[440px]">
                Validación automática de firma binaria (JPEG, PNG, PDF) y hash SHA-256 de integridad.
              </span>
              <input
                id="evidencias-input"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(e) => {
                  void handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>

            <FieldError message={archivoError} />

            {archivos.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
                {archivos.map((arc) => (
                  <li
                    key={arc.id}
                    className="border border-[var(--border-default)] bg-[var(--bg-canvas)]/60 rounded-[12px] p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {arc.tipo === 'FOTOGRAFIA' ? (
                        <img
                          src={arc.dataUrl}
                          alt={arc.nombreOriginal}
                          className="w-12 h-12 object-cover rounded-[8px] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-[8px] border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] flex items-center justify-center shrink-0">
                          <FileText
                            className="w-5 h-5 text-[var(--status-warning-text)]"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                          {arc.nombreOriginal}
                        </p>
                        <p className="text-[12px] font-mono-code text-[var(--text-muted)]">
                          {arc.tipo} · {formatearTamano(arc.tamanoBytes)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${arc.nombreOriginal}`}
                      onClick={() =>
                        setArchivos((prev) => prev.filter((item) => item.id !== arc.id))
                      }
                      className="text-[var(--text-muted)] hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-soft)] p-2 rounded-[8px] transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PrimaryButton type="submit" loading={submitting}>
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </PrimaryButton>
            <OutlineButton onClick={handleCancelClick} disabled={submitting}>
              Cancelar
            </OutlineButton>
          </div>
        </form>
      )}

      {/* Discard confirmation modal (RC-02) */}
      <ModalDialog
        open={confirmDiscardOpen}
        title="¿Descartar la solicitud?"
        onClose={() => setConfirmDiscardOpen(false)}
      >
        <p className="body-readable text-[var(--text-secondary)] mb-6">
          Se perderán los datos ingresados y los archivos seleccionados.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={() => navigate('/')}>Descartar</PrimaryButton>
          <OutlineButton onClick={() => setConfirmDiscardOpen(false)}>
            Seguir editando
          </OutlineButton>
        </div>
      </ModalDialog>
    </section>
  );
}
