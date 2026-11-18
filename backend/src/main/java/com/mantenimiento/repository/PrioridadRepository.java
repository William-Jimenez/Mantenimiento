package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Prioridad;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PrioridadRepository extends JpaRepository<Prioridad, Long> {
    Optional<Prioridad> findByNombreIgnoreCase(String nombre);
    List<Prioridad> findAllByOrderByNivelAsc();
}
