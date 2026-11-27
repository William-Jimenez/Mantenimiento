import React, { useMemo, useState } from 'react';
import {
  Clock,
  Download,
  FileText,
  History,
  MapPin,
  Sparkles,
  Upload,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  esEstadoFinal,
  formatearFecha,
  formatearTamano,
  obtenerTransicionesPermitidas,
  puedeAdjuntarEvidencia,
  puedeAsignarTecnico,
  puedeCrearSolicitud,
  puedeRegistrarTrabajo,
  puedeRevisarIa,
  puedeVerSolicitud,
  TransicionDisponible,
  validarArchivoEvidencia,
} from '../services/domainRules';
import {
  AlertBanner,
  DangerButton,
  EmptyState,
  EstadoLabel,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PrimaryButton,
  PrioridadLabel,
  SurfaceCard,
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';
import { DecisionRevisionIa } from '../types/domain';

export function RequestDetailScreen({ solicitudId }: { solicitudId: number }) {
  const {
    currentUser,
    currentEmpleado,
    isAdmin,
    isTecnico,
    isCliente,
    solicitudes,
    empleados,
    usuarios,
    recursos,
    tiposRecurso,
    categorias,
    prioridades,
    evidencias,
    asignaciones,
    analisisIa,
    historial,
    iaHabilitada,
    navigate,
    asignarTecnico,
    registrarTrabajoRealizado,
    cambiarEstadoSolicitud,
    agregarEvidencias,
    solicitarNuevoAnalisisIa,
    revisarAnalisisIa,
    obtenerNombreUsuarioActuante,
  } = useApp();

  const solicitud = solicitudes.find((s) => s.id === solicitudId);
  const asignacionVigente = asignaciones.find(
    (a) => a.solicitudId === solicitudId && a.vigente
  );

  const esNueva = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('nueva') === '1';
  }, []);

  // Modals state (P-07, P-08, P-09, Lightbox)
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<number>(0);
  const [asignarError, setAsignarError] = useState<string | null>(null);

  const [transicionActiva, setTransicionActiva] =
    useState<TransicionDisponible | null>(null);
  const [motivoTransicion, setMotivoTransicion] = useState('');
  const [transicionError, setTransicionError] = useState<string | null>(null);
  const [savingModal, setSavingModal] = useState(false);

  const [modalRevisarIaOpen, setModalRevisarIaOpen] = useState(false);
  const [decisionIa, setDecisionIa] =
    useState<Exclude<DecisionRevisionIa, 'PENDIENTE'>>('ACEPTADO');
  const [modCategoriaId, setModCategoriaId] = useState<number>(0);
  const [modPrioridadId, setModPrioridadId] = useState<number>(0);
  const [revisarError, setRevisarError] = useState<string | null>(null);

  const [lightboxImg, setLightboxImg] = useState<{
    src: string;
    nombre: string;
  } | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [modalTrabajoOpen, setModalTrabajoOpen] = useState(false);
  const [textoTrabajo, setTextoTrabajo] = useState('');
  const [trabajoError, setTrabajoError] = useState<string | null>(null);

  if (
    !currentUser ||
    !currentEmpleado ||
    !solicitud ||
    !puedeVerSolicitud(currentUser, currentEmpleado, solicitud, asignacionVigente)
  ) {
    return <ErrorScreen tipo="no-encontrado" />;
  }

  const recurso = recursos.find((r) => r.id === solicitud.recursoId);
  const tipoRecurso = recurso
    ? tiposRecurso.find((t) => t.id === recurso.tipoRecursoId)
    : undefined;
  const solicitante = empleados.find((e) => e.id === solicitud.solicitanteId);
  const registradorUsr = usuarios.find(
    (u) => u.id === solicitud.registradaPorUsuarioId
  );
  const registradorEmp = registradorUsr
    ? empleados.find((e) => e.id === registradorUsr.empleadoId)
    : undefined;
  const registradaPorOtro =
    registradorEmp && solicitante && registradorEmp.id !== solicitante.id;

  const tecnicoVigente = asignacionVigente
    ? empleados.find((e) => e.id === asignacionVigente.tecnicoId)
    : undefined;
  const categoriaFinal = solicitud.categoriaId
    ? categorias.find((c) => c.id === solicitud.categoriaId)
    : undefined;
  const prioridadFinal = solicitud.prioridadId
    ? prioridades.find((p) => p.id === solicitud.prioridadId)
    : undefined;

  const solicitudEvidencias = evidencias.filter(
    (e) => e.solicitudId === solicitud.id
  );
  const solicitudHistorial = historial
    .filter((h) => h.solicitudId === solicitud.id)
    .sort(
      (a, b) =>
        new Date(b.cambiadoEn).getTime() - new Date(a.cambiadoEn).getTime()
    );

  const versionesIa = analisisIa
    .filter((a) => a.solicitudId === solicitud.id)
    .sort((a, b) => b.version - a.version);
  const ultimoAnalisis = versionesIa[0];

  const hayEvidenciaPosterior =
    ultimoAnalisis &&
    solicitudEvidencias.some(
      (ev) =>
        new Date(ev.subidaEn).getTime() >
        new Date(ultimoAnalisis.creadoEn).getTime()
    );

  const transiciones = obtenerTransicionesPermitidas(
    currentUser,
    currentEmpleado,
    solicitud,
    asignacionVigente
  );
  const puedeAsignar = puedeAsignarTecnico(currentUser, solicitud);
  const puedeRegistrar = puedeRegistrarTrabajo(
    currentUser,
    currentEmpleado,
    solicitud,
    asignacionVigente
  );
  const puedeAdjuntar = puedeAdjuntarEvidencia(
    currentUser,
    currentEmpleado,
    solicitud,
    asignacionVigente
  );

  const handleOpenTrabajo = () => {
    setTrabajoError(null);
    setTextoTrabajo(solicitud.trabajoRealizado ?? '');
    setModalTrabajoOpen(true);
  };

  const handleConfirmTrabajo = (e: React.FormEvent) => {
    e.preventDefault();
    setTrabajoError(null);
    setSavingModal(true);
    const res = registrarTrabajoRealizado(
      solicitud.id,
      textoTrabajo,
      solicitud.version
    );
    setSavingModal(false);
    if (!res.ok) {
      setTrabajoError(res.error ?? 'No se pudo registrar el trabajo realizado.');
      return;
    }
    setModalTrabajoOpen(false);
  };

  const tecnicosActivos = empleados.filter((e) => e.activo && e.esTecnico);

  const handleOpenAsignar = () => {
    setAsignarError(null);
    setSelectedTecnicoId(
      asignacionVigente?.tecnicoId ?? tecnicosActivos[0]?.id ?? 0
    );
    setModalAsignarOpen(true);
  };

  const handleConfirmAsignar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTecnicoId) {
      setAsignarError('Seleccione un empleado técnico.');
      return;
    }
    setSavingModal(true);
    const res = asignarTecnico(
      solicitud.id,
      selectedTecnicoId,
      solicitud.version
    );
    setSavingModal(false);
    if (!res.ok) {
      setAsignarError(res.error ?? 'No se pudo asignar el técnico.');
      return;
    }
    setModalAsignarOpen(false);
  };

  const handleOpenTransicion = (t: TransicionDisponible) => {
    setTransicionError(null);
    setMotivoTransicion('');
    setTransicionActiva(t);
  };

  const handleConfirmTransicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transicionActiva) return;
    setTransicionError(null);
    setSavingModal(true);
    const res = cambiarEstadoSolicitud(
      solicitud.id,
      transicionActiva.destino,
      motivoTransicion,
      solicitud.version
    );
    setSavingModal(false);
    if (!res.ok) {
      setTransicionError(res.error ?? 'No se pudo actualizar el estado.');
      return;
    }
    setTransicionActiva(null);
  };

  const handleOpenRevisarIa = () => {
    if (!ultimoAnalisis) return;
    setRevisarError(null);
    setDecisionIa('ACEPTADO');
    setModCategoriaId(
      ultimoAnalisis.categoriaSugeridaId ??
        categorias.find((c) => c.activa)?.id ??
        0
    );
    setModPrioridadId(
      ultimoAnalisis.prioridadSugeridaId ?? prioridades[1]?.id ?? 0
    );
    setModalRevisarIaOpen(true);
  };

  const handleConfirmRevisarIa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ultimoAnalisis) return;
    setRevisarError(null);
    setSavingModal(true);
    const res = revisarAnalisisIa(
      solicitud.id,
      ultimoAnalisis.id,
      decisionIa,
      decisionIa === 'MODIFICADO' ? modCategoriaId : null,
      decisionIa === 'MODIFICADO' ? modPrioridadId : null
    );
    setSavingModal(false);
    if (!res.ok) {
      setRevisarError(res.error ?? 'No se pudo registrar la revisión.');
      return;
    }
    setModalRevisarIaOpen(false);
  };

  const handleAddEvidenceFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    let fotosCount = solicitudEvidencias.filter(
      (e) => e.tipo === 'FOTOGRAFIA'
    ).length;
    let pdfsCount = solicitudEvidencias.filter((e) => e.tipo === 'PDF').length;
    const valid: Array<{
      tipo: 'FOTOGRAFIA' | 'PDF';
      nombreOriginal: string;
      tipoMime: string;
      tamanoBytes: number;
      dataUrl: string;
    }> = [];

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
        setUploadError(check.error);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      });
      if (check.tipo === 'FOTOGRAFIA') fotosCount += 1;
      else pdfsCount += 1;

      valid.push({
        tipo: check.tipo,
        nombreOriginal: file.name,
        tipoMime:
          file.type ||
          (check.tipo === 'PDF' ? 'application/pdf' : 'image/jpeg'),
        tamanoBytes: file.size,
        dataUrl,
      });
    }

    if (valid.length > 0) {
      const res = agregarEvidencias(solicitud.id, valid);
      if (!res.ok && res.error) setUploadError(res.error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Bar & Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GhostButton
            onClick={() => navigate(isTecnico ? '/tecnico/solicitudes' : '/solicitudes')}
            className="-ml-2.5"
          >
            ← Volver al listado
          </GhostButton>
          {esNueva && puedeCrearSolicitud(currentUser) && (
            <OutlineButton
              onClick={() => navigate('/solicitudes/nueva')}
              className="!min-h-[38px] !py-1.5 !text-[13px]"
            >
              Registrar otra solicitud
            </OutlineButton>
          )}
        </div>

        {esNueva && (
          <AlertBanner variant="success">
            Solicitud <strong className="font-mono-code">{solicitud.codigo}</strong> registrada en estado Pendiente.
          </AlertBanner>
        )}

        <SurfaceCard className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono-code text-[13px] font-semibold px-2.5 py-1 rounded-[7px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] text-[var(--brand-primary-text)]">
                {solicitud.codigo}
              </span>
              <EstadoLabel estado={solicitud.estado} />
              <span className="inline-flex items-center gap-1 text-[12px] font-mono-code text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Creada {formatearFecha(solicitud.creadaEn)}
              </span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] leading-[1.12] tracking-[-0.025em] font-bold text-[var(--text-primary)]">
              {recurso?.nombre ?? 'Recurso'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-secondary)]">
              <span className="font-mono-code font-medium text-[var(--text-muted)]">
                {recurso?.codigo}
              </span>
              <span aria-hidden="true" className="text-[var(--border-strong)]">·</span>
              <span>{tipoRecurso?.nombre}</span>
              <span aria-hidden="true" className="text-[var(--border-strong)]">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                {recurso?.ubicacion}
              </span>
            </div>
          </div>

          {/* Primary & State Transition Actions */}
          {!esEstadoFinal(solicitud.estado) && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {puedeAsignar && (
                <PrimaryButton onClick={handleOpenAsignar}>
                  {asignacionVigente ? 'Cambiar técnico' : 'Asignar técnico'}
                </PrimaryButton>
              )}
              {puedeRegistrar && (
                <OutlineButton onClick={handleOpenTrabajo}>
                  <Wrench className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {solicitud.trabajoRealizado
                      ? 'Actualizar trabajo realizado'
                      : 'Registrar trabajo realizado'}
                  </span>
                </OutlineButton>
              )}
              {transiciones.map((t) => {
                const isFirstPrimary = !puedeAsignar && t.destino === 'En proceso';
                if (isFirstPrimary || (!puedeAsignar && t.destino === 'Finalizada')) {
                  return (
                    <PrimaryButton
                      key={t.destino}
                      onClick={() => handleOpenTransicion(t)}
                    >
                      {t.etiqueta}
                    </PrimaryButton>
                  );
                }
                if (t.destino === 'Rechazada') {
                  return (
                    <OutlineButton
                      key={t.destino}
                      onClick={() => handleOpenTransicion(t)}
                      className="hover:!border-[var(--status-danger-border)] hover:!text-[var(--status-danger-text)] hover:!bg-[var(--status-danger-soft)]"
                    >
                      {t.etiqueta}
                    </OutlineButton>
                  );
                }
                return (
                  <OutlineButton
                    key={t.destino}
                    onClick={() => handleOpenTransicion(t)}
                  >
                    {t.etiqueta}
                  </OutlineButton>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* Main 2-column content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Descripción */}
          <SurfaceCard className="space-y-3">
            <h2 className="nav-label text-[var(--text-muted)]">Descripción del problema</h2>
            <p className="body-readable text-[var(--text-primary)] whitespace-pre-line text-[15px] sm:text-[16px]">
              {solicitud.descripcion}
            </p>
          </SurfaceCard>

          {/* Trabajo técnico realizado */}
          <SurfaceCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="nav-label text-[var(--brand-primary-text)] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Trabajo técnico realizado</span>
                </h2>
                {solicitud.trabajoActualizadoEn && (
                  <p className="text-[12px] font-mono-code text-[var(--text-muted)] mt-1">
                    Última actualización: {formatearFecha(solicitud.trabajoActualizadoEn)}
                  </p>
                )}
              </div>
              {puedeRegistrar && (
                <GhostButton onClick={handleOpenTrabajo}>
                  {solicitud.trabajoRealizado ? 'Editar registro' : '+ Registrar trabajo'}
                </GhostButton>
              )}
            </div>

            {solicitud.trabajoRealizado ? (
              <div className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 rounded-[12px] p-4">
                <p className="body-readable text-[var(--text-primary)] whitespace-pre-line">
                  {solicitud.trabajoRealizado}
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-[var(--text-muted)]">
                {isTecnico
                  ? 'Aún no ha registrado el detalle del trabajo realizado en esta solicitud.'
                  : 'Pendiente de registro por el área técnica.'}
              </p>
            )}
          </SurfaceCard>

          {/* Motivo de cierre / rechazo */}
          {solicitud.motivoCierre && (
            <AlertBanner
              variant={
                solicitud.estado === 'Finalizada'
                  ? 'success'
                  : solicitud.estado === 'Rechazada'
                  ? 'error'
                  : 'warning'
              }
            >
              <p className="nav-label mb-1">
                {solicitud.estado === 'Finalizada'
                  ? 'Observación de cierre'
                  : `Motivo de ${solicitud.estado.toLowerCase()}`}
              </p>
              <p className="text-[14px] text-[var(--text-primary)] leading-[1.55]">
                {solicitud.motivoCierre}
              </p>
            </AlertBanner>
          )}

          {/* Evidencias (HU-07, HU-10) */}
          <SurfaceCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[19px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
                Evidencias ({solicitudEvidencias.length})
              </h2>

              {puedeAdjuntar && (
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] text-[13px] font-semibold text-[var(--brand-primary-text)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Adjuntar archivos</span>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={(e) => {
                      void handleAddEvidenceFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            <FieldError message={uploadError} />

            {solicitudEvidencias.length === 0 ? (
              <div className="py-8 text-center rounded-[12px] border border-dashed border-[var(--border-default)] bg-[var(--bg-canvas)]/40 px-4">
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                  No se adjuntaron evidencias
                </p>
                {puedeAdjuntar && (
                  <p className="text-[13px] text-[var(--text-muted)] mt-1">
                    Puede agregar fotografías (JPEG/PNG) o documentos PDF mientras el estado lo permita.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {solicitudEvidencias.map((ev) => (
                  <div
                    key={ev.id}
                    className="border border-[var(--border-default)] bg-[var(--bg-canvas)]/50 rounded-[14px] overflow-hidden flex flex-col justify-between"
                  >
                    {ev.tipo === 'FOTOGRAFIA' ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImg({
                            src: ev.dataUrl,
                            nombre: ev.nombreOriginal,
                          })
                        }
                        className="w-full h-[180px] overflow-hidden bg-[var(--bg-subtle)] cursor-pointer group"
                      >
                        <img
                          src={ev.dataUrl}
                          alt={ev.nombreOriginal}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                        />
                      </button>
                    ) : (
                      <a
                        href={ev.dataUrl}
                        download={ev.nombreOriginal}
                        className="h-[115px] flex flex-col items-center justify-center gap-2 hover:bg-[var(--bg-subtle)]/60 transition-colors"
                      >
                        <span className="w-11 h-11 rounded-[12px] bg-[var(--status-warning-soft)] border border-[var(--status-warning-border)] flex items-center justify-center">
                          <FileText
                            className="w-5 h-5 text-[var(--status-warning-text)]"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="text-[13px] font-semibold text-[var(--brand-primary-text)] hover:underline">
                          Descargar PDF
                        </span>
                      </a>
                    )}

                    <div className="p-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2.5 bg-[var(--bg-surface)]">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {ev.nombreOriginal}
                        </p>
                        <p className="text-[11px] font-mono-code text-[var(--text-muted)]">
                          {formatearTamano(ev.tamanoBytes)} · {formatearFecha(ev.subidaEn)}
                        </p>
                      </div>
                      <a
                        href={ev.dataUrl}
                        download={ev.nombreOriginal}
                        aria-label={`Descargar ${ev.nombreOriginal}`}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] p-2 rounded-[8px] transition-colors shrink-0"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Análisis de IA (Fase 5 - M6, solo Admin y Técnico) */}
          {!isCliente && (
            <SurfaceCard className="space-y-4 border-[var(--ai-accent-border)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="nav-label text-[var(--ai-accent-text)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>M6 · Apoyo de clasificación (Fase 5)</span>
                  </p>
                  <h2 className="font-display text-[19px] font-bold tracking-[-0.015em] text-[var(--text-primary)] mt-1">
                    Análisis de IA
                  </h2>
                </div>

                {isAdmin && iaHabilitada && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {ultimoAnalisis?.estadoAnalisis === 'FALLIDO' && (
                      <OutlineButton onClick={() => solicitarNuevoAnalisisIa(solicitud.id)}>
                        Reintentar análisis
                      </OutlineButton>
                    )}
                    {ultimoAnalisis?.estadoAnalisis === 'COMPLETADO' && hayEvidenciaPosterior && (
                      <OutlineButton onClick={() => solicitarNuevoAnalisisIa(solicitud.id)}>
                        Solicitar nuevo análisis
                      </OutlineButton>
                    )}
                    {!ultimoAnalisis && (
                      <OutlineButton onClick={() => solicitarNuevoAnalisisIa(solicitud.id)}>
                        <Sparkles className="w-4 h-4 text-[var(--ai-accent-text)]" aria-hidden="true" />
                        <span>Analizar con IA</span>
                      </OutlineButton>
                    )}
                    {ultimoAnalisis?.estadoAnalisis === 'COMPLETADO' &&
                      puedeRevisarIa(currentUser) && (
                        <PrimaryButton onClick={handleOpenRevisarIa}>
                          Revisar sugerencia
                        </PrimaryButton>
                      )}
                  </div>
                )}
              </div>

              {!iaHabilitada ? (
                <p className="body-readable text-[var(--text-muted)]">
                  El análisis automático no está disponible. El Administrador puede continuar el flujo manualmente sin restricciones.
                </p>
              ) : !ultimoAnalisis ? (
                <p className="body-readable text-[var(--text-muted)]">
                  Aún no hay análisis registrado para esta solicitud.
                </p>
              ) : ultimoAnalisis.estadoAnalisis === 'EN_COLA' ? (
                <AlertBanner variant="ai">
                  <p className="font-semibold">Análisis de IA en proceso…</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                    El sistema evalúa la descripción y evidencias en segundo plano sin bloquear su trabajo.
                  </p>
                </AlertBanner>
              ) : ultimoAnalisis.estadoAnalisis === 'FALLIDO' ? (
                <AlertBanner variant="error">
                  <p className="font-semibold">
                    No se pudo completar el análisis (v{ultimoAnalisis.version})
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                    {ultimoAnalisis.errorDetalle ?? 'Error al contactar al servicio externo.'}
                  </p>
                </AlertBanner>
              ) : (
                <div className="rounded-[12px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent-soft)]/50 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="font-mono-code font-semibold uppercase tracking-[0.04em] text-[var(--ai-accent-text)]">
                      Sugerencia de IA · v{ultimoAnalisis.version}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-[6px] border font-semibold ${
                        ultimoAnalisis.decisionRevision === 'PENDIENTE'
                          ? 'bg-[var(--status-warning-soft)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]'
                          : ultimoAnalisis.decisionRevision === 'ACEPTADO'
                          ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                          : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {ultimoAnalisis.decisionRevision === 'PENDIENTE'
                        ? 'Pendiente de revisión'
                        : `Revisión: ${ultimoAnalisis.decisionRevision}`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      Tipo de daño identificado
                    </p>
                    <p className="text-[16px] font-semibold text-[var(--text-primary)]">
                      {ultimoAnalisis.tipoDano}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      Descripción observada
                    </p>
                    <p className="body-readable text-[var(--text-secondary)]">
                      {ultimoAnalisis.descripcionObservada}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border-subtle)]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                        Categoría sugerida
                      </p>
                      <p className="text-[15px] font-semibold text-[var(--text-primary)] mt-1">
                        {categorias.find(
                          (c) => c.id === ultimoAnalisis.categoriaSugeridaId
                        )?.nombre ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                        Prioridad sugerida
                      </p>
                      <div className="mt-1">
                        <PrioridadLabel
                          prioridad={
                            prioridades.find(
                              (p) => p.id === ultimoAnalisis.prioridadSugeridaId
                            )?.nombre
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {ultimoAnalisis.revisadoEn && (
                    <p className="text-[12px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-subtle)]">
                      Revisado el {formatearFecha(ultimoAnalisis.revisadoEn)} por{' '}
                      <strong className="font-medium text-[var(--text-secondary)]">
                        {(() => {
                          const revUsr = usuarios.find(
                            (u) => u.id === ultimoAnalisis.revisadoPorUsuarioId
                          );
                          const revEmp = revUsr
                            ? empleados.find((e) => e.id === revUsr.empleadoId)
                            : undefined;
                          return revEmp
                            ? `${revEmp.nombres} ${revEmp.apellidos}`
                            : 'Administrador';
                        })()}
                      </strong>
                    </p>
                  )}

                  {versionesIa.length > 1 && (
                    <details className="pt-2 text-[13px] text-[var(--text-muted)]">
                      <summary className="cursor-pointer hover:text-[var(--text-primary)] font-medium">
                        Ver historial de versiones de análisis ({versionesIa.length})
                      </summary>
                      <ul className="mt-2.5 space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5 list-none p-0">
                        {versionesIa.map((v) => (
                          <li key={v.id} className="font-mono-code text-[12px]">
                            v{v.version} · {v.estadoAnalisis} · {formatearFecha(v.creadoEn)} ·{' '}
                            {v.decisionRevision}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </SurfaceCard>
          )}
        </div>

        {/* Right 5 cols: Sticky Metadata & Engineering Timeline */}
        <aside className="lg:col-span-5 space-y-6 lg:sticky lg:top-[88px]">
          <SurfaceCard className="space-y-4">
            <h2 className="nav-label text-[var(--text-muted)]">Información de la solicitud</h2>

            <dl className="divide-y divide-[var(--border-subtle)] text-[14px]">
              {!isCliente && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Solicitante</dt>
                  <dd className="text-right font-medium text-[var(--text-primary)]">
                    {solicitante
                      ? `${solicitante.nombres} ${solicitante.apellidos}${
                          !solicitante.activo ? ' (inactivo)' : ''
                        }`
                      : '—'}
                  </dd>
                </div>
              )}

              {!isCliente && registradaPorOtro && registradorEmp && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Registrada por</dt>
                  <dd className="text-right text-[var(--text-secondary)]">
                    {registradorEmp.nombres} {registradorEmp.apellidos} (Administrador)
                  </dd>
                </div>
              )}

              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">
                  {isCliente ? 'Atención técnica' : 'Técnico asignado'}
                </dt>
                <dd className="text-right font-medium text-[var(--text-primary)]">
                  {isCliente
                    ? asignacionVigente
                      ? 'Personal técnico asignado'
                      : 'Pendiente de asignación'
                    : tecnicoVigente
                    ? `${tecnicoVigente.nombres} ${tecnicoVigente.apellidos}`
                    : 'Sin asignar'}
                </dd>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Categoría final</dt>
                <dd className="text-right font-medium text-[var(--text-primary)]">
                  {categoriaFinal?.nombre ?? (
                    <span className="text-[var(--text-muted)] font-normal">Sin definir</span>
                  )}
                </dd>
              </div>

              <div className="py-3 flex justify-between gap-4 items-center">
                <dt className="text-[var(--text-muted)]">Prioridad final</dt>
                <dd className="text-right">
                  <PrioridadLabel prioridad={prioridadFinal?.nombre} />
                </dd>
              </div>

              {solicitud.cerradaEn && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Fecha de cierre</dt>
                  <dd className="text-right font-mono-code text-[12px] text-[var(--text-secondary)]">
                    {formatearFecha(solicitud.cerradaEn)}
                  </dd>
                </div>
              )}
            </dl>
          </SurfaceCard>

          {/* Historial de estados (Vertical Timeline) */}
          <SurfaceCard className="space-y-4">
            <h2 className="nav-label text-[var(--text-muted)] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Historial de estados</span>
            </h2>
            <ol className="relative border-l border-[var(--border-default)] ml-2 space-y-5 list-none pl-5">
              {solicitudHistorial.map((h, idx) => {
                const nombreActuante = !isCliente
                  ? obtenerNombreUsuarioActuante(h.usuarioId)
                  : undefined;

                return (
                  <li key={h.id} className="relative space-y-1">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[var(--bg-surface)] ${
                        idx === 0
                          ? 'bg-[var(--brand-primary-text)]'
                          : 'bg-[var(--border-strong)]'
                      }`}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {h.estadoAnterior
                          ? `${h.estadoAnterior} → ${h.estadoNuevo}`
                          : `Creada en ${h.estadoNuevo}`}
                      </span>
                      <span className="font-mono-code text-[11px] text-[var(--text-muted)]">
                        {formatearFecha(h.cambiadoEn)}
                      </span>
                    </div>
                    {!isCliente && (
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        Por {nombreActuante || 'Sistema'}
                      </p>
                    )}
                    {h.motivo && (
                      <p className="text-[13px] text-[var(--text-muted)] italic bg-[var(--bg-canvas)]/60 rounded-[8px] px-3 py-2 border border-[var(--border-subtle)] mt-1">
                        “{h.motivo}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </SurfaceCard>
        </aside>
      </div>

      {/* Diálogo Registrar o actualizar trabajo realizado */}
      <ModalDialog
        open={modalTrabajoOpen}
        title={
          solicitud.trabajoRealizado
            ? 'Actualizar trabajo realizado'
            : 'Registrar trabajo realizado'
        }
        onClose={() => setModalTrabajoOpen(false)}
      >
        <form onSubmit={handleConfirmTrabajo} className="space-y-5">
          <p className="body-readable text-[var(--text-secondary)]">
            Documente las acciones de diagnóstico, reparación o repuestos utilizados en la solicitud{' '}
            <strong className="font-mono-code text-[var(--text-primary)]">{solicitud.codigo}</strong>.
          </p>

          <div>
            <FieldLabel htmlFor="trabajo-realizado-input" required>
              Detalle del trabajo realizado (mínimo 10 caracteres)
            </FieldLabel>
            <textarea
              id="trabajo-realizado-input"
              rows={5}
              maxLength={1000}
              value={textoTrabajo}
              onChange={(e) => {
                setTextoTrabajo(e.target.value);
                setTrabajoError(null);
              }}
              placeholder="Describa la intervención técnica realizada sobre el recurso…"
              className={inputBaseClass}
            />
            <FieldError message={trabajoError} />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton type="submit" loading={savingModal}>
              {savingModal ? 'Guardando…' : 'Guardar registro'}
            </PrimaryButton>
            <OutlineButton onClick={() => setModalTrabajoOpen(false)}>
              Cancelar
            </OutlineButton>
          </div>
        </form>
      </ModalDialog>

      {/* P-07 Diálogo Asignar o reasignar técnico */}
      <ModalDialog
        open={modalAsignarOpen}
        title={asignacionVigente ? 'Cambiar técnico asignado' : 'Asignar técnico'}
        onClose={() => setModalAsignarOpen(false)}
      >
        {tecnicosActivos.length === 0 ? (
          <div className="space-y-5">
            <AlertBanner variant="warning">
              No hay empleados marcados como técnicos.
            </AlertBanner>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={() => navigate('/admin/empleados')}>
                Ir a empleados para marcar técnico
              </PrimaryButton>
              <OutlineButton onClick={() => setModalAsignarOpen(false)}>
                Cerrar
              </OutlineButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmAsignar} className="space-y-5">
            <p className="body-readable text-[var(--text-secondary)]">
              Seleccione un Empleado Técnico activo. Se muestra la carga actual de solicitudes en estado Asignada o En proceso.
            </p>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {tecnicosActivos.map((tec) => {
                const carga = asignaciones.filter((a) => {
                  if (!a.vigente || a.tecnicoId !== tec.id) return false;
                  const s = solicitudes.find((sol) => sol.id === a.solicitudId);
                  return s && (s.estado === 'Asignada' || s.estado === 'En proceso');
                }).length;

                const isSelected = selectedTecnicoId === tec.id;

                return (
                  <label
                    key={tec.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-[12px] border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-canvas)]/50 hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="radio"
                        name="tecnicoId"
                        checked={isSelected}
                        onChange={() => setSelectedTecnicoId(tec.id)}
                        className="w-4 h-4 accent-[var(--brand-primary)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                          {tec.nombres} {tec.apellidos}
                        </p>
                        <p className="text-[12px] text-[var(--text-muted)] truncate">{tec.cargo}</p>
                      </div>
                    </div>
                    <span className="font-mono-code text-[12px] px-2.5 py-0.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0">
                      {carga} activa(s)
                    </span>
                  </label>
                );
              })}
            </div>

            <FieldError message={asignarError} />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PrimaryButton type="submit" loading={savingModal}>
                {savingModal ? 'Guardando…' : 'Asignar'}
              </PrimaryButton>
              <OutlineButton onClick={() => setModalAsignarOpen(false)}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* P-08 Diálogo Cambiar estado */}
      <ModalDialog
        open={!!transicionActiva}
        title={transicionActiva?.etiqueta ?? 'Cambiar estado'}
        onClose={() => setTransicionActiva(null)}
      >
        {transicionActiva && (
          <form onSubmit={handleConfirmTransicion} className="space-y-5">
            <p className="body-readable text-[var(--text-secondary)]">
              La solicitud{' '}
              <strong className="font-mono-code text-[var(--text-primary)]">{solicitud.codigo}</strong>{' '}
              pasará de{' '}
              <strong className="font-semibold text-[var(--text-primary)]">{solicitud.estado}</strong> a{' '}
              <strong className="font-semibold text-[var(--text-primary)]">
                {transicionActiva.destino}
              </strong>
              .
            </p>

            {(transicionActiva.requiereMotivo || transicionActiva.motivoOpcional) && (
              <div>
                <FieldLabel
                  htmlFor="motivo-transicion"
                  required={transicionActiva.requiereMotivo}
                >
                  {transicionActiva.destino === 'Finalizada'
                    ? 'Observación de cierre (opcional)'
                    : 'Motivo (mínimo 10 caracteres)'}
                </FieldLabel>
                <textarea
                  id="motivo-transicion"
                  rows={4}
                  maxLength={500}
                  value={motivoTransicion}
                  onChange={(e) => {
                    setMotivoTransicion(e.target.value);
                    setTransicionError(null);
                  }}
                  placeholder={
                    transicionActiva.destino === 'Finalizada'
                      ? 'Detalle el trabajo realizado o repuestos sustituidos…'
                      : 'Indique el motivo de esta decisión…'
                  }
                  className={inputBaseClass}
                />
                <FieldError message={transicionError} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {transicionActiva.destino === 'Rechazada' ? (
                <DangerButton type="submit" loading={savingModal}>
                  {savingModal ? 'Guardando…' : 'Confirmar'}
                </DangerButton>
              ) : (
                <PrimaryButton type="submit" loading={savingModal}>
                  {savingModal ? 'Guardando…' : 'Confirmar'}
                </PrimaryButton>
              )}
              <OutlineButton onClick={() => setTransicionActiva(null)}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* P-09 Diálogo Revisar análisis de IA */}
      <ModalDialog
        open={modalRevisarIaOpen}
        title="Revisar análisis de IA"
        onClose={() => setModalRevisarIaOpen(false)}
      >
        {ultimoAnalisis && (
          <form onSubmit={handleConfirmRevisarIa} className="space-y-5">
            <div className="rounded-[12px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent-soft)] p-3.5 text-[14px] space-y-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--ai-accent-text)]">
                Sugerencia de IA:
              </p>
              <p className="text-[var(--text-primary)] font-medium">
                Categoría:{' '}
                {categorias.find(
                  (c) => c.id === ultimoAnalisis.categoriaSugeridaId
                )?.nombre ?? '—'}{' '}
                · Prioridad:{' '}
                {prioridades.find(
                  (p) => p.id === ultimoAnalisis.prioridadSugeridaId
                )?.nombre ?? '—'}
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  val: 'ACEPTADO' as const,
                  title: 'Aceptar sugerencia',
                  desc: 'Copia categoría y prioridad sugeridas como valores finales.',
                },
                {
                  val: 'MODIFICADO' as const,
                  title: 'Modificar manualmente',
                  desc: 'Fija otra categoría o prioridad conservando la sugerencia original.',
                },
                {
                  val: 'DESCARTADO' as const,
                  title: 'Descartar sugerencia',
                  desc: 'Deja categoría y prioridad finales sin definir.',
                },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex items-start gap-3 p-3.5 rounded-[12px] border cursor-pointer transition-colors ${
                    decisionIa === opt.val
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-canvas)]/50 hover:border-[var(--border-strong)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="decisionIa"
                    checked={decisionIa === opt.val}
                    onChange={() => setDecisionIa(opt.val)}
                    className="mt-1 w-4 h-4 accent-[var(--brand-primary)]"
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {opt.title}
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {decisionIa === 'MODIFICADO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <FieldLabel htmlFor="rev-cat" required>
                    Categoría final
                  </FieldLabel>
                  <select
                    id="rev-cat"
                    value={modCategoriaId}
                    onChange={(e) => setModCategoriaId(Number(e.target.value))}
                    className={inputBaseClass}
                  >
                    <option value={0}>— Seleccione —</option>
                    {categorias
                      .filter((c) => c.activa)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor="rev-prio" required>
                    Prioridad final
                  </FieldLabel>
                  <select
                    id="rev-prio"
                    value={modPrioridadId}
                    onChange={(e) => setModPrioridadId(Number(e.target.value))}
                    className={inputBaseClass}
                  >
                    <option value={0}>— Seleccione —</option>
                    {prioridades.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <FieldError message={revisarError} />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PrimaryButton type="submit" loading={savingModal}>
                {savingModal ? 'Guardando…' : 'Registrar decisión'}
              </PrimaryButton>
              <OutlineButton onClick={() => setModalRevisarIaOpen(false)}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Evidence Lightbox modal */}
      <ModalDialog
        open={!!lightboxImg}
        title={lightboxImg?.nombre ?? 'Evidencia'}
        onClose={() => setLightboxImg(null)}
        maxWidth="max-w-[840px]"
      >
        {lightboxImg && (
          <div className="space-y-4">
            <img
              src={lightboxImg.src}
              alt={lightboxImg.nombre}
              referrerPolicy="no-referrer"
              className="w-full max-h-[65vh] object-contain rounded-[12px] bg-[var(--bg-canvas)]"
            />
            <div className="flex justify-end">
              <a
                href={lightboxImg.src}
                download={lightboxImg.nombre}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] text-[14px] font-semibold text-[var(--brand-primary-text)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Descargar imagen</span>
              </a>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
