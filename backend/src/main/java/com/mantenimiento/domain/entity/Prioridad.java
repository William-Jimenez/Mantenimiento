package com.mantenimiento.domain.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "prioridad")
public class Prioridad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String nombre;

    @Column(nullable = false, unique = true)
    private short nivel;

    @Column(nullable = false, length = 200)
    private String descripcion;

    public Prioridad() {}

    public Prioridad(String nombre, short nivel, String descripcion) {
        this.nombre = nombre;
        this.nivel = nivel;
        this.descripcion = descripcion;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public short getNivel() { return nivel; }
    public void setNivel(short nivel) { this.nivel = nivel; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
