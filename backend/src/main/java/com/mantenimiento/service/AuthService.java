package com.mantenimiento.service;

import com.mantenimiento.domain.entity.Empleado;
import com.mantenimiento.domain.entity.Usuario;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.dto.AuthDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.EmpleadoRepository;
import com.mantenimiento.repository.UsuarioRepository;
import com.mantenimiento.security.CustomUserDetails;
import com.mantenimiento.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final EmpleadoRepository empleadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    private record ResetCodeEntry(String code, LocalDateTime expiresAt) {}
    private final Map<String, ResetCodeEntry> resetCodes = new ConcurrentHashMap<>();

    public AuthService(
            UsuarioRepository usuarioRepository,
            EmpleadoRepository empleadoRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager
    ) {
        this.usuarioRepository = usuarioRepository;
        this.empleadoRepository = empleadoRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String correo = request.correo().trim().toLowerCase();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(correo, request.password())
        );

        Usuario usuario = usuarioRepository.findByEmpleadoCorreoIgnoreCase(correo)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (!usuario.isActivo() || !usuario.getEmpleado().isActivo()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "La cuenta de usuario se encuentra inactiva");
        }

        usuario.setIntentosFallidos(0);
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        CustomUserDetails userDetails = new CustomUserDetails(usuario);
        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(token, "Bearer", toUserProfileDto(usuario));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validarPoliticaPassword(request.password());

        String correo = request.correo().trim().toLowerCase();
        String documento = request.documento().trim();

        if (empleadoRepository.existsByCorreoIgnoreCase(correo)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un usuario registrado con ese correo electrónico");
        }
        if (empleadoRepository.existsByDocumento(documento)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un empleado registrado con ese número de documento");
        }

        Empleado empleado = new Empleado(
                documento,
                request.nombres().trim(),
                request.apellidos().trim(),
                correo,
                request.cargo() != null && !request.cargo().isBlank() ? request.cargo().trim() : "Cliente Solicitante",
                false
        );
        empleado = empleadoRepository.save(empleado);

        Usuario usuario = new Usuario(
                empleado,
                PerfilUsuario.CLIENTE,
                passwordEncoder.encode(request.password()),
                false
        );
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuario = usuarioRepository.save(usuario);

        CustomUserDetails userDetails = new CustomUserDetails(usuario);
        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(token, "Bearer", toUserProfileDto(usuario));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> solicitarCodigoRecuperacion(PasswordResetRequest request) {
        String correo = request.correo().trim().toLowerCase();
        Usuario usuario = usuarioRepository.findByEmpleadoCorreoIgnoreCase(correo)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "El correo electrónico no se encuentra registrado en el sistema"));

        if (!usuario.isActivo()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "La cuenta asociada a este correo está inactiva");
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 1000000));
        resetCodes.put(correo, new ResetCodeEntry(code, LocalDateTime.now().plusMinutes(10)));

        return Map.of(
                "mensaje", "Se ha enviado un código de verificación de 6 dígitos al correo proporcionado",
                "correo", correo,
                "expiraEnMinutos", 10,
                "codigoSimulado", code
        );
    }

    @Transactional
    public Map<String, Object> confirmarRecuperacionPassword(PasswordResetConfirmRequest request) {
        String correo = request.correo().trim().toLowerCase();
        ResetCodeEntry entry = resetCodes.get(correo);

        if (entry == null || entry.expiresAt().isBefore(LocalDateTime.now()) || !entry.code().equals(request.codigo().trim())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El código de verificación es inválido o ha expirado");
        }

        validarPoliticaPassword(request.nuevaPassword());

        Usuario usuario = usuarioRepository.findByEmpleadoCorreoIgnoreCase(correo)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        usuario.setPasswordHash(passwordEncoder.encode(request.nuevaPassword()));
        usuario.setDebeCambiarPassword(false);
        usuario.setIntentosFallidos(0);
        usuarioRepository.save(usuario);

        resetCodes.remove(correo);

        return Map.of("mensaje", "Tu contraseña ha sido restablecida con éxito");
    }

    public static void validarPoliticaPassword(String password) {
        if (password == null || password.length() < 10) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña debe tener al menos 10 caracteres");
        }
        boolean tieneLetra = password.chars().anyMatch(Character::isLetter);
        boolean tieneNumero = password.chars().anyMatch(Character::isDigit);
        if (!tieneLetra || !tieneNumero) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña debe incluir al menos una letra y un número");
        }
    }

    public static UserProfileDto toUserProfileDto(Usuario usuario) {
        Empleado emp = usuario.getEmpleado();
        return new UserProfileDto(
                usuario.getId(),
                emp.getId(),
                emp.getDocumento(),
                emp.getNombreCompleto(),
                emp.getCorreo(),
                emp.getCargo(),
                usuario.getPerfil().name(),
                emp.isEsTecnico(),
                usuario.isActivo() && emp.isActivo()
        );
    }
}
