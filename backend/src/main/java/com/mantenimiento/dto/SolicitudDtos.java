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
