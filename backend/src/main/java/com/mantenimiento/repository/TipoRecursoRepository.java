package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.TipoRecurso;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TipoRecursoRepository extends JpaRepository<TipoRecurso, Long> {
    Optional<TipoRecurso> findByNombreIgnoreCase(String nombre);
}
