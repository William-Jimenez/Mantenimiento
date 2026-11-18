package com.mantenimiento.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public class SolicitudDtos {

    public record CreateSolicitudRequest(
            @NotNull(message = "El ID del recurso es obligatorio")
            Long recursoId,

            @NotBlank(message = "La descripción de la falla es obligatoria")
            @Size(min = 20, max = 2000, message = "La descripción debe tener entre 20 y 2000 caracteres")
            String descripcion,

            Long solicitanteId,
            Long categoriaId,
            Long prioridadId
    ) {}

    public record UpdateSolicitudRequest(
            Long recursoId,

            @Size(min = 20, max = 2000, message = "La descripción debe tener entre 20 y 2000 caracteres")
            String descripcion,

            Long categoriaId,
            Long prioridadId,
            String trabajoRealizado
    ) {}

    public record AsignarTecnicoRequest(
            @NotNull(message = "El ID del técnico es obligatorio")
            Long tecnicoId,

            Long categoriaId,
            Long prioridadId,
            String motivoReasignacion
    ) {}

    public record CambiarEstadoRequest(
            @NotBlank(message = "El nuevo estado es obligatorio")
            String nuevoEstado,

            String motivo,
            String trabajoRealizado
    ) {}

    public record UploadEvidenciaRequest(
            @NotBlank(message = "El nombre original del archivo es obligatorio")
            String nombreOriginal,

            @NotBlank(message = "El contenido binario en base64 / dataUrl es obligatorio")
            String dataUrl,

            @NotNull(message = "El tamaño en bytes es obligatorio")
            Integer tamanoBytes
    ) {}

    public record EvidenciaDto(
            Long id,
            Long solicitudId,
            String tipo,
            String nombreOriginal,
            String nombreAlmacenado,
            String tipoMime,
            Integer tamanoBytes,
            String hashSha256,
            Long subidaPorUsuarioId,
            LocalDateTime subidaEn
    ) {}

    public record TriggerAnalisisIARequest(
            Boolean simularFallo,
            String errorDetalle,
            String categoriaSugeridaNombre,
            String prioridadSugeridaNombre
    ) {}

    public record RevisarAnalisisIARequest(
            @NotBlank(message = "La decisión (ACEPTADO, MODIFICADO o DESCARTADO) es obligatoria")
            String decision,
            Long categoriaId,
            Long prioridadId
    ) {}

    public record AnalisisIADto(
            Long id,
            Long solicitudId,
            Integer version,
            String estadoAnalisis,
            String tipoDano,
            String descripcionObservada,
            Long categoriaSugeridaId,
            String categoriaSugeridaNombre,
            Long prioridadSugeridaId,
            String prioridadSugeridaNombre,
            String modelo,
            String decisionRevision,
            String errorDetalle,
            LocalDateTime creadoEn,
            LocalDateTime completadoEn,
            LocalDateTime revisadoEn
    ) {}

    public record AsignacionDto(
            Long id,
            Long tecnicoId,
            String tecnicoNombre,
            String tecnicoCorreo,
            boolean vigente,
            LocalDateTime asignadaEn,
            LocalDateTime finalizadaEn,
            String motivoFin
    ) {}

    public record HistorialEstadoDto(
            Long id,
            String estadoAnterior,
            String estadoNuevo,
            String usuarioNombre,
            String usuarioPerfil,
            LocalDateTime cambiadoEn,
            String motivo
    ) {}

    public record SolicitudResponse(
            Long id,
            String codigo,
            Long solicitanteId,
            String solicitanteNombre,
            String solicitanteCorreo,
            Long registradaPorUsuarioId,
            String registradaPorNombre,
            Long recursoId,
            String recursoCodigo,
            String recursoNombre,
            String recursoUbicacion,
            String descripcion,
            String estado,
            boolean estadoEsFinal,
            String categoria,
            String prioridad,
            String trabajoRealizado,
            LocalDateTime trabajoActualizadoEn,
            String motivoCierre,
            AsignacionDto asignacionVigente,
            LocalDateTime creadaEn,
            LocalDateTime actualizadaEn,
            LocalDateTime cerradaEn,
            Integer version,
            List<HistorialEstadoDto> historial
    ) {}
}
