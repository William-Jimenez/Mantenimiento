import React, { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  EmptyState,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';

export function CategoriesScreen() {
  const {
    isAdmin,
    categorias,
    crearCategoria,
    renombrarCategoria,
    toggleCategoriaActiva,
  } = useApp();

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear(null);
    const res = crearCategoria(nuevoNombre);
    if (!res.ok) {
      setErrorCrear(res.error ?? 'Error al crear la categoría.');
      return;
    }
    setNuevoNombre('');
  };

  const handleGuardarEdicion = (id: number) => {
    setErrorEdit(null);
    const res = renombrarCategoria(id, editingNombre);
    if (!res.ok) {
      setErrorEdit(res.error ?? 'Error al renombrar.');
      return;
    }
    setEditingId(null);
  };

  return (
    <section className="max-w-[840px] space-y-6">
      <PageHeader
        eyebrow="Administración · Catálogo SU-06"
        title="Categorías"
        description="Administre el catálogo de categorías utilizado tanto en la clasificación manual como en la validación de sugerencias de IA. Las categorías desactivadas se conservan en el histórico."
      />

      {/* Add new category */}
      <SurfaceCard>
        <form
          onSubmit={handleCrear}
          className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <FieldLabel htmlFor="cat-nueva">Nueva categoría</FieldLabel>
            <input
              id="cat-nueva"
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Refrigeración"
              className={inputBaseClass}
            />
            <FieldError message={errorCrear} />
          </div>
          <PrimaryButton type="submit" className="shrink-0">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Agregar categoría</span>
          </PrimaryButton>
        </form>
      </SurfaceCard>

      {categorias.length === 0 ? (
        <EmptyState title="No hay categorías registradas" />
      ) : (
        <SurfaceCard padded={false} className="overflow-hidden divide-y divide-[var(--border-subtle)]">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/40 transition-colors"
            >
              {editingId === cat.id ? (
                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      aria-label="Editar nombre de categoría"
                      value={editingNombre}
                      onChange={(e) => setEditingNombre(e.target.value)}
                      className={inputBaseClass}
                    />
                    <FieldError message={errorEdit} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PrimaryButton onClick={() => handleGuardarEdicion(cat.id)}>
                      Guardar
                    </PrimaryButton>
                    <OutlineButton
                      onClick={() => {
                        setEditingId(null);
                        setErrorEdit(null);
                      }}
                    >
                      Cancelar
                    </OutlineButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] shrink-0"
                    >
                      <Tag className="w-4 h-4" />
                    </span>
                    <span className="text-[16px] font-semibold text-[var(--text-primary)]">
                      {cat.nombre}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border text-[12px] font-semibold ${
                        cat.activa
                          ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full ${
                          cat.activa
                            ? 'bg-[var(--status-success-text)]'
                            : 'bg-[var(--text-muted)]'
                        }`}
                      />
                      {cat.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GhostButton
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditingNombre(cat.nombre);
                        setErrorEdit(null);
                      }}
                    >
                      Renombrar
                    </GhostButton>
                    <GhostButton onClick={() => toggleCategoriaActiva(cat.id)}>
                      {cat.activa ? 'Desactivar' : 'Activar'}
                    </GhostButton>
                  </div>
                </>
              )}
            </div>
          ))}
        </SurfaceCard>
      )}
    </section>
  );
}
