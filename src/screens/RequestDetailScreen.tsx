import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  esEstadoFinal,
  formatearFecha,
  formatearTamano,
  MAX_FOTOS,
  MAX_PDFS,
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
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';
import { DecisionRevisionIa } from '../types/domain';
import { Download, FileText, Upload } from 'lucide-react';

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
      const check = validarArchivoEvidencia(file, fotosCount, pdfsCount);
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
    <div className="space-y-[48px]">
      {/* Top navigation / arrival confirmation (FIN-02 / FIN-03 / FIN-08) */}
      <div className="space-y-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <GhostButton onClick={() => navigate(isTecnico ? '/tecnico/solicitudes' : '/solicitudes')}>
            ← Volver al listado
          </GhostButton>
          {esNueva && puedeCrearSolicitud(currentUser) && (
            <div className="flex flex-wrap items-center gap-[12px]">
              <GhostButton onClick={() => navigate('/solicitudes/nueva')}>
                Registrar otra solicitud
              </GhostButton>
            </div>
          )}
        </div>

        {esNueva && (
          <div
            role="status"
            className="border border-deep-verdant/60 rounded-[12px] px-[18px] py-[14px] text-[15px] text-deep-verdant"
          >
            Solicitud {solicitud.codigo} registrada en estado Pendiente.
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-[24px] pb-[24px] border-b border-white/12">
          <div className="space-y-[12px]">
            <div className="flex flex-wrap items-center gap-[12px]">
              <span className="nav-label text-saffron-spark tabular-nums">
                {solicitud.codigo}
              </span>
              <span aria-hidden="true" className="text-ash-gray">·</span>
              <EstadoLabel estado={solicitud.estado} />
              <span aria-hidden="true" className="text-ash-gray">·</span>
              <span className="text-[13px] tabular-nums text-ash-gray">
                Creada {formatearFecha(solicitud.creadaEn)}
              </span>
            </div>

            <h1 className="text-[36px] sm:text-[48px] leading-[1.08] tracking-[-1.68px] text-bone-white">
              {recurso?.nombre ?? 'Recurso'}
            </h1>

            <p className="text-[15px] text-silver-mist">
              <span className="tabular-nums text-ash-gray">{recurso?.codigo}</span>
              <span aria-hidden="true" className="mx-[8px] text-ash-gray">·</span>
              <span>{tipoRecurso?.nombre}</span>
              <span aria-hidden="true" className="mx-[8px] text-ash-gray">·</span>
              <span>{recurso?.ubicacion}</span>
            </p>
          </div>

          {/* Primary Actions (Matriz 1.7 & Tabla 1.8) */}
          {!esEstadoFinal(solicitud.estado) && (
            <div className="flex flex-wrap items-center gap-[12px]">
              {puedeAsignar && (
                <PrimaryButton onClick={handleOpenAsignar}>
                  {asignacionVigente ? 'Cambiar técnico' : 'Asignar técnico'}
                </PrimaryButton>
              )}
              {puedeRegistrar && (
                <OutlineButton onClick={handleOpenTrabajo}>
                  {solicitud.trabajoRealizado
                    ? 'Actualizar trabajo realizado'
                    : 'Registrar trabajo realizado'}
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
        </div>
      </div>

      {/* Main 2-column content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[48px]">
        {/* Left 7 cols: Description, Work Registered, Closure reason, Evidences, AI Analysis */}
        <div className="lg:col-span-7 space-y-[48px]">
          <section className="space-y-[12px]">
            <h2 className="nav-label text-ash-gray">Descripción del problema</h2>
            <p className="body-ultralight text-bone-white whitespace-pre-line">
              {solicitud.descripcion}
            </p>
          </section>

          {/* Registro de trabajo realizado (Empleado Técnico / Administrador) */}
          <section className="space-y-[14px] border-t border-white/12 pt-[24px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="nav-label text-electric-iris">
                  Trabajo técnico realizado
                </h2>
                {solicitud.trabajoActualizadoEn && (
                  <p className="text-[12px] text-ash-gray tabular-nums mt-[2px]">
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
              <div className="border border-white/12 bg-white/[0.02] rounded-[16px] p-[18px]">
                <p className="body-ultralight text-bone-white whitespace-pre-line">
                  {solicitud.trabajoRealizado}
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-ash-gray">
                {isTecnico
                  ? 'Aún no ha registrado el detalle del trabajo realizado en esta solicitud.'
                  : 'Pendiente de registro por el área técnica.'}
              </p>
            )}
          </section>

          {solicitud.motivoCierre && (
            <section className="space-y-[12px] border-t border-white/12 pt-[24px]">
              <h2 className="nav-label text-saffron-spark">
                {solicitud.estado === 'Finalizada'
                  ? 'Observación de cierre'
                  : `Motivo de ${solicitud.estado.toLowerCase()}`}
              </h2>
              <p className="body-ultralight text-bone-white">
                {solicitud.motivoCierre}
              </p>
            </section>
          )}

          {/* Evidencias (HU-07, HU-10) */}
          <section className="space-y-[18px] border-t border-white/12 pt-[30px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[24px] tracking-[-0.48px] text-bone-white">
                Evidencias ({solicitudEvidencias.length})
              </h2>

              {puedeAdjuntar && (
                <label className="inline-flex items-center gap-[8px] text-[14px] text-electric-iris hover:underline cursor-pointer">
                  <Upload className="w-4 h-4" />
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
              <EmptyState
                title="No se adjuntaron evidencias"
                description={
                  puedeAdjuntar
                    ? 'Puede agregar fotografías (JPEG/PNG) o documentos PDF mientras el estado lo permita.'
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
                {solicitudEvidencias.map((ev) => (
                  <div
                    key={ev.id}
                    className="border border-white/15 rounded-[18px] overflow-hidden flex flex-col justify-between"
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
                        className="w-full h-[180px] overflow-hidden bg-black cursor-pointer group"
                      >
                        <img
                          src={ev.dataUrl}
                          alt={ev.nombreOriginal}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-150"
                        />
                      </button>
                    ) : (
                      <a
                        href={ev.dataUrl}
                        download={ev.nombreOriginal}
                        className="h-[110px] flex flex-col items-center justify-center gap-[8px] hover:bg-white/[0.03] transition-colors"
                      >
                        <FileText className="w-7 h-7 text-saffron-spark" />
                        <span className="text-[13px] text-bone-white underline">
                          Descargar PDF
                        </span>
                      </a>
                    )}

                    <div className="p-[14px] border-t border-white/10 flex items-center justify-between gap-[10px]">
                      <div className="min-w-0">
                        <p className="text-[14px] text-bone-white truncate">
                          {ev.nombreOriginal}
                        </p>
                        <p className="text-[12px] tabular-nums text-ash-gray">
                          {formatearTamano(ev.tamanoBytes)} · {formatearFecha(ev.subidaEn)}
                        </p>
                      </div>
                      <a
                        href={ev.dataUrl}
                        download={ev.nombreOriginal}
                        aria-label={`Descargar ${ev.nombreOriginal}`}
                        className="text-ash-gray hover:text-bone-white p-2 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Análisis de IA (Fase 5 - M6, RC-07 — solo visible para Administrador y Empleado Técnico) */}
          {!isCliente && (
          <section className="space-y-[18px] border-t border-white/12 pt-[30px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="nav-label text-saffron-spark">M6 · Apoyo de clasificación (Fase 5)</p>
                <h2 className="text-[24px] tracking-[-0.48px] text-bone-white mt-[4px]">
                  Análisis de IA
                </h2>
              </div>

              {isAdmin && iaHabilitada && (
                <div className="flex flex-wrap items-center gap-[12px]">
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
                      Analizar con IA
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
              <p className="body-ultralight text-ash-gray">
                El análisis automático no está disponible. El Administrador puede continuar el flujo manualmente sin restricciones.
              </p>
            ) : !ultimoAnalisis ? (
              <p className="body-ultralight text-ash-gray">
                Aún no hay análisis registrado para esta solicitud.
              </p>
            ) : ultimoAnalisis.estadoAnalisis === 'EN_COLA' ? (
              <div className="border border-electric-iris/40 rounded-[18px] p-[20px] space-y-[6px]">
                <p className="text-[15px] text-electric-iris">
                  Análisis de IA en proceso…
                </p>
                <p className="text-[14px] text-silver-mist">
                  El sistema evalúa la descripción y evidencias en segundo plano sin bloquear su trabajo.
                </p>
              </div>
            ) : ultimoAnalisis.estadoAnalisis === 'FALLIDO' ? (
              <div className="border border-saffron-spark/50 rounded-[18px] p-[20px] space-y-[8px]">
                <p className="text-[15px] text-saffron-spark">
                  No se pudo completar el análisis (v{ultimoAnalisis.version})
                </p>
                <p className="text-[14px] text-silver-mist">
                  {ultimoAnalisis.errorDetalle ?? 'Error al contactar al servicio externo.'}
                </p>
              </div>
            ) : (
              <div className="border border-white/15 rounded-[18px] p-[24px] space-y-[18px]">
                <div className="flex flex-wrap items-center justify-between gap-[12px] text-[13px]">
                  <span className="text-saffron-spark uppercase tracking-[0.35px] font-semibold">
                    Sugerencia de IA · v{ultimoAnalisis.version}
                  </span>
                  <span
                    className={
                      ultimoAnalisis.decisionRevision === 'PENDIENTE'
                        ? 'text-saffron-spark'
                        : ultimoAnalisis.decisionRevision === 'ACEPTADO'
                        ? 'text-deep-verdant'
                        : 'text-silver-mist'
                    }
                  >
                    {ultimoAnalisis.decisionRevision === 'PENDIENTE'
                      ? 'Pendiente de revisión'
                      : `Revisión: ${ultimoAnalisis.decisionRevision}`}
                  </span>
                </div>

                <div className="space-y-[6px]">
                  <p className="text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                    Tipo de daño identificado
                  </p>
                  <p className="text-[18px] text-bone-white">
                    {ultimoAnalisis.tipoDano}
                  </p>
                </div>

                <div className="space-y-[6px]">
                  <p className="text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                    Descripción observada
                  </p>
                  <p className="body-ultralight text-silver-mist">
                    {ultimoAnalisis.descripcionObservada}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] pt-[6px] border-t border-white/10">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                      Categoría sugerida
                    </p>
                    <p className="text-[16px] text-bone-white mt-[4px]">
                      {categorias.find(
                        (c) => c.id === ultimoAnalisis.categoriaSugeridaId
                      )?.nombre ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                      Prioridad sugerida
                    </p>
                    <div className="mt-[4px]">
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
                  <p className="text-[12px] text-ash-gray pt-[6px] border-t border-white/10">
                    Revisado el {formatearFecha(ultimoAnalisis.revisadoEn)} por{' '}
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
                  </p>
                )}

                {versionesIa.length > 1 && (
                  <details className="pt-[8px] text-[13px] text-ash-gray">
                    <summary className="cursor-pointer hover:text-bone-white">
                      Ver historial de versiones de análisis ({versionesIa.length})
                    </summary>
                    <ul className="mt-[10px] space-y-[6px] border-t border-white/10 pt-[10px]">
                      {versionesIa.map((v) => (
                        <li key={v.id} className="tabular-nums">
                          v{v.version} · {v.estadoAnalisis} · {formatearFecha(v.creadoEn)} ·{' '}
                          {v.decisionRevision}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </section>
          )}
        </div>

        {/* Right 5 cols: Summary metadata & State history */}
        <aside className="lg:col-span-5 space-y-[36px]">
          <div className="border border-white/12 rounded-[24px] p-[24px] space-y-[18px]">
            <h2 className="nav-label text-ash-gray">Información de la solicitud</h2>

            <dl className="divide-y divide-white/10 text-[15px]">
              {!isCliente && (
                <div className="py-[12px] flex justify-between gap-4">
                  <dt className="text-ash-gray">Solicitante</dt>
                  <dd className="text-right text-bone-white">
                    {solicitante
                      ? `${solicitante.nombres} ${solicitante.apellidos}${
                          !solicitante.activo ? ' (inactivo)' : ''
                        }`
                      : '—'}
                  </dd>
                </div>
              )}

              {!isCliente && registradaPorOtro && registradorEmp && (
                <div className="py-[12px] flex justify-between gap-4">
                  <dt className="text-ash-gray">Registrada por</dt>
                  <dd className="text-right text-silver-mist">
                    {registradorEmp.nombres} {registradorEmp.apellidos} (Administrador)
                  </dd>
                </div>
              )}

              <div className="py-[12px] flex justify-between gap-4">
                <dt className="text-ash-gray">
                  {isCliente ? 'Atención técnica' : 'Técnico asignado'}
                </dt>
                <dd className="text-right text-bone-white">
                  {isCliente
                    ? asignacionVigente
                      ? 'Personal técnico asignado'
                      : 'Pendiente de asignación'
                    : tecnicoVigente
                    ? `${tecnicoVigente.nombres} ${tecnicoVigente.apellidos}`
                    : 'Sin asignar'}
                </dd>
              </div>

              <div className="py-[12px] flex justify-between gap-4">
                <dt className="text-ash-gray">Categoría final</dt>
                <dd className="text-right text-bone-white">
                  {categoriaFinal?.nombre ?? (
                    <span className="text-ash-gray">Sin definir</span>
                  )}
                </dd>
              </div>

              <div className="py-[12px] flex justify-between gap-4">
                <dt className="text-ash-gray">Prioridad final</dt>
                <dd className="text-right">
                  <PrioridadLabel prioridad={prioridadFinal?.nombre} />
                </dd>
              </div>

              {solicitud.cerradaEn && (
                <div className="py-[12px] flex justify-between gap-4">
                  <dt className="text-ash-gray">Fecha de cierre</dt>
                  <dd className="text-right tabular-nums text-silver-mist">
                    {formatearFecha(solicitud.cerradaEn)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Historial de estados (PRD 1.8) */}
          <div className="space-y-[18px]">
            <h2 className="nav-label text-ash-gray">Historial de estados</h2>
            <ol className="border-t border-white/12 divide-y divide-white/10">
              {solicitudHistorial.map((h) => {
                const usr = !isCliente
                  ? usuarios.find((u) => u.id === h.usuarioId)
                  : undefined;
                const emp =
                  !isCliente && usr
                    ? empleados.find((e) => e.id === usr.empleadoId)
                    : undefined;

                return (
                  <li key={h.id} className="py-[14px] space-y-[4px]">
                    <div className="flex items-center justify-between gap-2 text-[14px]">
                      <span className="text-bone-white">
                        {h.estadoAnterior
                          ? `${h.estadoAnterior} → ${h.estadoNuevo}`
                          : `Creada en ${h.estadoNuevo}`}
                      </span>
                      <span className="tabular-nums text-[12px] text-ash-gray">
                        {formatearFecha(h.cambiadoEn)}
                      </span>
                    </div>
                    {!isCliente && (
                      <p className="text-[13px] text-silver-mist">
                        Por {emp ? `${emp.nombres} ${emp.apellidos}` : 'Sistema'}
                      </p>
                    )}
                    {h.motivo && !isCliente && (
                      <p className="text-[13px] text-ash-gray italic">
                        “{h.motivo}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      {/* Diálogo Registrar o actualizar trabajo realizado (Empleado Técnico / Administrador) */}
      <ModalDialog
        open={modalTrabajoOpen}
        title={
          solicitud.trabajoRealizado
            ? 'Actualizar trabajo realizado'
            : 'Registrar trabajo realizado'
        }
        onClose={() => setModalTrabajoOpen(false)}
      >
        <form onSubmit={handleConfirmTrabajo} className="space-y-[18px]">
          <p className="body-ultralight text-silver-mist">
            Documente las acciones de diagnóstico, reparación o repuestos utilizados en la solicitud{' '}
            <strong className="text-bone-white font-normal">{solicitud.codigo}</strong>.
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

          <div className="flex items-center gap-[12px] pt-[6px]">
            <PrimaryButton type="submit" disabled={savingModal}>
              {savingModal ? 'Guardando…' : 'Guardar registro'}
            </PrimaryButton>
            <OutlineButton onClick={() => setModalTrabajoOpen(false)}>
              Cancelar
            </OutlineButton>
          </div>
        </form>
      </ModalDialog>

      {/* P-07 Diálogo Asignar o reasignar técnico (RC-04) */}
      <ModalDialog
        open={modalAsignarOpen}
        title={asignacionVigente ? 'Cambiar técnico asignado' : 'Asignar técnico'}
        onClose={() => setModalAsignarOpen(false)}
      >
        {tecnicosActivos.length === 0 ? (
          <div className="space-y-[18px]">
            <p className="body-ultralight text-saffron-spark">
              No hay empleados marcados como técnicos.
            </p>
            <div className="flex flex-wrap gap-[12px]">
              <PrimaryButton onClick={() => navigate('/admin/empleados')}>
                Ir a empleados para marcar técnico
              </PrimaryButton>
              <OutlineButton onClick={() => setModalAsignarOpen(false)}>
                Cerrar
              </OutlineButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmAsignar} className="space-y-[18px]">
            <p className="body-ultralight text-silver-mist">
              Seleccione un Empleado Técnico activo. Se muestra la carga actual de solicitudes en estado Asignada o En proceso.
            </p>

            <div className="space-y-[8px] max-h-[280px] overflow-y-auto">
              {tecnicosActivos.map((tec) => {
                const carga = asignaciones.filter((a) => {
                  if (!a.vigente || a.tecnicoId !== tec.id) return false;
                  const s = solicitudes.find((sol) => sol.id === a.solicitudId);
                  return s && (s.estado === 'Asignada' || s.estado === 'En proceso');
                }).length;

                return (
                  <label
                    key={tec.id}
                    className={`flex items-center justify-between gap-[12px] p-[14px] rounded-[12px] border cursor-pointer transition-colors ${
                      selectedTecnicoId === tec.id
                        ? 'border-electric-iris bg-electric-iris/10'
                        : 'border-white/15 hover:border-white/35'
                    }`}
                  >
                    <div className="flex items-center gap-[12px]">
                      <input
                        type="radio"
                        name="tecnicoId"
                        checked={selectedTecnicoId === tec.id}
                        onChange={() => setSelectedTecnicoId(tec.id)}
                        className="accent-electric-iris"
                      />
                      <div>
                        <p className="text-[15px] text-bone-white">
                          {tec.nombres} {tec.apellidos}
                        </p>
                        <p className="text-[13px] text-ash-gray">{tec.cargo}</p>
                      </div>
                    </div>
                    <span className="text-[13px] tabular-nums text-silver-mist">
                      {carga} activa(s)
                    </span>
                  </label>
                );
              })}
            </div>

            <FieldError message={asignarError} />

            <div className="flex items-center gap-[12px] pt-[6px]">
              <PrimaryButton type="submit" disabled={savingModal}>
                {savingModal ? 'Guardando…' : 'Asignar'}
              </PrimaryButton>
              <OutlineButton onClick={() => setModalAsignarOpen(false)}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* P-08 Diálogo Cambiar estado (RC-05, RC-06) */}
      <ModalDialog
        open={!!transicionActiva}
        title={transicionActiva?.etiqueta ?? 'Cambiar estado'}
        onClose={() => setTransicionActiva(null)}
      >
        {transicionActiva && (
          <form onSubmit={handleConfirmTransicion} className="space-y-[18px]">
            <p className="body-ultralight text-silver-mist">
              La solicitud <strong className="text-bone-white font-normal">{solicitud.codigo}</strong> pasará de{' '}
              <strong className="text-bone-white font-normal">{solicitud.estado}</strong> a{' '}
              <strong className="text-bone-white font-normal">{transicionActiva.destino}</strong>.
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

            <div className="flex items-center gap-[12px] pt-[6px]">
              <PrimaryButton type="submit" disabled={savingModal}>
                {savingModal ? 'Guardando…' : 'Confirmar'}
              </PrimaryButton>
              <OutlineButton onClick={() => setTransicionActiva(null)}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* P-09 Diálogo Revisar análisis de IA (RC-07, HU-17) */}
      <ModalDialog
        open={modalRevisarIaOpen}
        title="Revisar análisis de IA"
        onClose={() => setModalRevisarIaOpen(false)}
      >
        {ultimoAnalisis && (
          <form onSubmit={handleConfirmRevisarIa} className="space-y-[20px]">
            <div className="border border-white/12 rounded-[12px] p-[14px] text-[14px] space-y-[4px]">
              <p className="text-ash-gray">Sugerencia de IA:</p>
              <p className="text-bone-white">
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

            <div className="space-y-[10px]">
              <label className="flex items-start gap-[10px] cursor-pointer">
                <input
                  type="radio"
                  name="decisionIa"
                  checked={decisionIa === 'ACEPTADO'}
                  onChange={() => setDecisionIa('ACEPTADO')}
                  className="mt-1 accent-electric-iris"
                />
                <div>
                  <p className="text-[15px] text-bone-white">Aceptar sugerencia</p>
                  <p className="text-[13px] text-ash-gray">
                    Copia categoría y prioridad sugeridas como valores finales.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-[10px] cursor-pointer">
                <input
                  type="radio"
                  name="decisionIa"
                  checked={decisionIa === 'MODIFICADO'}
                  onChange={() => setDecisionIa('MODIFICADO')}
                  className="mt-1 accent-electric-iris"
                />
                <div>
                  <p className="text-[15px] text-bone-white">Modificar manualmente</p>
                  <p className="text-[13px] text-ash-gray">
                    Fija otra categoría o prioridad conservando la sugerencia original.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-[10px] cursor-pointer">
                <input
                  type="radio"
                  name="decisionIa"
                  checked={decisionIa === 'DESCARTADO'}
                  onChange={() => setDecisionIa('DESCARTADO')}
                  className="mt-1 accent-electric-iris"
                />
                <div>
                  <p className="text-[15px] text-bone-white">Descartar sugerencia</p>
                  <p className="text-[13px] text-ash-gray">
                    Deja categoría y prioridad finales sin definir.
                  </p>
                </div>
              </label>
            </div>

            {decisionIa === 'MODIFICADO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] pt-[6px]">
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

            <div className="flex items-center gap-[12px] pt-[6px]">
              <PrimaryButton type="submit" disabled={savingModal}>
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
        maxWidth="max-w-[820px]"
      >
        {lightboxImg && (
          <div className="space-y-[18px]">
            <img
              src={lightboxImg.src}
              alt={lightboxImg.nombre}
              referrerPolicy="no-referrer"
              className="w-full max-h-[65vh] object-contain rounded-[12px] bg-black"
            />
            <div className="flex justify-end">
              <a
                href={lightboxImg.src}
                download={lightboxImg.nombre}
                className="inline-flex items-center gap-[8px] text-[14px] text-saffron-spark hover:underline"
              >
                <Download className="w-4 h-4" />
                Descargar imagen
              </a>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
