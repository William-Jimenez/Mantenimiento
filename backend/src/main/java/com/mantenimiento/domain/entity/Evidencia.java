package com.mantenimiento.domain.entity;

import com.mantenimiento.domain.enums.TipoEvidencia;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "evidencia")
public class Evidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id", nullable = false)
    private Solicitud solicitud;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEvidencia tipo;

    @Column(name = "nombre_original", nullable = false, length = 255)
    private String nombreOriginal;

    @Column(name = "nombre_almacenado", nullable = false, unique = true, length = 40)
    private String nombreAlmacenado;

    @Column(name = "tipo_mime", nullable = false, length = 100)
    private String tipoMime;

    @Column(name = "tamano_bytes", nullable = false)
    private Integer tamanoBytes;

    @Column(name = "hash_sha256", nullable = false, length = 64)
    private String hashSha256;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subida_por_usuario_id", nullable = false)
    private Usuario subidaPor;

    @Column(name = "subida_en", nullable = false, updatable = false)
    private LocalDateTime subidaEn = LocalDateTime.now();

    public Evidencia() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Solicitud getSolicitud() { return solicitud; }
    public void setSolicitud(Solicitud solicitud) { this.solicitud = solicitud; }
    public TipoEvidencia getTipo() { return tipo; }
    public void setTipo(TipoEvidencia tipo) { this.tipo = tipo; }
    public String getNombreOriginal() { return nombreOriginal; }
    public void setNombreOriginal(String nombreOriginal) { this.nombreOriginal = nombreOriginal; }
    public String getNombreAlmacenado() { return nombreAlmacenado; }
    public void setNombreAlmacenado(String nombreAlmacenado) { this.nombreAlmacenado = nombreAlmacenado; }
    public String getTipoMime() { return tipoMime; }
    public void setTipoMime(String tipoMime) { this.tipoMime = tipoMime; }
    public Integer getTamanoBytes() { return tamanoBytes; }
    public void setTamanoBytes(Integer tamanoBytes) { this.tamanoBytes = tamanoBytes; }
    public String getHashSha256() { return hashSha256; }
    public void setHashSha256(String hashSha256) { this.hashSha256 = hashSha256; }
    public Usuario getSubidaPor() { return subidaPor; }
    public void setSubidaPor(Usuario subidaPor) { this.subidaPor = subidaPor; }
    public LocalDateTime getSubidaEn() { return subidaEn; }
    public void setSubidaEn(LocalDateTime subidaEn) { this.subidaEn = subidaEn; }
}
