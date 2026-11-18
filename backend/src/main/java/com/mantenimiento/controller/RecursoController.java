package com.mantenimiento.controller;

import com.mantenimiento.domain.entity.Recurso;
import com.mantenimiento.domain.entity.TipoRecurso;
import com.mantenimiento.dto.RecursoDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.RecursoRepository;
import com.mantenimiento.repository.SolicitudRepository;
import com.mantenimiento.repository.TipoRecursoRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recursos")
public class RecursoController {

    private final RecursoRepository recursoRepository;
    private final TipoRecursoRepository tipoRecursoRepository;
    private final SolicitudRepository solicitudRepository;

    public RecursoController(
            RecursoRepository recursoRepository,
            TipoRecursoRepository tipoRecursoRepository,
            SolicitudRepository solicitudRepository
    ) {
        this.recursoRepository = recursoRepository;
        this.tipoRecursoRepository = tipoRecursoRepository;
        this.solicitudRepository = solicitudRepository;
    }

    @GetMapping
    public ResponseEntity<List<RecursoResponse>> listarRecursos() {
        List<RecursoResponse> list = recursoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecursoResponse> obtenerPorId(@PathVariable Long id) {
        Recurso recurso = recursoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Recurso no encontrado"));
        return ResponseEntity.ok(toResponse(recurso));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RecursoResponse> crearRecurso(@Valid @RequestBody CreateRecursoRequest request) {
        if (recursoRepository.existsByCodigoIgnoreCase(request.codigo().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un recurso con el código " + request.codigo());
        }
        TipoRecurso tipo = tipoRecursoRepository.findById(request.tipoRecursoId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Tipo de recurso no válido"));

        Recurso recurso = new Recurso(
                request.codigo().trim().toUpperCase(),
                request.nombre().trim(),
                tipo,
                request.ubicacion().trim(),
                request.descripcion()
        );
        recurso = recursoRepository.save(recurso);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(recurso));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RecursoResponse> actualizarRecurso(
            @PathVariable Long id,
            @RequestBody UpdateRecursoRequest request
    ) {
        Recurso recurso = recursoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Recurso no encontrado"));

        if (request.nombre() != null && !request.nombre().isBlank()) {
            recurso.setNombre(request.nombre().trim());
        }
        if (request.tipoRecursoId() != null) {
            TipoRecurso tipo = tipoRecursoRepository.findById(request.tipoRecursoId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Tipo de recurso no válido"));
            recurso.setTipoRecurso(tipo);
        }
        if (request.ubicacion() != null && !request.ubicacion().isBlank()) {
            recurso.setUbicacion(request.ubicacion().trim());
        }
        if (request.descripcion() != null) {
            recurso.setDescripcion(request.descripcion().trim());
        }
        if (request.activo() != null) {
            recurso.setActivo(request.activo());
        }

        recurso = recursoRepository.save(recurso);
        return ResponseEntity.ok(toResponse(recurso));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Map<String, String>> eliminarRecurso(@PathVariable Long id) {
        Recurso recurso = recursoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Recurso no encontrado"));

        boolean tieneSolicitudes = solicitudRepository.findAll().stream()
                .anyMatch(s -> s.getRecurso().getId().equals(id));
        if (tieneSolicitudes) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "No se permite la eliminación física de un recurso con historial de solicitudes vinculadas. Utilice la inactivación lógica"
            );
        }

        recursoRepository.delete(recurso);
        return ResponseEntity.ok(Map.of("mensaje", "Recurso eliminado correctamente"));
    }

    private RecursoResponse toResponse(Recurso r) {
        return new RecursoResponse(
                r.getId(),
                r.getCodigo(),
                r.getNombre(),
                r.getTipoRecurso().getId(),
                r.getTipoRecurso().getNombre(),
                r.getUbicacion(),
                r.getDescripcion(),
                r.isActivo()
        );
    }
}
