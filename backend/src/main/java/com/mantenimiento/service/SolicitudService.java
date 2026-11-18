package com.mantenimiento.service;

import com.mantenimiento.domain.entity.*;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.dto.SolicitudDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.*;
import com.mantenimiento.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final RecursoRepository recursoRepository;
    private final EstadoRepository estadoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PrioridadRepository prioridadRepository;
    private final EmpleadoRepository empleadoRepository;
    private final AsignacionRepository asignacionRepository;
    private final HistorialEstadoRepository historialRepository;

    public SolicitudService(
            SolicitudRepository solicitudRepository,
            RecursoRepository recursoRepository,
            EstadoRepository estadoRepository,
            CategoriaRepository categoriaRepository,
            PrioridadRepository prioridadRepository,
            EmpleadoRepository empleadoRepository,
            AsignacionRepository asignacionRepository,
            HistorialEstadoRepository historialRepository
    ) {
        this.solicitudRepository = solicitudRepository;
        this.recursoRepository = recursoRepository;
        this.estadoRepository = estadoRepository;
        this.categoriaRepository = categoriaRepository;
        this.prioridadRepository = prioridadRepository;
        this.empleadoRepository = empleadoRepository;
        this.asignacionRepository = asignacionRepository;
        this.historialRepository = historialRepository;
    }

    @Transactional(readOnly = true)
    public List<SolicitudResponse> listarSolicitudes(CustomUserDetails currentUser) {
        List<Solicitud> solicitudes;
        PerfilUsuario perfil = currentUser.getPerfil();

        if (perfil == PerfilUsuario.ADMINISTRADOR) {
            solicitudes = solicitudRepository.findAllByOrderByCreadaEnDesc();
        } else if (perfil == PerfilUsuario.EMPLEADO) {
            solicitudes = solicitudRepository.findAssignedOrCreatedByEmpleado(currentUser.getEmpleadoId());
        } else {
            solicitudes = solicitudRepository.findBySolicitanteIdOrderByCreadaEnDesc(currentUser.getEmpleadoId());
        }

        return solicitudes.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SolicitudResponse obtenerPorId(Long id, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(id);
        verificarPermisoLectura(solicitud, currentUser);
        return toResponse(solicitud);
    }

    @Transactional
    public SolicitudResponse crearSolicitud(CreateSolicitudRequest request, CustomUserDetails currentUser) {
        Recurso recurso = recursoRepository.findById(request.recursoId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "El recurso indicado no existe"));

        if (!recurso.isActivo()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se puede crear una solicitud sobre un recurso inactivo");
        }

        Estado estadoPendiente = estadoRepository.findByNombreIgnoreCase("Pendiente")
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Estado 'Pendiente' no configurado"));

        Solicitud solicitud = new Solicitud();
        long consecutivo = solicitudRepository.count() + 1;
        solicitud.setCodigo(String.format("SM-%d-%06d", Year.now().getValue(), consecutivo));
        solicitud.setSolicitante(currentUser.getUsuario().getEmpleado());
        solicitud.setRegistradaPor(currentUser.getUsuario());
        solicitud.setRecurso(recurso);
        solicitud.setDescripcion(request.descripcion().trim());
        solicitud.setEstado(estadoPendiente);

        if (request.categoriaId() != null) {
            Categoria cat = categoriaRepository.findById(request.categoriaId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "La categoría indicada no existe"));
            solicitud.setCategoria(cat);
        }
        if (request.prioridadId() != null) {
            Prioridad prio = prioridadRepository.findById(request.prioridadId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "La prioridad indicada no existe"));
            solicitud.setPrioridad(prio);
        }

        solicitud = solicitudRepository.save(solicitud);

        HistorialEstado historialInicial = new HistorialEstado(
                solicitud,
                null,
                estadoPendiente,
                currentUser.getUsuario(),
                "Radicación inicial de solicitud de mantenimiento"
        );
        historialRepository.save(historialInicial);
        solicitud.getHistorial().add(historialInicial);

        return toResponse(solicitud);
    }

    @Transactional
    public SolicitudResponse actualizarSolicitud(Long id, UpdateSolicitudRequest request, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(id);
        verificarPermisoLectura(solicitud, currentUser);

        if (solicitud.getEstado().isEsFinal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se puede modificar una solicitud en estado final (" + solicitud.getEstado().getNombre() + ")");
        }

        PerfilUsuario perfil = currentUser.getPerfil();

        if (request.descripcion() != null && !request.descripcion().isBlank()) {
            if (perfil == PerfilUsuario.CLIENTE && !solicitud.getEstado().getNombre().equalsIgnoreCase("Pendiente")) {
                throw new ApiException(HttpStatus.FORBIDDEN, "El cliente solo puede editar la descripción mientras la solicitud esté Pendiente");
            }
            solicitud.setDescripcion(request.descripcion().trim());
        }

        if (request.recursoId() != null) {
            Recurso nuevoRecurso = recursoRepository.findById(request.recursoId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "El recurso indicado no existe"));
            solicitud.setRecurso(nuevoRecurso);
        }

        if (perfil == PerfilUsuario.ADMINISTRADOR) {
            if (request.categoriaId() != null) {
                Categoria cat = categoriaRepository.findById(request.categoriaId())
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Categoría no encontrada"));
                solicitud.setCategoria(cat);
            }
            if (request.prioridadId() != null) {
                Prioridad prio = prioridadRepository.findById(request.prioridadId())
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Prioridad no encontrada"));
                solicitud.setPrioridad(prio);
            }
        }

        if (request.trabajoRealizado() != null && !request.trabajoRealizado().isBlank()) {
            if (perfil == PerfilUsuario.CLIENTE) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Un cliente no tiene permisos para registrar trabajo técnico");
            }
            if (perfil == PerfilUsuario.EMPLEADO && !esTecnicoAsignadoVigente(solicitud, currentUser.getEmpleadoId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo el técnico asignado puede registrar trabajo en esta solicitud");
            }
            solicitud.setTrabajoRealizado(request.trabajoRealizado().trim());
            solicitud.setTrabajoActualizadoEn(LocalDateTime.now());
        }

        solicitud = solicitudRepository.save(solicitud);
        return toResponse(solicitud);
    }

    @Transactional
    public SolicitudResponse asignarTecnico(Long id, AsignarTecnicoRequest request, CustomUserDetails currentUser) {
        if (currentUser.getPerfil() != PerfilUsuario.ADMINISTRADOR) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo un ADMINISTRADOR puede asignar o reasignar técnicos");
        }

        Solicitud solicitud = buscarSolicitudO404(id);
        if (solicitud.getEstado().isEsFinal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se puede asignar técnico a una solicitud en estado final");
        }

        Empleado tecnico = empleadoRepository.findById(request.tecnicoId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Técnico no encontrado"));

        if (!tecnico.isActivo() || !tecnico.isEsTecnico()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El empleado seleccionado no es un técnico activo");
        }

        // Desactivar asignación vigente previa si existe
        asignacionRepository.findBySolicitudIdAndVigenteTrue(solicitud.getId()).ifPresent(previa -> {
            previa.setVigente(false);
            previa.setFinalizadaEn(LocalDateTime.now());
            previa.setMotivoFin(request.motivoReasignacion() != null ? request.motivoReasignacion() : "Reasignación administrativa");
            asignacionRepository.saveAndFlush(previa);
        });

        Asignacion nuevaAsignacion = new Asignacion(solicitud, tecnico, currentUser.getUsuario());
        asignacionRepository.save(nuevaAsignacion);
        solicitud.getAsignaciones().add(nuevaAsignacion);

        if (request.categoriaId() != null) {
            categoriaRepository.findById(request.categoriaId()).ifPresent(solicitud::setCategoria);
        }
        if (request.prioridadId() != null) {
            prioridadRepository.findById(request.prioridadId()).ifPresent(solicitud::setPrioridad);
        }

        Estado estadoAnterior = solicitud.getEstado();
        if (estadoAnterior.getNombre().equalsIgnoreCase("Pendiente")) {
            Estado estadoAsignada = estadoRepository.findByNombreIgnoreCase("Asignada")
                    .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Estado 'Asignada' no existe"));
            solicitud.setEstado(estadoAsignada);

            HistorialEstado hist = new HistorialEstado(
                    solicitud,
                    estadoAnterior,
                    estadoAsignada,
                    currentUser.getUsuario(),
                    "Asignación técnica a " + tecnico.getNombreCompleto()
            );
            historialRepository.save(hist);
            solicitud.getHistorial().add(hist);
        }

        solicitud = solicitudRepository.save(solicitud);
        return toResponse(solicitud);
    }

    @Transactional
    public SolicitudResponse cambiarEstado(Long id, CambiarEstadoRequest request, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(id);
        verificarPermisoLectura(solicitud, currentUser);

        if (solicitud.getEstado().isEsFinal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La solicitud ya se encuentra en un estado final inmutable");
        }

        Estado estadoActual = solicitud.getEstado();
        Estado nuevoEstado = estadoRepository.findByNombreIgnoreCase(request.nuevoEstado().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El estado solicitado no es válido: " + request.nuevoEstado()));

        validarTransicionPorRol(solicitud, estadoActual.getNombre(), nuevoEstado.getNombre(), currentUser);

        if (request.trabajoRealizado() != null && !request.trabajoRealizado().isBlank()) {
            solicitud.setTrabajoRealizado(request.trabajoRealizado().trim());
            solicitud.setTrabajoActualizadoEn(LocalDateTime.now());
        }

        if (nuevoEstado.getNombre().equalsIgnoreCase("Finalizada")) {
            String trabajo = solicitud.getTrabajoRealizado();
            if (trabajo == null || trabajo.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Para finalizar la solicitud es obligatorio registrar el trabajo técnico realizado");
            }
        }

        if (Set.of("Cancelada", "Rechazada").contains(nuevoEstado.getNombre())) {
            if (request.motivo() == null || request.motivo().trim().length() < 5) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Es obligatorio indicar un motivo válido para cancelar o rechazar la solicitud");
            }
            solicitud.setMotivoCierre(request.motivo().trim());
        } else if (request.motivo() != null && !request.motivo().isBlank()) {
            solicitud.setMotivoCierre(request.motivo().trim());
        }

        if (nuevoEstado.isEsFinal()) {
            solicitud.setCerradaEn(LocalDateTime.now());
        }

        solicitud.setEstado(nuevoEstado);
        solicitud = solicitudRepository.save(solicitud);

        HistorialEstado historial = new HistorialEstado(
                solicitud,
                estadoActual,
                nuevoEstado,
                currentUser.getUsuario(),
                request.motivo() != null && !request.motivo().isBlank()
                        ? request.motivo().trim()
                        : "Cambio de estado a " + nuevoEstado.getNombre()
        );
        historialRepository.save(historial);
        solicitud.getHistorial().add(historial);

        return toResponse(solicitud);
    }

    @Transactional
    public void eliminarSolicitud(Long id, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(id);
        PerfilUsuario perfil = currentUser.getPerfil();

        if (perfil == PerfilUsuario.EMPLEADO) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Un empleado técnico no tiene permisos para eliminar solicitudes");
        }

        if (perfil == PerfilUsuario.CLIENTE) {
            if (!solicitud.getSolicitante().getId().equals(currentUser.getEmpleadoId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No puede eliminar solicitudes de otros usuarios");
            }
            if (!solicitud.getEstado().getNombre().equalsIgnoreCase("Pendiente")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Solo se pueden eliminar solicitudes que aún estén en estado Pendiente");
            }
        }

        solicitudRepository.delete(solicitud);
    }

    @Transactional(readOnly = true)
    public List<HistorialEstadoDto> obtenerHistorial(Long id, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(id);
        verificarPermisoLectura(solicitud, currentUser);
        return historialRepository.findBySolicitudIdOrderByCambiadoEnAsc(id).stream()
                .map(this::toHistorialDto)
                .toList();
    }

    private Solicitud buscarSolicitudO404(Long id) {
        return solicitudRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No se encontró la solicitud con ID: " + id));
    }

    private void verificarPermisoLectura(Solicitud solicitud, CustomUserDetails currentUser) {
        PerfilUsuario perfil = currentUser.getPerfil();
        if (perfil == PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        Long empleadoId = currentUser.getEmpleadoId();
        boolean esSolicitante = solicitud.getSolicitante().getId().equals(empleadoId);
        if (perfil == PerfilUsuario.CLIENTE && !esSolicitante) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Acceso denegado: un cliente solo puede consultar sus propias solicitudes");
        }
        if (perfil == PerfilUsuario.EMPLEADO && !esSolicitante && !esTecnicoAsignadoVigente(solicitud, empleadoId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Acceso denegado: solo puede consultar solicitudes asignadas a usted");
        }
    }

    private boolean esTecnicoAsignadoVigente(Solicitud solicitud, Long empleadoId) {
        return solicitud.getAsignaciones().stream()
                .anyMatch(a -> a.isVigente() && a.getTecnico().getId().equals(empleadoId));
    }

    private void validarTransicionPorRol(Solicitud solicitud, String actual, String destino, CustomUserDetails user) {
        PerfilUsuario perfil = user.getPerfil();

        if (perfil == PerfilUsuario.CLIENTE) {
            if (actual.equalsIgnoreCase("Pendiente") && destino.equalsIgnoreCase("Cancelada")) {
                return;
            }
            throw new ApiException(HttpStatus.FORBIDDEN, "El cliente solo puede cancelar solicitudes propias en estado Pendiente");
        }

        if (perfil == PerfilUsuario.EMPLEADO) {
            if (!esTecnicoAsignadoVigente(solicitud, user.getEmpleadoId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo el técnico asignado puede avanzar el estado de la solicitud");
            }
            boolean valida = (actual.equalsIgnoreCase("Asignada") && destino.equalsIgnoreCase("En proceso"))
                    || (actual.equalsIgnoreCase("En proceso") && destino.equalsIgnoreCase("Finalizada"));
            if (!valida) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Transición no permitida para técnico de '" + actual + "' a '" + destino + "'");
            }
            return;
        }

        // ADMINISTRADOR
        boolean validaAdmin = (actual.equalsIgnoreCase("Pendiente") && Set.of("Asignada", "Cancelada", "Rechazada").contains(destino))
                || (actual.equalsIgnoreCase("Asignada") && Set.of("En proceso", "Cancelada", "Rechazada").contains(destino))
                || (actual.equalsIgnoreCase("En proceso") && Set.of("Finalizada", "Cancelada").contains(destino));

        if (!validaAdmin) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transición de estado inválida de '" + actual + "' a '" + destino + "'");
        }
    }

    private SolicitudResponse toResponse(Solicitud s) {
        AsignacionDto asignacionVigente = s.getAsignaciones().stream()
                .filter(Asignacion::isVigente)
                .findFirst()
                .map(a -> new AsignacionDto(
                        a.getId(),
                        a.getTecnico().getId(),
                        a.getTecnico().getNombreCompleto(),
                        a.getTecnico().getCorreo(),
                        a.isVigente(),
                        a.getAsignadaEn(),
                        a.getFinalizadaEn(),
                        a.getMotivoFin()
                ))
                .orElse(null);

        List<HistorialEstadoDto> historial = s.getHistorial().stream()
                .sorted(Comparator.comparing(HistorialEstado::getCambiadoEn))
                .map(this::toHistorialDto)
                .toList();

        return new SolicitudResponse(
                s.getId(),
                s.getCodigo(),
                s.getSolicitante().getId(),
                s.getSolicitante().getNombreCompleto(),
                s.getSolicitante().getCorreo(),
                s.getRecurso().getId(),
                s.getRecurso().getCodigo(),
                s.getRecurso().getNombre(),
                s.getRecurso().getUbicacion(),
                s.getDescripcion(),
                s.getEstado().getNombre(),
                s.getEstado().isEsFinal(),
                s.getCategoria() != null ? s.getCategoria().getNombre() : null,
                s.getPrioridad() != null ? s.getPrioridad().getNombre() : null,
                s.getTrabajoRealizado(),
                s.getTrabajoActualizadoEn(),
                s.getMotivoCierre(),
                asignacionVigente,
                s.getCreadaEn(),
                s.getActualizadaEn(),
                s.getCerradaEn(),
                s.getVersion(),
                historial
        );
    }

    private HistorialEstadoDto toHistorialDto(HistorialEstado h) {
        return new HistorialEstadoDto(
                h.getId(),
                h.getEstadoAnterior() != null ? h.getEstadoAnterior().getNombre() : null,
                h.getEstadoNuevo().getNombre(),
                h.getUsuario().getEmpleado().getNombreCompleto(),
                h.getUsuario().getPerfil().name(),
                h.getCambiadoEn(),
                h.getMotivo()
        );
    }
}
