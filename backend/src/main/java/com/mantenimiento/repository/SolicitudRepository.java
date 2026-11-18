package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {
    Optional<Solicitud> findByCodigoIgnoreCase(String codigo);
    List<Solicitud> findBySolicitanteIdOrderByCreadaEnDesc(Long solicitanteId);

    @Query("""
        SELECT DISTINCT s FROM Solicitud s
        LEFT JOIN s.asignaciones a
        WHERE s.solicitante.id = :empleadoId
           OR (a.tecnico.id = :empleadoId AND a.vigente = true)
        ORDER BY s.creadaEn DESC
    """)
    List<Solicitud> findAssignedOrCreatedByEmpleado(@Param("empleadoId") Long empleadoId);

    List<Solicitud> findAllByOrderByCreadaEnDesc();
}
