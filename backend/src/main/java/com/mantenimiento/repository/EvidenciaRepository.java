package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Evidencia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {
    List<Evidencia> findBySolicitudIdOrderBySubidaEnDesc(Long solicitudId);
}
