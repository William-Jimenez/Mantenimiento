import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  EmptyState,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PrimaryButton,
} from '../components/CommonUI';
import {
  formatearTamano,
  MAX_FOTOS,
  MAX_PDFS,
  puedeCrearSolicitud,
  validarArchivoEvidencia,
} from '../services/domainRules';
import { ErrorScreen } from './ErrorScreen';
import { FileText, Upload, X } from 'lucide-react';

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

  const submissionTokenRef = useRef<string>(`sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

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
      const check = validarArchivoEvidencia(file, fotosCount, pdfsCount);
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
          setErroresCampo({ general: res.error ?? 'No pudimos registrar la solicitud. Intente de nuevo.' });
        }
        return;
      }

      navigate(`/solicitudes/${res.data.id}?nueva=1`);
    }, 240);
  };

  const fotosActuales = archivos.filter((a) => a.tipo === 'FOTOGRAFIA').length;
  const pdfsActuales = archivos.filter((a) => a.tipo === 'PDF').length;

  return (
    <section className="max-w-[880px] space-y-[36px]">
      <div className="space-y-[12px]">
        <GhostButton onClick={handleCancelClick}>← Volver al inicio</GhostButton>
        <p className="nav-label text-saffron-spark">M3 · Registro de solicitud</p>
        <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
          Nueva solicitud de mantenimiento
        </h1>
        <p className="body-ultralight text-silver-mist max-w-[600px]">
          {isAdmin
            ? 'Registre una solicitud propia o en nombre de un empleado activo adjuntando la evidencia disponible.'
            : 'Seleccione el recurso afectado, describa el daño y adjunte fotografías o documentos PDF si cuenta con ellos.'}
        </p>
      </div>

      {erroresCampo.general && (
        <div
          role="alert"
          className="border border-saffron-spark/70 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark"
        >
          {erroresCampo.general}
        </div>
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
        <form onSubmit={handleSubmit} className="space-y-[36px]" noValidate>
          {/* Step 1 (Admin only, RC-03): Solicitante */}
          {isAdmin && (
            <div className="space-y-[12px] pb-[24px] border-b border-white/12">
              <FieldLabel htmlFor="solicitante-buscar" required>
                Empleado solicitante
              </FieldLabel>
              <input
                id="solicitante-buscar"
                type="search"
                value={solicitanteQuery}
                onChange={(e) => setSolicitanteQuery(e.target.value)}
                placeholder="Buscar por nombre, documento o correo…"
                className={inputBaseClass}
              />

              {empleadosFiltrados.length === 0 ? (
                <div className="pt-[6px] text-[14px] text-saffron-spark flex flex-wrap items-center gap-[12px]">
                  <span>No hay empleados activos con ese criterio.</span>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/empleados/nuevo')}
                    className="underline text-bone-white cursor-pointer"
                  >
                    Registrar empleado
                  </button>
                </div>
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
            </div>
          )}

          {/* Step 2: Recurso activo con filtro por tipo */}
          <div className="space-y-[12px] pb-[24px] border-b border-white/12">
            <FieldLabel htmlFor="recurso-buscar" required>
              Recurso afectado
            </FieldLabel>

            <div className="flex flex-wrap items-center gap-[8px]">
              <button
                type="button"
                onClick={() => setTipoFiltro(0)}
                className={`px-[12px] py-[6px] rounded-[24px] text-[13px] cursor-pointer transition-colors ${
                  tipoFiltro === 0
                    ? 'bg-electric-iris text-bone-white'
                    : 'text-ash-gray hover:text-bone-white border border-white/15'
                }`}
              >
                Todos los tipos
              </button>
              {tiposRecurso.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoFiltro(t.id)}
                  className={`px-[12px] py-[6px] rounded-[24px] text-[13px] cursor-pointer transition-colors ${
                    tipoFiltro === t.id
                      ? 'bg-electric-iris text-bone-white'
                      : 'text-ash-gray hover:text-bone-white border border-white/15'
                  }`}
                >
                  {t.nombre}
                </button>
              ))}
            </div>

            <input
              id="recurso-buscar"
              type="search"
              value={recursoQuery}
              onChange={(e) => setRecursoQuery(e.target.value)}
              placeholder="Buscar recurso por código, nombre o ubicación…"
              className={inputBaseClass}
            />

            <div className="max-h-[240px] overflow-y-auto border border-white/15 rounded-[12px] divide-y divide-white/10">
              {recursosFiltrados.length === 0 ? (
                <p className="p-[16px] text-[14px] text-ash-gray">
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
                      onClick={() => {
                        setRecursoId(rec.id);
                        setErroresCampo((prev) => ({ ...prev, recursoId: '' }));
                      }}
                      className={`w-full text-left px-[16px] py-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-[6px] cursor-pointer transition-colors ${
                        selected ? 'bg-electric-iris/20' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div>
                        <span className="tabular-nums text-[13px] text-saffron-spark mr-[10px]">
                          {rec.codigo}
                        </span>
                        <span className="text-[15px] text-bone-white">{rec.nombre}</span>
                      </div>
                      <span className="text-[13px] text-ash-gray">
                        {tipo?.nombre} · {rec.ubicacion}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <FieldError message={erroresCampo.recursoId} />
          </div>

          {/* Step 3: Descripción */}
          <div className="space-y-[8px] pb-[24px] border-b border-white/12">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="solicitud-desc" required>
                Descripción del problema
              </FieldLabel>
              <span
                className={`text-[13px] tabular-nums ${
                  descripcion.trim().length < 20 ? 'text-ash-gray' : 'text-deep-verdant'
                }`}
              >
                {descripcion.trim().length} / 2000 caracteres (mín. 20)
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
          </div>

          {/* Step 4: Evidencias */}
          <div className="space-y-[18px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <FieldLabel htmlFor="evidencias-input">
                Evidencias (opcional)
              </FieldLabel>
              <span className="text-[13px] tabular-nums text-ash-gray">
                Fotos: {fotosActuales}/{MAX_FOTOS} (JPEG/PNG, máx. 5 MB) · PDF: {pdfsActuales}/{MAX_PDFS} (máx. 10 MB)
              </span>
            </div>

            <label
              htmlFor="evidencias-input"
              className="flex flex-col items-center justify-center gap-[10px] border border-dashed border-white/25 hover:border-electric-iris rounded-[24px] p-[24px] cursor-pointer transition-colors text-center"
            >
              <Upload className="w-6 h-6 text-electric-iris" aria-hidden="true" />
              <span className="text-[15px] text-bone-white">
                Seleccionar fotografías o documentos PDF
              </span>
              <span className="text-[13px] text-ash-gray">
                Puede adjuntar archivos ahora o posteriormente mientras la solicitud esté Pendiente.
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
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                {archivos.map((arc) => (
                  <li
                    key={arc.id}
                    className="border border-white/15 rounded-[12px] p-[12px] flex items-center justify-between gap-[12px]"
                  >
                    <div className="flex items-center gap-[12px] min-w-0">
                      {arc.tipo === 'FOTOGRAFIA' ? (
                        <img
                          src={arc.dataUrl}
                          alt={arc.nombreOriginal}
                          className="w-12 h-12 object-cover rounded-[8px] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-[8px] border border-white/15 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-saffron-spark" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14px] text-bone-white truncate">
                          {arc.nombreOriginal}
                        </p>
                        <p className="text-[12px] tabular-nums text-ash-gray">
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
                      className="text-ash-gray hover:text-bone-white p-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-[18px] pt-[12px]">
            <PrimaryButton type="submit" disabled={submitting}>
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
        <p className="body-ultralight text-silver-mist mb-[24px]">
          Se perderán los datos ingresados y los archivos seleccionados.
        </p>
        <div className="flex flex-wrap items-center gap-[18px]">
          <PrimaryButton onClick={() => navigate('/')}>Descartar</PrimaryButton>
          <OutlineButton onClick={() => setConfirmDiscardOpen(false)}>
            Seguir editando
          </OutlineButton>
        </div>
      </ModalDialog>
    </section>
  );
}
