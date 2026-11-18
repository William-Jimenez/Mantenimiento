package com.mantenimiento.controller;

import com.mantenimiento.domain.entity.Asignacion;
import com.mantenimiento.domain.entity.Empleado;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.AsignacionRepository;
import com.mantenimiento.repository.EmpleadoRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/empleados")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class EmpleadoController {

    private final EmpleadoRepository empleadoRepository;
    private final AsignacionRepository asignacionRepository;

    public EmpleadoController(EmpleadoRepository empleadoRepository, AsignacionRepository asignacionRepository) {
        this.empleadoRepository = empleadoRepository;
        this.asignacionRepository = asignacionRepository;
    }

    public record EmpleadoRequest(
            @NotBlank(message = "El documento es obligatorio")
            String documento,
            @NotBlank(message = "Los nombres son obligatorios")
            String nombres,
            @NotBlank(message = "Los apellidos son obligatorios")
            String apellidos,
            @NotBlank(message = "El correo electrónico es obligatorio")
            @Email(message = "El correo electrónico no tiene un formato válido")
            String correo,
            @NotBlank(message = "El cargo es obligatorio")
            String cargo,
            Boolean esTecnico,
            Boolean activo
    ) {}

    @GetMapping
    public ResponseEntity<List<Empleado>> listarEmpleados() {
        return ResponseEntity.ok(empleadoRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Empleado> registrarEmpleado(@Valid @RequestBody EmpleadoRequest request) {
        String doc = request.documento().trim();
        String correo = request.correo().trim().toLowerCase();

        if (empleadoRepository.existsByDocumento(doc)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un empleado con el documento: " + doc);
        }
        if (empleadoRepository.existsByCorreoIgnoreCase(correo)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un empleado con el correo: " + correo);
        }

        Empleado emp = new Empleado(
                doc,
                request.nombres().trim(),
                request.apellidos().trim(),
                correo,
                request.cargo().trim(),
                Boolean.TRUE.equals(request.esTecnico())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(empleadoRepository.save(emp));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> actualizarEmpleado(
            @PathVariable Long id,
            @Valid @RequestBody EmpleadoRequest request
    ) {
        Empleado emp = empleadoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Empleado no encontrado"));

        String doc = request.documento().trim();
        String correo = request.correo().trim().toLowerCase();

        empleadoRepository.findByDocumento(doc).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ApiException(HttpStatus.CONFLICT, "El documento ya pertenece a otro empleado");
            }
        });
        empleadoRepository.findByCorreoIgnoreCase(correo).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ApiException(HttpStatus.CONFLICT, "El correo electrónico ya pertenece a otro empleado");
            }
        });

        boolean nuevoEsTecnico = request.esTecnico() != null ? request.esTecnico() : emp.isEsTecnico();
        boolean nuevoActivo = request.activo() != null ? request.activo() : emp.isActivo();

        if (emp.isEsTecnico() && (!nuevoEsTecnico || !nuevoActivo)) {
            verificarSinAsignacionesActivas(emp.getId());
        }

        emp.setDocumento(doc);
        emp.setNombres(request.nombres().trim());
        emp.setApellidos(request.apellidos().trim());
        emp.setCorreo(correo);
        emp.setCargo(request.cargo().trim());
        emp.setEsTecnico(nuevoEsTecnico);
        emp.setActivo(nuevoActivo);

        return ResponseEntity.ok(empleadoRepository.save(emp));
    }

    @PatchMapping("/{id}/tecnico")
    public ResponseEntity<Empleado> conmutarFuncionTecnica(@PathVariable Long id) {
        Empleado emp = empleadoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Empleado no encontrado"));

        if (emp.isEsTecnico()) {
            verificarSinAsignacionesActivas(emp.getId());
        }

        emp.setEsTecnico(!emp.isEsTecnico());
        return ResponseEntity.ok(empleadoRepository.save(emp));
    }

    private void verificarSinAsignacionesActivas(Long tecnicoId) {
        List<Asignacion> activas = asignacionRepository.findByTecnicoIdAndVigenteTrue(tecnicoId).stream()
                .filter(a -> Set.of("Asignada", "En proceso").contains(a.getSolicitud().getEstado().getNombre()))
                .toList();
        if (!activas.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "No se puede retirar la función técnica: el empleado tiene solicitudes en estado Asignada o En proceso que deben reasignarse primero"
            );
        }
    }
}
