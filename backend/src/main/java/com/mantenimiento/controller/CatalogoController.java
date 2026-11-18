package com.mantenimiento.controller;

import com.mantenimiento.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final EstadoRepository estadoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PrioridadRepository prioridadRepository;
    private final TipoRecursoRepository tipoRecursoRepository;
    private final EmpleadoRepository empleadoRepository;

    public CatalogoController(
            EstadoRepository estadoRepository,
            CategoriaRepository categoriaRepository,
            PrioridadRepository prioridadRepository,
            TipoRecursoRepository tipoRecursoRepository,
            EmpleadoRepository empleadoRepository
    ) {
        this.estadoRepository = estadoRepository;
        this.categoriaRepository = categoriaRepository;
        this.prioridadRepository = prioridadRepository;
        this.tipoRecursoRepository = tipoRecursoRepository;
        this.empleadoRepository = empleadoRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "solicitudes-mantenimiento-api",
                "framework", "Spring Boot 3.4 + PostgreSQL + Spring Security JWT",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @GetMapping("/catalogos")
    public ResponseEntity<Map<String, Object>> obtenerCatalogos() {
        return ResponseEntity.ok(Map.of(
                "estados", estadoRepository.findAll(),
                "categorias", categoriaRepository.findByActivaTrue(),
                "prioridades", prioridadRepository.findAllByOrderByNivelAsc(),
                "tiposRecurso", tipoRecursoRepository.findAll(),
                "tecnicosActivos", empleadoRepository.findByEsTecnicoTrueAndActivoTrue()
        ));
    }
}
