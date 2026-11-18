package com.mantenimiento.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "asignacion")
public class Asignacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "solicitud_id", nullable = false)
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Empleado tecnico;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asignada_por_usuario_id", nullable = false)
    private Usuario asignadaPor;

    @Column(name = "asignada_en", nullable = false, updatable = false)
    private LocalDateTime asignadaEn = LocalDateTime.now();

    @Column(nullable = false)
    private boolean vigente = true;

    @Column(name = "finalizada_en")
    private LocalDateTime finalizadaEn;

    @Column(name = "motivo_fin", length = 300)
    private String motivoFin;

    public Asignacion() {}

    public Asignacion(Solicitud solicitud, Empleado tecnico, Usuario asignadaPor) {
        this.solicitud = solicitud;
        this.tecnico = tecnico;
        this.asignadaPor = asignadaPor;
        this.vigente = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Solicitud getSolicitud() { return solicitud; }
    public void setSolicitud(Solicitud solicitud) { this.solicitud = solicitud; }
    public Empleado getTecnico() { return tecnico; }
    public void setTecnico(Empleado tecnico) { this.tecnico = tecnico; }
    public Usuario getAsignadaPor() { return asignadaPor; }
    public void setAsignadaPor(Usuario asignadaPor) { this.asignadaPor = asignadaPor; }
    public LocalDateTime getAsignadaEn() { return asignadaEn; }
    public void setAsignadaEn(LocalDateTime asignadaEn) { this.asignadaEn = asignadaEn; }
    public boolean isVigente() { return vigente; }
    public void setVigente(boolean vigente) { this.vigente = vigente; }
    public LocalDateTime getFinalizadaEn() { return finalizadaEn; }
    public void setFinalizadaEn(LocalDateTime finalizadaEn) { this.finalizadaEn = finalizadaEn; }
    public String getMotivoFin() { return motivoFin; }
    public void setMotivoFin(String motivoFin) { this.motivoFin = motivoFin; }
}
