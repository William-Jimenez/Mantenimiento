package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Recurso;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RecursoRepository extends JpaRepository<Recurso, Long> {
    Optional<Recurso> findByCodigoIgnoreCase(String codigo);
    boolean existsByCodigoIgnoreCase(String codigo);
    List<Recurso> findByActivoTrue();
}
