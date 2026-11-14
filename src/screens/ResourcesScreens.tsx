import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  EmptyState,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PrimaryButton,
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
    <section className="space-y-[36px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[24px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">Administración · M2</p>
          <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            Recursos
          </h1>
          <p className="body-ultralight text-silver-mist max-w-[580px]">
            Equipos tecnológicos, instalaciones, maquinaria y herramientas disponibles para asociar a solicitudes. Los recursos con historial se desactivan en lugar de eliminarse.
          </p>
        </div>
        <PrimaryButton onClick={() => navigate('/admin/recursos/nuevo')}>
          Nuevo recurso
        </PrimaryButton>
      </div>

      {/* Filter by resource type */}
      <div className="flex flex-wrap items-center gap-[10px] pb-[18px] border-b border-white/12">
        <button
          type="button"
          onClick={() => setTipoFiltro(0)}
          className={`px-[14px] py-[8px] rounded-[24px] text-[14px] cursor-pointer transition-colors ${
            tipoFiltro === 0
              ? 'bg-electric-iris text-bone-white'
              : 'text-ash-gray hover:text-bone-white border border-white/15'
          }`}
        >
          Todos ({recursos.length})
        </button>
        {tiposRecurso.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTipoFiltro(t.id)}
            className={`px-[14px] py-[8px] rounded-[24px] text-[14px] cursor-pointer transition-colors ${
              tipoFiltro === t.id
                ? 'bg-electric-iris text-bone-white'
                : 'text-ash-gray hover:text-bone-white border border-white/15'
            }`}
          >
            {t.nombre}
          </button>
        ))}
      </div>

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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                <th className="py-[12px] pr-[18px] font-semibold">Código</th>
                <th className="py-[12px] pr-[18px] font-semibold">Nombre</th>
                <th className="py-[12px] pr-[18px] font-semibold">Tipo</th>
                <th className="py-[12px] pr-[18px] font-semibold">Ubicación</th>
                <th className="py-[12px] pr-[18px] font-semibold">Estado</th>
                <th className="py-[12px] text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[15px]">
              {filtrados.map((rec) => {
                const tipo = tiposRecurso.find((t) => t.id === rec.tipoRecursoId);
                return (
                  <tr key={rec.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-[16px] pr-[18px] tabular-nums text-silver-mist whitespace-nowrap">
                      {rec.codigo}
                    </td>
                    <td className="py-[16px] pr-[18px] text-bone-white">{rec.nombre}</td>
                    <td className="py-[16px] pr-[18px] text-silver-mist text-[14px]">
                      {tipo?.nombre ?? '—'}
                    </td>
                    <td className="py-[16px] pr-[18px] text-silver-mist text-[14px]">
                      {rec.ubicacion}
                    </td>
                    <td className="py-[16px] pr-[18px] text-[14px]">
                      <span className={rec.activo ? 'text-deep-verdant' : 'text-ash-gray'}>
                        {rec.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-[16px] text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[12px]">
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
    <section className="max-w-[680px] space-y-[36px]">
      <div className="space-y-[12px]">
        <GhostButton onClick={() => navigate('/admin/recursos')}>
          ← Volver a recursos
        </GhostButton>
        <h1 className="text-[42px] leading-[1.1] tracking-[-1.68px] text-bone-white">
          {existing ? 'Editar recurso' : 'Nuevo recurso'}
        </h1>
      </div>

      {errorInfo && !errorInfo.campo && (
        <div role="alert" className="border border-saffron-spark/60 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark">
          {errorInfo.mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-[24px]" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
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
              className={inputBaseClass}
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
          <label className="flex items-center gap-[12px] cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 accent-electric-iris"
            />
            <span className="text-[16px] text-bone-white">Recurso activo</span>
          </label>
        )}

        <div className="flex items-center gap-[18px] pt-[12px]">
          <PrimaryButton type="submit">Guardar recurso</PrimaryButton>
          <OutlineButton onClick={() => navigate('/admin/recursos')}>Cancelar</OutlineButton>
        </div>
      </form>
    </section>
  );
}
