package com.mantenimiento.controller;

import com.mantenimiento.domain.entity.Asignacion;
import com.mantenimiento.domain.entity.Empleado;
import com.mantenimiento.domain.entity.Usuario;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.dto.AuthDtos.UserProfileDto;
import com.mantenimiento.dto.UsuarioDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.AsignacionRepository;
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
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final EmpleadoRepository empleadoRepository;
    private final AsignacionRepository asignacionRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            EmpleadoRepository empleadoRepository,
            AsignacionRepository asignacionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.empleadoRepository = empleadoRepository;
        this.asignacionRepository = asignacionRepository;
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

        // HU-02: Usuario creado por el Administrador nace con debeCambiarPassword = true
        Usuario usuario = new Usuario(
                empleado,
                perfil,
                passwordEncoder.encode(request.password()),
                true
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

        // HU-02: Bloquear revocación de privilegios al último Administrador activo
        if (usuario.getPerfil() == PerfilUsuario.ADMINISTRADOR
                && nuevoPerfil != PerfilUsuario.ADMINISTRADOR
                && usuario.isActivo()) {
            long adminsActivos = usuarioRepository.findAll().stream()
                    .filter(u -> u.isActivo() && u.getPerfil() == PerfilUsuario.ADMINISTRADOR)
                    .count();
            if (adminsActivos <= 1) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "No se puede degradar al único Administrador activo del sistema"
                );
            }
        }

        Empleado emp = usuario.getEmpleado();
        boolean nuevoEsTecnico = request.esTecnico() != null
                ? request.esTecnico()
                : (nuevoPerfil == PerfilUsuario.EMPLEADO || (emp.isEsTecnico() && nuevoPerfil == PerfilUsuario.ADMINISTRADOR));

        // HU-03: Verificar que no tenga solicitudes en Asignada o En proceso antes de quitar esTecnico
        if (emp.isEsTecnico() && !nuevoEsTecnico) {
            List<Asignacion> activas = asignacionRepository.findByTecnicoIdAndVigenteTrue(emp.getId()).stream()
                    .filter(a -> Set.of("Asignada", "En proceso").contains(a.getSolicitud().getEstado().getNombre()))
                    .toList();
            if (!activas.isEmpty()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "El técnico tiene solicitudes en estado Asignada o En proceso. Reasígnelas antes de retirar su función técnica"
                );
            }
        }

        usuario.setPerfil(nuevoPerfil);
        emp.setEsTecnico(nuevoEsTecnico);
        empleadoRepository.save(emp);
        usuario = usuarioRepository.save(usuario);
        return ResponseEntity.ok(AuthService.toUserProfileDto(usuario));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<UserProfileDto> cambiarEstadoActivo(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        boolean nuevoActivo = (body != null && body.containsKey("activo"))
                ? Boolean.TRUE.equals(body.get("activo"))
                : !usuario.isActivo();

        // HU-02: Bloquear desactivación del último Administrador activo
        if (usuario.isActivo() && !nuevoActivo && usuario.getPerfil() == PerfilUsuario.ADMINISTRADOR) {
            long adminsActivos = usuarioRepository.findAll().stream()
                    .filter(u -> u.isActivo() && u.getPerfil() == PerfilUsuario.ADMINISTRADOR)
                    .count();
            if (adminsActivos <= 1) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "No se puede desactivar al único Administrador activo del sistema"
                );
            }
        }

        usuario.setActivo(nuevoActivo);
        usuario = usuarioRepository.save(usuario);
        return ResponseEntity.ok(AuthService.toUserProfileDto(usuario));
    }
}
