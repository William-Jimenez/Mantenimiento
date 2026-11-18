package com.mantenimiento.security;

import com.mantenimiento.domain.entity.Usuario;
import com.mantenimiento.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmpleadoCorreoIgnoreCase(correo)
                .orElseThrow(() -> new UsernameNotFoundException("No se encontró usuario con el correo: " + correo));
        return new CustomUserDetails(usuario);
    }

    public CustomUserDetails loadUserById(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("No se encontró usuario con ID: " + userId));
        return new CustomUserDetails(usuario);
    }
}
