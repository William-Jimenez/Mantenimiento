package com.mantenimiento.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "solicitud")
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "solicitante_id", nullable = false)
    private Empleado solicitante;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "registrada_por_usuario_id", nullable = false)
    private Usuario registradaPor;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "recurso_id", nullable = false)
    private Recurso recurso;

    @Column(nullable = false, length = 2000)
    private String descripcion;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "estado_id", nullable = false)
    private Estado estado;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "prioridad_id")
    private Prioridad prioridad;

    @Column(name = "trabajo_realizado", length = 2000)
    private String trabajoRealizado;

    @Column(name = "trabajo_actualizado_en")
    private LocalDateTime trabajoActualizadoEn;

    @Column(name = "motivo_cierre", length = 500)
    private String motivoCierre;

    @Column(name = "creada_en", nullable = false, updatable = false)
    private LocalDateTime creadaEn = LocalDateTime.now();

    @Column(name = "actualizada_en", nullable = false)
    private LocalDateTime actualizadaEn = LocalDateTime.now();

    @Column(name = "cerrada_en")
    private LocalDateTime cerradaEn;

    @Version
    @Column(nullable = false)
    private Integer version = 1;

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Evidencia> evidencias = new ArrayList<>();

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Asignacion> asignaciones = new ArrayList<>();

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AnalisisIA> analisisIA = new ArrayList<>();

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HistorialEstado> historial = new ArrayList<>();

    @PreUpdate
    public void preUpdate() {
        this.actualizadaEn = LocalDateTime.now();
    }

    public Solicitud() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Empleado getSolicitante() { return solicitante; }
    public void setSolicitante(Empleado solicitante) { this.solicitante = solicitante; }
    public Usuario getRegistradaPor() { return registradaPor; }
    public void setRegistradaPor(Usuario registradaPor) { this.registradaPor = registradaPor; }
    public Recurso getRecurso() { return recurso; }
    public void setRecurso(Recurso recurso) { this.recurso = recurso; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }
    public Prioridad getPrioridad() { return prioridad; }
    public void setPrioridad(Prioridad prioridad) { this.prioridad = prioridad; }
    public String getTrabajoRealizado() { return trabajoRealizado; }
    public void setTrabajoRealizado(String trabajoRealizado) { this.trabajoRealizado = trabajoRealizado; }
    public LocalDateTime getTrabajoActualizadoEn() { return trabajoActualizadoEn; }
    public void setTrabajoActualizadoEn(LocalDateTime trabajoActualizadoEn) { this.trabajoActualizadoEn = trabajoActualizadoEn; }
    public String getMotivoCierre() { return motivoCierre; }
    public void setMotivoCierre(String motivoCierre) { this.motivoCierre = motivoCierre; }
    public LocalDateTime getCreadaEn() { return creadaEn; }
    public void setCreadaEn(LocalDateTime creadaEn) { this.creadaEn = creadaEn; }
    public LocalDateTime getActualizadaEn() { return actualizadaEn; }
    public void setActualizadaEn(LocalDateTime actualizadaEn) { this.actualizadaEn = actualizadaEn; }
    public LocalDateTime getCerradaEn() { return cerradaEn; }
    public void setCerradaEn(LocalDateTime cerradaEn) { this.cerradaEn = cerradaEn; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public List<Evidencia> getEvidencias() { return evidencias; }
    public void setEvidencias(List<Evidencia> evidencias) { this.evidencias = evidencias; }
    public List<Asignacion> getAsignaciones() { return asignaciones; }
    public void setAsignaciones(List<Asignacion> asignaciones) { this.asignaciones = asignaciones; }
    public List<AnalisisIA> getAnalisisIA() { return analisisIA; }
    public void setAnalisisIA(List<AnalisisIA> analisisIA) { this.analisisIA = analisisIA; }
    public List<HistorialEstado> getHistorial() { return historial; }
    public void setHistorial(List<HistorialEstado> historial) { this.historial = historial; }
}
