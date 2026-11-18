package com.mantenimiento.repository;

import com.mantenimiento.domain.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmpleadoCorreoIgnoreCase(String correo);
    Optional<Usuario> findByEmpleadoId(Long empleadoId);
}
