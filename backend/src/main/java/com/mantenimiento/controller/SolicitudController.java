package com.mantenimiento.controller;

import com.mantenimiento.dto.SolicitudDtos.*;
import com.mantenimiento.security.CustomUserDetails;
import com.mantenimiento.service.SolicitudService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/solicitudes")
public class SolicitudController {

    private final SolicitudService solicitudService;

    public SolicitudController(SolicitudService solicitudService) {
        this.solicitudService = solicitudService;
    }

    @GetMapping
    public ResponseEntity<List<SolicitudResponse>> listarSolicitudes(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.listarSolicitudes(currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitudResponse> obtenerSolicitudPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.obtenerPorId(id, currentUser));
    }

    @PostMapping
    public ResponseEntity<SolicitudResponse> crearSolicitud(
            @Valid @RequestBody CreateSolicitudRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(solicitudService.crearSolicitud(request, currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SolicitudResponse> actualizarSolicitud(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSolicitudRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.actualizarSolicitud(id, request, currentUser));
    }

    @PatchMapping("/{id}/asignar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<SolicitudResponse> asignarTecnico(
            @PathVariable Long id,
            @Valid @RequestBody AsignarTecnicoRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.asignarTecnico(id, request, currentUser));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<SolicitudResponse> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.cambiarEstado(id, request, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarSolicitud(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        solicitudService.eliminarSolicitud(id, currentUser);
        return ResponseEntity.ok(Map.of("mensaje", "Solicitud eliminada correctamente"));
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<HistorialEstadoDto>> obtenerHistorial(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.obtenerHistorial(id, currentUser));
    }

    // HU-07 y HU-10: Adjunción de evidencias con validación de firma binaria y descarga protegida
    @PostMapping("/{id}/evidencias")
    public ResponseEntity<EvidenciaDto> adjuntarEvidencia(
            @PathVariable Long id,
            @Valid @RequestBody UploadEvidenciaRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(solicitudService.adjuntarEvidencia(id, request, currentUser));
    }

    @GetMapping("/{id}/evidencias/{evidenciaId}/descargar")
    public ResponseEntity<Map<String, Object>> descargarEvidencia(
            @PathVariable Long id,
            @PathVariable Long evidenciaId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.descargarEvidenciaProtegida(id, evidenciaId, currentUser));
    }

    // HU-16, HU-17 y HU-18: Análisis de IA, reintento y revisión humana
    @GetMapping("/{id}/analisis-ia")
    public ResponseEntity<List<AnalisisIADto>> listarAnalisisIA(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.listarAnalisisIA(id, currentUser));
    }

    @PostMapping("/{id}/analisis-ia")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<AnalisisIADto> dispararAnalisisIA(
            @PathVariable Long id,
            @RequestBody(required = false) TriggerAnalisisIARequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(solicitudService.dispararAnalisisIA(id, request, currentUser));
    }

    @PostMapping("/{id}/analisis-ia/{analisisId}/revisar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<AnalisisIADto> revisarAnalisisIA(
            @PathVariable Long id,
            @PathVariable Long analisisId,
            @Valid @RequestBody RevisarAnalisisIARequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(solicitudService.revisarAnalisisIA(id, analisisId, request, currentUser));
    }
}
