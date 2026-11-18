package com.mantenimiento.domain.entity;

import com.mantenimiento.domain.enums.DecisionRevisionIA;
import com.mantenimiento.domain.enums.EstadoAnalisisIA;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "analisis_ia",
    uniqueConstraints = @UniqueConstraint(name = "uq_analisis_solicitud_version", columnNames = {"solicitud_id", "version"})
)
public class AnalisisIA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id", nullable = false)
    private Solicitud solicitud;

    @Column(nullable = false)
    private Integer version = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_analisis", nullable = false, length = 20)
    private EstadoAnalisisIA estadoAnalisis = EstadoAnalisisIA.EN_COLA;

    @Column(name = "tipo_dano", length = 200)
    private String tipoDano;

    @Column(name = "descripcion_observada", columnDefinition = "TEXT")
    private String descripcionObservada;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_sugerida_id")
    private Categoria categoriaSugerida;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "prioridad_sugerida_id")
    private Prioridad prioridadSugerida;

    @Column(length = 100)
    private String modelo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitado_por_usuario_id")
    private Usuario solicitadoPor;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "completado_en")
    private LocalDateTime completadoEn;

    @Column(name = "error_detalle", length = 500)
    private String errorDetalle;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_revision", nullable = false, length = 20)
    private DecisionRevisionIA decisionRevision = DecisionRevisionIA.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revisado_por_usuario_id")
    private Usuario revisadoPor;

    @Column(name = "revisado_en")
    private LocalDateTime revisadoEn;

    public AnalisisIA() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Solicitud getSolicitud() { return solicitud; }
    public void setSolicitud(Solicitud solicitud) { this.solicitud = solicitud; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public EstadoAnalisisIA getEstadoAnalisis() { return estadoAnalisis; }
    public void setEstadoAnalisis(EstadoAnalisisIA estadoAnalisis) { this.estadoAnalisis = estadoAnalisis; }
    public String getTipoDano() { return tipoDano; }
    public void setTipoDano(String tipoDano) { this.tipoDano = tipoDano; }
    public String getDescripcionObservada() { return descripcionObservada; }
    public void setDescripcionObservada(String descripcionObservada) { this.descripcionObservada = descripcionObservada; }
    public Categoria getCategoriaSugerida() { return categoriaSugerida; }
    public void setCategoriaSugerida(Categoria categoriaSugerida) { this.categoriaSugerida = categoriaSugerida; }
    public Prioridad getPrioridadSugerida() { return prioridadSugerida; }
    public void setPrioridadSugerida(Prioridad prioridadSugerida) { this.prioridadSugerida = prioridadSugerida; }
    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }
    public Usuario getSolicitadoPor() { return solicitadoPor; }
    public void setSolicitadoPor(Usuario solicitadoPor) { this.solicitadoPor = solicitadoPor; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
    public LocalDateTime getCompletadoEn() { return completadoEn; }
    public void setCompletadoEn(LocalDateTime completadoEn) { this.completadoEn = completadoEn; }
    public String getErrorDetalle() { return errorDetalle; }
    public void setErrorDetalle(String errorDetalle) { this.errorDetalle = errorDetalle; }
    public DecisionRevisionIA getDecisionRevision() { return decisionRevision; }
    public void setDecisionRevision(DecisionRevisionIA decisionRevision) { this.decisionRevision = decisionRevision; }
    public Usuario getRevisadoPor() { return revisadoPor; }
    public void setRevisadoPor(Usuario revisadoPor) { this.revisadoPor = revisadoPor; }
    public LocalDateTime getRevisadoEn() { return revisadoEn; }
    public void setRevisadoEn(LocalDateTime revisadoEn) { this.revisadoEn = revisadoEn; }
}
