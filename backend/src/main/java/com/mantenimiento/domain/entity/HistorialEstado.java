package com.mantenimiento.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "historial_estado")
public class HistorialEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id", nullable = false)
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "estado_anterior_id")
    private Estado estadoAnterior;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "estado_nuevo_id", nullable = false)
    private Estado estadoNuevo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "cambiado_en", nullable = false, updatable = false)
    private LocalDateTime cambiadoEn = LocalDateTime.now();

    @Column(length = 500)
    private String motivo;

    public HistorialEstado() {}

    public HistorialEstado(Solicitud solicitud, Estado estadoAnterior, Estado estadoNuevo, Usuario usuario, String motivo) {
        this.solicitud = solicitud;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.usuario = usuario;
        this.motivo = motivo;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Solicitud getSolicitud() { return solicitud; }
    public void setSolicitud(Solicitud solicitud) { this.solicitud = solicitud; }
    public Estado getEstadoAnterior() { return estadoAnterior; }
    public void setEstadoAnterior(Estado estadoAnterior) { this.estadoAnterior = estadoAnterior; }
    public Estado getEstadoNuevo() { return estadoNuevo; }
    public void setEstadoNuevo(Estado estadoNuevo) { this.estadoNuevo = estadoNuevo; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public LocalDateTime getCambiadoEn() { return cambiadoEn; }
    public void setCambiadoEn(LocalDateTime cambiadoEn) { this.cambiadoEn = cambiadoEn; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}
