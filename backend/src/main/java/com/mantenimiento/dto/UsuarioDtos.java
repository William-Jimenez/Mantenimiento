package com.mantenimiento.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UsuarioDtos {

    public record CreateUsuarioRequest(
            @NotBlank(message = "El documento es obligatorio")
            String documento,

            @NotBlank(message = "Los nombres son obligatorios")
            String nombres,

            @NotBlank(message = "Los apellidos son obligatorios")
            String apellidos,

            @NotBlank(message = "El correo es obligatorio")
            @Email(message = "El correo no es válido")
            String correo,

            @NotBlank(message = "El cargo es obligatorio")
            String cargo,

            @NotBlank(message = "El perfil (ADMINISTRADOR, EMPLEADO o CLIENTE) es obligatorio")
            String perfil,

            boolean esTecnico,

            @NotBlank(message = "La contraseña es obligatoria")
            @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
            String password
    ) {}

    public record CambiarRolRequest(
            @NotBlank(message = "El nuevo perfil es obligatorio")
            String perfil,

            Boolean esTecnico
    ) {}
}
