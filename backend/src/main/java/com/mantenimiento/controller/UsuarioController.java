package com.mantenimiento.controller;

import com.mantenimiento.domain.entity.Empleado;
import com.mantenimiento.domain.entity.Usuario;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.dto.AuthDtos.UserProfileDto;
import com.mantenimiento.dto.UsuarioDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.EmpleadoRepository;
import com.mantenimiento.repository.UsuarioRepository;
import com.mantenimiento.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final EmpleadoRepository empleadoRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            EmpleadoRepository empleadoRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.empleadoRepository = empleadoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<List<UserProfileDto>> listarUsuarios() {
        List<UserProfileDto> usuarios = usuarioRepository.findAll().stream()
                .map(AuthService::toUserProfileDto)
                .toList();
        return ResponseEntity.ok(usuarios);
    }

    @PostMapping
    public ResponseEntity<UserProfileDto> crearUsuario(@Valid @RequestBody CreateUsuarioRequest request) {
        AuthService.validarPoliticaPassword(request.password());

        String correo = request.correo().trim().toLowerCase();
        if (empleadoRepository.existsByCorreoIgnoreCase(correo)) {
            throw new ApiException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
        }
        if (empleadoRepository.existsByDocumento(request.documento().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "El documento de identidad ya está registrado");
        }

        PerfilUsuario perfil;
        try {
            perfil = PerfilUsuario.valueOf(request.perfil().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Perfil inválido. Use ADMINISTRADOR, EMPLEADO o CLIENTE");
        }

        Empleado empleado = new Empleado(
                request.documento().trim(),
                request.nombres().trim(),
                request.apellidos().trim(),
                correo,
                request.cargo().trim(),
                request.esTecnico() || perfil == PerfilUsuario.EMPLEADO
        );
        empleado = empleadoRepository.save(empleado);

        Usuario usuario = new Usuario(
                empleado,
                perfil,
                passwordEncoder.encode(request.password()),
                false
        );
        usuario = usuarioRepository.save(usuario);

        return ResponseEntity.status(HttpStatus.CREATED).body(AuthService.toUserProfileDto(usuario));
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<UserProfileDto> cambiarRol(
            @PathVariable Long id,
            @Valid @RequestBody CambiarRolRequest request
    ) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        PerfilUsuario nuevoPerfil;
        try {
            nuevoPerfil = PerfilUsuario.valueOf(request.perfil().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Perfil inválido. Use ADMINISTRADOR, EMPLEADO o CLIENTE");
        }

        usuario.setPerfil(nuevoPerfil);
        if (request.esTecnico() != null) {
            usuario.getEmpleado().setEsTecnico(request.esTecnico());
            empleadoRepository.save(usuario.getEmpleado());
        }
        usuario = usuarioRepository.save(usuario);
        return ResponseEntity.ok(AuthService.toUserProfileDto(usuario));
    }
}
