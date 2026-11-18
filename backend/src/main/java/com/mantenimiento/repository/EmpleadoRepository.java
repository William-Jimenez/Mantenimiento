package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    Optional<Empleado> findByCorreoIgnoreCase(String correo);
    Optional<Empleado> findByDocumento(String documento);
    boolean existsByCorreoIgnoreCase(String correo);
    boolean existsByDocumento(String documento);
    List<Empleado> findByEsTecnicoTrueAndActivoTrue();
}
