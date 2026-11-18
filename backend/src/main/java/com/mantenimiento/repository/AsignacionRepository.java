package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Asignacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AsignacionRepository extends JpaRepository<Asignacion, Long> {
    Optional<Asignacion> findBySolicitudIdAndVigenteTrue(Long solicitudId);
    List<Asignacion> findBySolicitudIdOrderByAsignadaEnDesc(Long solicitudId);
    List<Asignacion> findByTecnicoIdAndVigenteTrue(Long tecnicoId);
}
