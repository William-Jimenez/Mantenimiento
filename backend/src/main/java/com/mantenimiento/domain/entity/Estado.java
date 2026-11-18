package com.mantenimiento.domain.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "estado")
public class Estado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String nombre;

    @Column(name = "es_final", nullable = false)
    private boolean esFinal = false;

    public Estado() {}

    public Estado(String nombre, boolean esFinal) {
        this.nombre = nombre;
        this.esFinal = esFinal;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public boolean isEsFinal() { return esFinal; }
    public void setEsFinal(boolean esFinal) { this.esFinal = esFinal; }
}
