import React, { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AlertBanner,
  EmptyState,
  FieldError,
  FieldLabel,
  FilterChip,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';

export function ResourcesListScreen() {
  const { isAdmin, recursos, tiposRecurso, navigate, toggleRecursoActivo } = useApp();
  const [tipoFiltro, setTipoFiltro] = useState<number>(0);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;

  const filtrados = recursos.filter((r) =>
    tipoFiltro === 0 ? true : r.tipoRecursoId === tipoFiltro
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Administración · M2"
        title="Recursos"
        description="Equipos tecnológicos, instalaciones, maquinaria y herramientas disponibles para asociar a solicitudes. Los recursos con historial se desactivan en lugar de eliminarse."
        actions={
          <PrimaryButton onClick={() => navigate('/admin/recursos/nuevo')}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nuevo recurso</span>
          </PrimaryButton>
        }
      />

      {/* Filter by resource type */}
      <SurfaceCard className="flex flex-wrap items-center gap-2">
        <FilterChip active={tipoFiltro === 0} onClick={() => setTipoFiltro(0)}>
          Todos ({recursos.length})
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
      </SurfaceCard>

      {filtrados.length === 0 ? (
        <EmptyState
          title="No hay recursos registrados"
          description="Registre un recurso y su tipo para que los empleados puedan seleccionarlo en nuevas solicitudes."
          action={
            <PrimaryButton onClick={() => navigate('/admin/recursos/nuevo')}>
              Registrar recurso
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <SurfaceCard padded={false} className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)]/70 border-b border-[var(--border-subtle)] text-[12px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    <th className="py-3.5 pl-5 pr-4 font-semibold">Código</th>
                    <th className="py-3.5 px-4 font-semibold">Nombre</th>
                    <th className="py-3.5 px-4 font-semibold">Tipo</th>
                    <th className="py-3.5 px-4 font-semibold">Ubicación</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 pl-4 pr-5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[14px]">
                  {filtrados.map((rec) => {
                    const tipo = tiposRecurso.find((t) => t.id === rec.tipoRecursoId);
                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                      >
                        <td className="py-4 pl-5 pr-4 whitespace-nowrap">
                          <span className="font-mono-code text-[12px] font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--status-warning-text)]">
                            {rec.codigo}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">
                          {rec.nombre}
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)] text-[13px]">
                          {tipo?.nombre ?? '—'}
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)] text-[13px]">
                          {rec.ubicacion}
                        </td>
                        <td className="py-4 px-4 text-[13px]">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border text-[12px] font-semibold ${
                              rec.activo
                                ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                                : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full ${
                                rec.activo
                                  ? 'bg-[var(--status-success-text)]'
                                  : 'bg-[var(--text-muted)]'
                              }`}
                            />
                            {rec.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <GhostButton onClick={() => toggleRecursoActivo(rec.id)}>
                              {rec.activo ? 'Desactivar' : 'Activar'}
                            </GhostButton>
                            <GhostButton onClick={() => navigate(`/admin/recursos/${rec.id}`)}>
                              Editar
                            </GhostButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map((rec) => {
              const tipo = tiposRecurso.find((t) => t.id === rec.tipoRecursoId);
              return (
                <SurfaceCard key={rec.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-[12px] font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--status-warning-text)]">
                      {rec.codigo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold ${
                        rec.activo
                          ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                      }`}
                    >
                      {rec.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[var(--text-primary)]">{rec.nombre}</p>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                      <span>{tipo?.nombre ?? '—'}</span>
                      <span aria-hidden="true" className="text-[var(--border-strong)]">·</span>
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                      <span className="truncate">{rec.ubicacion}</span>
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
                    <OutlineButton
                      onClick={() => toggleRecursoActivo(rec.id)}
                      className="!min-h-[38px] !py-1.5 !px-3 !text-[13px]"
                    >
                      {rec.activo ? 'Desactivar' : 'Activar'}
                    </OutlineButton>
                    <GhostButton onClick={() => navigate(`/admin/recursos/${rec.id}`)}>
                      Editar
                    </GhostButton>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export function ResourceFormScreen({ recursoId }: { recursoId?: number }) {
  const { isAdmin, recursos, tiposRecurso, guardarRecurso, navigate } = useApp();
  const existing = recursoId ? recursos.find((r) => r.id === recursoId) : undefined;

  const [codigo, setCodigo] = useState(existing?.codigo ?? '');
  const [nombre, setNombre] = useState(existing?.nombre ?? '');
  const [tipoRecursoId, setTipoRecursoId] = useState<number>(
    existing?.tipoRecursoId ?? tiposRecurso[0]?.id ?? 1
  );
  const [ubicacion, setUbicacion] = useState(existing?.ubicacion ?? '');
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '');
  const [activo, setActivo] = useState(existing?.activo ?? true);
  const [errorInfo, setErrorInfo] = useState<{ campo?: string; mensaje: string } | null>(null);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;
  if (recursoId && !existing) return <ErrorScreen tipo="no-encontrado" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    const res = guardarRecurso({
      id: existing?.id,
      codigo,
      nombre,
      tipoRecursoId,
      ubicacion,
      descripcion,
      activo,
    });
    if (!res.ok) {
      setErrorInfo({ campo: res.campo, mensaje: res.error ?? 'Error al guardar.' });
      return;
    }
    navigate('/admin/recursos');
  };

  return (
    <section className="max-w-[720px] space-y-6">
      <PageHeader
        backAction={
          <GhostButton onClick={() => navigate('/admin/recursos')} className="-ml-2.5">
            ← Volver a recursos
          </GhostButton>
        }
        eyebrow="Administración · M2"
        title={existing ? 'Editar recurso' : 'Nuevo recurso'}
      />

      {errorInfo && !errorInfo.campo && (
        <AlertBanner variant="error">{errorInfo.mensaje}</AlertBanner>
      )}

      <SurfaceCard>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="rec-codigo" required>
                Código único
              </FieldLabel>
              <input
                id="rec-codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: REC-TI-015"
                className={`${inputBaseClass} font-mono-code`}
              />
              <FieldError message={errorInfo?.campo === 'codigo' ? errorInfo.mensaje : null} />
            </div>

            <div>
              <FieldLabel htmlFor="rec-tipo" required>
                Tipo de recurso
              </FieldLabel>
              <select
                id="rec-tipo"
                value={tipoRecursoId}
                onChange={(e) => setTipoRecursoId(Number(e.target.value))}
                className={inputBaseClass}
              >
                {tiposRecurso.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="rec-nombre" required>
              Nombre del recurso
            </FieldLabel>
            <input
              id="rec-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputBaseClass}
            />
          </div>

          <div>
            <FieldLabel htmlFor="rec-ubicacion" required>
              Ubicación
            </FieldLabel>
            <input
              id="rec-ubicacion"
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Edificio Administrativo — Piso 3"
              className={inputBaseClass}
            />
          </div>

          <div>
            <FieldLabel htmlFor="rec-desc">Descripción</FieldLabel>
            <textarea
              id="rec-desc"
              rows={3}
              maxLength={500}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputBaseClass}
            />
          </div>

          {existing && (
            <label className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-4 h-4 accent-[var(--brand-primary)]"
              />
              <span className="text-[14px] font-medium text-[var(--text-primary)]">
                Recurso activo
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <PrimaryButton type="submit">Guardar recurso</PrimaryButton>
            <OutlineButton onClick={() => navigate('/admin/recursos')}>Cancelar</OutlineButton>
          </div>
        </form>
      </SurfaceCard>
    </section>
  );
}
