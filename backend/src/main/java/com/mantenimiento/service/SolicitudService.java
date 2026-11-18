package com.mantenimiento.service;

import com.mantenimiento.domain.entity.*;
import com.mantenimiento.domain.enums.DecisionRevisionIA;
import com.mantenimiento.domain.enums.EstadoAnalisisIA;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.domain.enums.TipoEvidencia;
import com.mantenimiento.dto.SolicitudDtos.*;
import com.mantenimiento.exception.ApiException;
import com.mantenimiento.repository.*;
import com.mantenimiento.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SolicitudService {

    private static final int MAX_FOTOS = 5;
    private static final int MAX_PDFS = 2;
    private static final int MAX_FOTO_BYTES = 5 * 1024 * 1024;
    private static final int MAX_PDF_BYTES = 10 * 1024 * 1024;

    private final SolicitudRepository solicitudRepository;
    private final RecursoRepository recursoRepository;
    private final EstadoRepository estadoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PrioridadRepository prioridadRepository;
    private final EmpleadoRepository empleadoRepository;
    private final AsignacionRepository asignacionRepository;
    private final EvidenciaRepository evidenciaRepository;
    private final AnalisisIARepository analisisIARepository;
    private final HistorialEstadoRepository historialRepository;

    public SolicitudService(
            SolicitudRepository solicitudRepository,
            RecursoRepository recursoRepository,
            EstadoRepository estadoRepository,
            CategoriaRepository categoriaRepository,
            PrioridadRepository prioridadRepository,
            EmpleadoRepository empleadoRepository,
            AsignacionRepository asignacionRepository,
            EvidenciaRepository evidenciaRepository,
            AnalisisIARepository analisisIARepository,
            HistorialEstadoRepository historialRepository
    ) {
        this.solicitudRepository = solicitudRepository;
        this.recursoRepository = recursoRepository;
        this.estadoRepository = estadoRepository;
        this.categoriaRepository = categoriaRepository;
        this.prioridadRepository = prioridadRepository;
        this.empleadoRepository = empleadoRepository;
        this.asignacionRepository = asignacionRepository;
        this.evidenciaRepository = evidenciaRepository;
        this.analisisIARepository = analisisIARepository;
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

        // HU-06: Si es ADMINISTRADOR y especifica solicitanteId, radicar en nombre de ese empleado activo
        Empleado solicitante = currentUser.getUsuario().getEmpleado();
        String motivoHistorial = "Radicación inicial de solicitud de mantenimiento";
        if (currentUser.getPerfil() == PerfilUsuario.ADMINISTRADOR && request.solicitanteId() != null) {
            Empleado tercero = empleadoRepository.findById(request.solicitanteId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El empleado solicitante indicado no existe"));
            if (!tercero.isActivo()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El empleado solicitante seleccionado se encuentra inactivo");
            }
            solicitante = tercero;
            if (!tercero.getId().equals(currentUser.getEmpleadoId())) {
                motivoHistorial = "Registrada por " + currentUser.getUsuario().getEmpleado().getNombreCompleto()
                        + " a nombre de " + tercero.getNombreCompleto();
            }
        }

        Solicitud solicitud = new Solicitud();
        long consecutivo = solicitudRepository.count() + 1;
        solicitud.setCodigo(String.format("SM-%d-%06d", Year.now().getValue(), consecutivo));
        solicitud.setSolicitante(solicitante);
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
                motivoHistorial
        );
        historialRepository.save(historialInicial);
        solicitud.getHistorial().add(historialInicial);

        // HU-16 y HU-17: Disparo automático del análisis de IA (versión 1) al radicar la solicitud
        ejecutarYGuardarAnalisisIA(solicitud, 1, currentUser, null);

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

        boolean eraReasignacion = asignacionRepository.findBySolicitudIdAndVigenteTrue(solicitud.getId()).isPresent();
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
        Estado estadoAsignada = estadoRepository.findByNombreIgnoreCase("Asignada")
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Estado 'Asignada' no existe"));
        solicitud.setEstado(estadoAsignada);

        HistorialEstado hist = new HistorialEstado(
                solicitud,
                estadoAnterior,
                estadoAsignada,
                currentUser.getUsuario(),
                (eraReasignacion ? "Reasignación técnica a " : "Asignación técnica a ") + tecnico.getNombreCompleto()
        );
        historialRepository.save(hist);
        solicitud.getHistorial().add(hist);

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

        // HU-14 y HU-15: Las transiciones hacia Cancelada y Rechazada exigen motivo >= 10 caracteres
        if (Set.of("Cancelada", "Rechazada").contains(nuevoEstado.getNombre())) {
            if (request.motivo() == null || request.motivo().trim().length() < 10) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Es obligatorio indicar un motivo de al menos 10 caracteres para cancelar o rechazar la solicitud");
            }
            solicitud.setMotivoCierre(request.motivo().trim());
        } else if (request.motivo() != null && !request.motivo().isBlank()) {
            solicitud.setMotivoCierre(request.motivo().trim());
        }

        if (nuevoEstado.isEsFinal() || nuevoEstado.getNombre().equalsIgnoreCase("Pendiente")) {
            if (nuevoEstado.isEsFinal()) {
                solicitud.setCerradaEn(LocalDateTime.now());
            }
            // Neutralizar asignación técnica vigente al cerrar o desasignar
            asignacionRepository.findBySolicitudIdAndVigenteTrue(solicitud.getId()).ifPresent(vigente -> {
                vigente.setVigente(false);
                vigente.setFinalizadaEn(LocalDateTime.now());
                vigente.setMotivoFin(request.motivo() != null ? request.motivo().trim() : "Cierre en estado " + nuevoEstado.getNombre());
                asignacionRepository.save(vigente);
            });
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

    // =========================================================================
    // HU-07 y HU-10: Adjunción con Firma Binaria + SHA-256 y Descarga Protegida
    // =========================================================================
    @Transactional
    public EvidenciaDto adjuntarEvidencia(Long solicitudId, UploadEvidenciaRequest request, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(solicitudId);
        verificarPermisoLectura(solicitud, currentUser);

        if (solicitud.getEstado().isEsFinal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se pueden adjuntar evidencias a una solicitud en estado final");
        }

        byte[] rawBytes = decodificarBase64(request.dataUrl());
        if (rawBytes.length < 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El archivo está vacío o su cabecera binaria es inválida");
        }

        // Detectar ejecutables (MZ: 4D 5A, ELF: 7F 45 4C 46)
        if ((rawBytes[0] == 0x4D && rawBytes[1] == 0x5A)
                || (rawBytes[0] == 0x7F && rawBytes[1] == 0x45 && rawBytes[2] == 0x4C && rawBytes[3] == 0x46)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Archivo rechazado por seguridad: firma binaria de ejecutable detectada");
        }

        boolean isJpeg = (rawBytes[0] & 0xFF) == 0xFF && (rawBytes[1] & 0xFF) == 0xD8 && (rawBytes[2] & 0xFF) == 0xFF;
        boolean isPng = (rawBytes[0] & 0xFF) == 0x89 && rawBytes[1] == 0x50 && rawBytes[2] == 0x4E && rawBytes[3] == 0x47;
        boolean isPdf = rawBytes[0] == 0x25 && rawBytes[1] == 0x50 && rawBytes[2] == 0x44 && rawBytes[3] == 0x46;

        if (!isJpeg && !isPng && !isPdf) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Firma binaria no autorizada (solo se admiten cabeceras reales JPEG, PNG o PDF)");
        }

        TipoEvidencia tipo = isPdf ? TipoEvidencia.PDF : TipoEvidencia.FOTOGRAFIA;
        String mimeReal = isPdf ? "application/pdf" : (isPng ? "image/png" : "image/jpeg");

        List<Evidencia> actuales = evidenciaRepository.findBySolicitudIdOrderBySubidaEnDesc(solicitudId);
        long fotosCount = actuales.stream().filter(e -> e.getTipo() == TipoEvidencia.FOTOGRAFIA).count();
        long pdfsCount = actuales.stream().filter(e -> e.getTipo() == TipoEvidencia.PDF).count();

        if (tipo == TipoEvidencia.FOTOGRAFIA) {
            if (fotosCount >= MAX_FOTOS) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Cuota superada: máximo 5 fotografías por solicitud");
            }
            if (request.tamanoBytes() > MAX_FOTO_BYTES) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La fotografía supera el límite de 5 MB");
            }
        } else {
            if (pdfsCount >= MAX_PDFS) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Cuota superada: máximo 2 documentos PDF por solicitud");
            }
            if (request.tamanoBytes() > MAX_PDF_BYTES) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El documento PDF supera el límite de 10 MB");
            }
        }

        String sha256 = calcularSha256(rawBytes);

        Evidencia ev = new Evidencia();
        ev.setSolicitud(solicitud);
        ev.setTipo(tipo);
        ev.setNombreOriginal(request.nombreOriginal().trim());
        ev.setNombreAlmacenado(UUID.randomUUID().toString());
        ev.setTipoMime(mimeReal);
        ev.setTamanoBytes(request.tamanoBytes());
        ev.setHashSha256(sha256);
        ev.setSubidaPor(currentUser.getUsuario());
        ev = evidenciaRepository.save(ev);

        return toEvidenciaDto(ev);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> descargarEvidenciaProtegida(Long solicitudId, Long evidenciaId, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(solicitudId);
        verificarPermisoLectura(solicitud, currentUser);

        Evidencia ev = evidenciaRepository.findById(evidenciaId)
                .filter(e -> e.getSolicitud().getId().equals(solicitudId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evidencia no encontrada en esta solicitud"));

        return Map.of(
                "ok", true,
                "auditadoPorUsuarioId", currentUser.getUsuarioId(),
                "auditadoEn", LocalDateTime.now().toString(),
                "evidencia", toEvidenciaDto(ev)
        );
    }

    // =========================================================================
    // HU-16, HU-17 y HU-18: Análisis de IA, Validación de Catálogo y Revisión
    // =========================================================================
    @Transactional(readOnly = true)
    public List<AnalisisIADto> listarAnalisisIA(Long solicitudId, CustomUserDetails currentUser) {
        Solicitud solicitud = buscarSolicitudO404(solicitudId);
        verificarPermisoLectura(solicitud, currentUser);
        return analisisIARepository.findBySolicitudIdOrderByVersionDesc(solicitudId).stream()
                .map(this::toAnalisisIADto)
                .toList();
    }

    @Transactional
    public AnalisisIADto dispararAnalisisIA(Long solicitudId, TriggerAnalisisIARequest request, CustomUserDetails currentUser) {
        if (currentUser.getPerfil() != PerfilUsuario.ADMINISTRADOR) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el ADMINISTRADOR puede disparar o reintentar el análisis de IA");
        }
        Solicitud solicitud = buscarSolicitudO404(solicitudId);
        int nextVersion = analisisIARepository.findTopBySolicitudIdOrderByVersionDesc(solicitudId)
                .map(a -> a.getVersion() + 1)
                .orElse(1);

        AnalisisIA analisis = ejecutarYGuardarAnalisisIA(solicitud, nextVersion, currentUser, request);
        return toAnalisisIADto(analisis);
    }

    @Transactional
    public AnalisisIADto revisarAnalisisIA(Long solicitudId, Long analisisId, RevisarAnalisisIARequest request, CustomUserDetails currentUser) {
        if (currentUser.getPerfil() != PerfilUsuario.ADMINISTRADOR) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el ADMINISTRADOR puede revisar sugerencias de IA");
        }
        Solicitud solicitud = buscarSolicitudO404(solicitudId);
        AnalisisIA analisis = analisisIARepository.findById(analisisId)
                .filter(a -> a.getSolicitud().getId().equals(solicitudId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Análisis de IA no encontrado"));

        DecisionRevisionIA decision;
        try {
            decision = DecisionRevisionIA.valueOf(request.decision().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Decisión inválida. Use ACEPTADO, MODIFICADO o DESCARTADO");
        }

        if (decision == DecisionRevisionIA.ACEPTADO) {
            solicitud.setCategoria(analisis.getCategoriaSugerida());
            solicitud.setPrioridad(analisis.getPrioridadSugerida());
        } else if (decision == DecisionRevisionIA.MODIFICADO) {
            if (request.categoriaId() == null || request.prioridadId() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Para MODIFICADO debe indicar categoriaId y prioridadId");
            }
            Categoria cat = categoriaRepository.findById(request.categoriaId())
                    .filter(Categoria::isActiva)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "La categoría seleccionada no existe o está inactiva"));
            Prioridad prio = prioridadRepository.findById(request.prioridadId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "La prioridad seleccionada no existe"));
            solicitud.setCategoria(cat);
            solicitud.setPrioridad(prio);
        } else if (decision == DecisionRevisionIA.DESCARTADO) {
            solicitud.setCategoria(null);
            solicitud.setPrioridad(null);
        }

        analisis.setDecisionRevision(decision);
        analisis.setRevisadoPor(currentUser.getUsuario());
        analisis.setRevisadoEn(LocalDateTime.now());
        solicitudRepository.save(solicitud);
        analisis = analisisIARepository.save(analisis);

        return toAnalisisIADto(analisis);
    }

    private AnalisisIA ejecutarYGuardarAnalisisIA(
            Solicitud solicitud,
            int version,
            CustomUserDetails currentUser,
            TriggerAnalisisIARequest request
    ) {
        AnalisisIA analisis = new AnalisisIA();
        analisis.setSolicitud(solicitud);
        analisis.setVersion(version);
        analisis.setSolicitadoPor(currentUser.getUsuario());
        analisis.setModelo("gemini-2.5-flash");

        if (request != null && Boolean.TRUE.equals(request.simularFallo())) {
            analisis.setEstadoAnalisis(EstadoAnalisisIA.FALLIDO);
            analisis.setErrorDetalle(request.errorDetalle() != null && !request.errorDetalle().isBlank()
                    ? request.errorDetalle().trim()
                    : "Tiempo de espera agotado al contactar al servicio externo de IA");
            analisis.setCompletadoEn(LocalDateTime.now());
            return analisisIARepository.save(analisis);
        }

        String texto = (solicitud.getDescripcion() + " " + solicitud.getRecurso().getNombre()).toLowerCase();
        String tipoDano = "Desgaste o falla operativa general";
        String catSugeridaNombre = "Otra";
        String prioSugeridaNombre = "Media";

        if (texto.matches(".*(agua|goteo|fuga|tuber|humedad).*")) {
            tipoDano = "Fuga o filtración hidráulica";
            catSugeridaNombre = "Hidráulica";
            prioSugeridaNombre = "Media";
        } else if (texto.matches(".*(eléctric|electr|breaker|volt|corto|tablero|bornes).*")) {
            tipoDano = "Falla en circuito eléctrico";
            catSugeridaNombre = "Eléctrica";
            prioSugeridaNombre = "Alta";
        } else if (texto.matches(".*(servidor|red|comput|impresora|pantalla|ventilador).*")) {
            tipoDano = "Falla de hardware o infraestructura TI";
            catSugeridaNombre = "Informática/Electrónica";
            prioSugeridaNombre = "Alta";
        } else if (texto.matches(".*(motor|compresor|vibraci|ruido|maquin|mecánic).*")) {
            tipoDano = "Desajuste o avería mecánica";
            catSugeridaNombre = "Mecánica";
            prioSugeridaNombre = "Alta";
        }

        if (request != null && request.categoriaSugeridaNombre() != null) {
            catSugeridaNombre = request.categoriaSugeridaNombre().trim();
        }
        if (request != null && request.prioridadSugeridaNombre() != null) {
            prioSugeridaNombre = request.prioridadSugeridaNombre().trim();
        }

        // HU-17: Validar contra el catálogo oficial activo; si no existe o está inactiva se descarta (null)
        Categoria catValida = categoriaRepository.findByNombreIgnoreCase(catSugeridaNombre)
                .filter(Categoria::isActiva)
                .orElse(null);
        Prioridad prioValida = prioridadRepository.findByNombreIgnoreCase(prioSugeridaNombre)
                .orElse(null);

        analisis.setEstadoAnalisis(EstadoAnalisisIA.COMPLETADO);
        analisis.setTipoDano(tipoDano);
        analisis.setDescripcionObservada("Análisis técnico sobre el recurso " + solicitud.getRecurso().getCodigo() + ": se detecta " + tipoDano.toLowerCase());
        analisis.setCategoriaSugerida(catValida);
        analisis.setPrioridadSugerida(prioValida);
        analisis.setCompletadoEn(LocalDateTime.now());
        analisis.setDecisionRevision(DecisionRevisionIA.PENDIENTE);

        return analisisIARepository.save(analisis);
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
            if (actual.equalsIgnoreCase("Pendiente")
                    && destino.equalsIgnoreCase("Cancelada")
                    && solicitud.getSolicitante().getId().equals(user.getEmpleadoId())) {
                return;
            }
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
                || (actual.equalsIgnoreCase("Asignada") && Set.of("En proceso", "Pendiente", "Cancelada", "Rechazada").contains(destino))
                || (actual.equalsIgnoreCase("En proceso") && Set.of("Finalizada", "Cancelada").contains(destino));

        if (!validaAdmin) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transición de estado inválida de '" + actual + "' a '" + destino + "'");
        }
    }

    private byte[] decodificarBase64(String dataUrl) {
        String clean = dataUrl.trim();
        int commaIdx = clean.indexOf(',');
        if (clean.startsWith("data:") && commaIdx > 0) {
            clean = clean.substring(commaIdx + 1);
        }
        try {
            return Base64.getDecoder().decode(clean);
        } catch (IllegalArgumentException e) {
            return clean.getBytes(StandardCharsets.UTF_8);
        }
    }

    private String calcularSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo calcular el hash SHA-256");
        }
    }

    private EvidenciaDto toEvidenciaDto(Evidencia e) {
        return new EvidenciaDto(
                e.getId(),
                e.getSolicitud().getId(),
                e.getTipo().name(),
                e.getNombreOriginal(),
                e.getNombreAlmacenado(),
                e.getTipoMime(),
                e.getTamanoBytes(),
                e.getHashSha256(),
                e.getSubidaPor().getId(),
                e.getSubidaEn()
        );
    }

    private AnalisisIADto toAnalisisIADto(AnalisisIA a) {
        return new AnalisisIADto(
                a.getId(),
                a.getSolicitud().getId(),
                a.getVersion(),
                a.getEstadoAnalisis().name(),
                a.getTipoDano(),
                a.getDescripcionObservada(),
                a.getCategoriaSugerida() != null ? a.getCategoriaSugerida().getId() : null,
                a.getCategoriaSugerida() != null ? a.getCategoriaSugerida().getNombre() : null,
                a.getPrioridadSugerida() != null ? a.getPrioridadSugerida().getId() : null,
                a.getPrioridadSugerida() != null ? a.getPrioridadSugerida().getNombre() : null,
                a.getModelo(),
                a.getDecisionRevision().name(),
                a.getErrorDetalle(),
                a.getCreadoEn(),
                a.getCompletadoEn(),
                a.getRevisadoEn()
        );
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
                s.getRegistradaPor().getId(),
                s.getRegistradaPor().getEmpleado().getNombreCompleto(),
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
