package com.mantenimiento.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RecursoDtos {

    public record CreateRecursoRequest(
            @NotBlank(message = "El código del recurso es obligatorio")
            String codigo,

            @NotBlank(message = "El nombre del recurso es obligatorio")
            String nombre,

            @NotNull(message = "El ID del tipo de recurso es obligatorio")
            Long tipoRecursoId,

            @NotBlank(message = "La ubicación es obligatoria")
            String ubicacion,

            String descripcion
    ) {}

    public record UpdateRecursoRequest(
            String nombre,
            Long tipoRecursoId,
            String ubicacion,
            String descripcion,
            Boolean activo
    ) {}

    public record RecursoResponse(
            Long id,
            String codigo,
            String nombre,
            Long tipoRecursoId,
            String tipoRecursoNombre,
            String ubicacion,
            String descripcion,
            boolean activo
    ) {}
}
