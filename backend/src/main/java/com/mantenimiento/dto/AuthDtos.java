package com.mantenimiento.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank(message = "El correo electrónico es obligatorio")
            @Email(message = "El formato del correo electrónico no es válido")
            String correo,

            @NotBlank(message = "La contraseña es obligatoria")
            String password
    ) {}

    public record RegisterRequest(
            @NotBlank(message = "El documento de identidad es obligatorio")
            @Size(min = 5, max = 20, message = "El documento debe tener entre 5 y 20 caracteres")
            String documento,

            @NotBlank(message = "El nombre es obligatorio")
            String nombres,

            @NotBlank(message = "El apellido es obligatorio")
            String apellidos,

            @NotBlank(message = "El correo electrónico es obligatorio")
            @Email(message = "El formato del correo electrónico no es válido")
            String correo,

            String cargo,

            @NotBlank(message = "La contraseña es obligatoria")
            @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
            String password
    ) {}

    public record PasswordResetRequest(
            @NotBlank(message = "El correo electrónico es obligatorio")
            @Email(message = "El formato del correo electrónico no es válido")
            String correo
    ) {}

    public record PasswordResetConfirmRequest(
            @NotBlank(message = "El correo electrónico es obligatorio")
            @Email(message = "El formato del correo electrónico no es válido")
            String correo,

            @NotBlank(message = "El código de verificación es obligatorio")
            String codigo,

            @NotBlank(message = "La nueva contraseña es obligatoria")
            @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
            String nuevaPassword
    ) {}

    public record UserProfileDto(
            Long usuarioId,
            Long empleadoId,
            String documento,
            String nombreCompleto,
            String correo,
            String cargo,
            String perfil,
            boolean esTecnico,
            boolean activo
    ) {}

    public record AuthResponse(
            String token,
            String tokenType,
            UserProfileDto usuario
    ) {}
}
