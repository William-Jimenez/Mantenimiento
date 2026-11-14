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
    <section className="max-w-[820px] space-y-[36px]">
      <div className="space-y-[12px]">
        <p className="nav-label text-saffron-spark">Administración · Catálogo SU-06</p>
        <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
          Categorías
        </h1>
        <p className="body-ultralight text-silver-mist max-w-[580px]">
          Administre el catálogo de categorías utilizado tanto en la clasificación manual como en la validación de sugerencias de IA. Las categorías desactivadas se conservan en el histórico.
        </p>
      </div>

      {/* Add new category */}
      <form onSubmit={handleCrear} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-[12px]">
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
        <PrimaryButton type="submit">Agregar categoría</PrimaryButton>
      </form>

      {categorias.length === 0 ? (
        <EmptyState title="No hay categorías registradas" />
      ) : (
        <div className="border-t border-white/12 divide-y divide-white/10">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="py-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]"
            >
              {editingId === cat.id ? (
                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-[12px]">
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
                  <div className="flex items-center gap-[8px]">
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
                  <div className="flex items-center gap-[12px]">
                    <span className="text-[18px] text-bone-white">{cat.nombre}</span>
                    <span aria-hidden="true" className="text-ash-gray">·</span>
                    <span className={`text-[14px] ${cat.activa ? 'text-deep-verdant' : 'text-ash-gray'}`}>
                      {cat.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex items-center gap-[12px]">
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
        </div>
      )}
    </section>
  );
}
