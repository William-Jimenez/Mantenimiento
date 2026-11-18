package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.AnalisisIA;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalisisIARepository extends JpaRepository<AnalisisIA, Long> {
    List<AnalisisIA> findBySolicitudIdOrderByVersionDesc(Long solicitudId);
    Optional<AnalisisIA> findTopBySolicitudIdOrderByVersionDesc(Long solicitudId);
}
