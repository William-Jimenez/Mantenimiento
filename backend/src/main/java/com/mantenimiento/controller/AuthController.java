package com.mantenimiento.controller;

import com.mantenimiento.dto.AuthDtos.*;
import com.mantenimiento.security.CustomUserDetails;
import com.mantenimiento.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Map<String, Object>> solicitarRecuperacion(@Valid @RequestBody PasswordResetRequest request) {
        return ResponseEntity.ok(authService.solicitarCodigoRecuperacion(request));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Map<String, Object>> confirmarRecuperacion(@Valid @RequestBody PasswordResetConfirmRequest request) {
        return ResponseEntity.ok(authService.confirmarRecuperacionPassword(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> obtenerPerfilActual(@AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(AuthService.toUserProfileDto(currentUser.getUsuario()));
    }
}
