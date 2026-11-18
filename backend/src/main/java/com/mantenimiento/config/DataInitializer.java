package com.mantenimiento.config;

import com.mantenimiento.domain.entity.*;
import com.mantenimiento.domain.enums.PerfilUsuario;
import com.mantenimiento.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final EstadoRepository estadoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PrioridadRepository prioridadRepository;
    private final TipoRecursoRepository tipoRecursoRepository;
    private final RecursoRepository recursoRepository;
    private final EmpleadoRepository empleadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SolicitudRepository solicitudRepository;
    private final AsignacionRepository asignacionRepository;
    private final HistorialEstadoRepository historialRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            EstadoRepository estadoRepository,
            CategoriaRepository categoriaRepository,
            PrioridadRepository prioridadRepository,
            TipoRecursoRepository tipoRecursoRepository,
            RecursoRepository recursoRepository,
            EmpleadoRepository empleadoRepository,
            UsuarioRepository usuarioRepository,
            SolicitudRepository solicitudRepository,
            AsignacionRepository asignacionRepository,
            HistorialEstadoRepository historialRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.estadoRepository = estadoRepository;
        this.categoriaRepository = categoriaRepository;
        this.prioridadRepository = prioridadRepository;
        this.tipoRecursoRepository = tipoRecursoRepository;
        this.recursoRepository = recursoRepository;
        this.empleadoRepository = empleadoRepository;
        this.usuarioRepository = usuarioRepository;
        this.solicitudRepository = solicitudRepository;
        this.asignacionRepository = asignacionRepository;
        this.historialRepository = historialRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (estadoRepository.count() > 0) {
            return;
        }

        // 1. Estados canónicos
        Estado estPendiente = estadoRepository.save(new Estado("Pendiente", false));
        Estado estAsignada = estadoRepository.save(new Estado("Asignada", false));
        estadoRepository.save(new Estado("En proceso", false));
        estadoRepository.save(new Estado("Finalizada", true));
        estadoRepository.save(new Estado("Cancelada", true));
        estadoRepository.save(new Estado("Rechazada", true));

        // 2. Categorías técnicas
        Categoria catElectrica = categoriaRepository.save(new Categoria("Eléctrica"));
        Categoria catMecanica = categoriaRepository.save(new Categoria("Mecánica"));
        categoriaRepository.save(new Categoria("Hidráulica"));
        categoriaRepository.save(new Categoria("Locativa/Estructural"));
        Categoria catInformatica = categoriaRepository.save(new Categoria("Informática/Electrónica"));
        categoriaRepository.save(new Categoria("Otra"));

        // 3. Prioridades
        prioridadRepository.save(new Prioridad("Baja", (short) 1, "Impacto menor sin afectación operativa inmediata"));
        Prioridad prioMedia = prioridadRepository.save(new Prioridad("Media", (short) 2, "Afectación parcial con alternativa operativa temporal"));
        Prioridad prioAlta = prioridadRepository.save(new Prioridad("Alta", (short) 3, "Falla importante que compromete la continuidad del área"));
        prioridadRepository.save(new Prioridad("Crítica", (short) 4, "Parada crítica de operación o riesgo de seguridad"));

        // 4. Tipos de recurso y recursos físicos
        TipoRecurso tipoEquipo = tipoRecursoRepository.save(new TipoRecurso("Equipo tecnológico"));
        TipoRecurso tipoInstalacion = tipoRecursoRepository.save(new TipoRecurso("Instalación o edificio"));
        TipoRecurso tipoMaquinaria = tipoRecursoRepository.save(new TipoRecurso("Maquinaria"));
        tipoRecursoRepository.save(new TipoRecurso("Herramienta"));

        Recurso recServidor = recursoRepository.save(new Recurso(
                "EQ-TI-0014",
                "Servidor Rack Principal Dell PowerEdge R750",
                tipoEquipo,
                "Centro de Datos - Piso 3",
                "Servidor de virtualización crítica con fuente redundante"
        ));
        Recurso recCompresor = recursoRepository.save(new Recurso(
                "MQ-IN-0008",
                "Compresor Industrial Atlas Copco GA37",
                tipoMaquinaria,
                "Planta de Producción - Nave B",
                "Compresor de tornillo rotativo 50 HP"
        ));
        recursoRepository.save(new Recurso(
                "IN-ED-0003",
                "Tablero Eléctrico General Subestación Norte",
                tipoInstalacion,
                "Sótano Técnico - Bloque A",
                "Tablero trifásico de distribución 440V"
        ));

        // 5. Empleados y Usuarios (RBAC: ADMINISTRADOR, EMPLEADO, CLIENTE)
        Empleado empAdmin = empleadoRepository.save(new Empleado(
                "101000100",
                "Laura",
                "Martínez",
                "admin@empresa.com",
                "Jefe de Mantenimiento",
                true
        ));
        Usuario usrAdmin = usuarioRepository.save(new Usuario(
                empAdmin,
                PerfilUsuario.ADMINISTRADOR,
                passwordEncoder.encode("admin12345"),
                false
        ));

        Empleado empTecnico = empleadoRepository.save(new Empleado(
                "102000200",
                "Carlos",
                "Méndez",
                "carlos.mendez@empresa.com",
                "Técnico Especialista Electromecánico",
                true
        ));
        usuarioRepository.save(new Usuario(
                empTecnico,
                PerfilUsuario.EMPLEADO,
                passwordEncoder.encode("Tecnico123*"),
                false
        ));

        Empleado empCliente = empleadoRepository.save(new Empleado(
                "103000300",
                "Ana",
                "Gómez",
                "ana.gomez@empresa.com",
                "Analista de Operaciones",
                false
        ));
        Usuario usrCliente = usuarioRepository.save(new Usuario(
                empCliente,
                PerfilUsuario.CLIENTE,
                passwordEncoder.encode("Cliente123*"),
                false
        ));

        // 6. Solicitudes semilla
        Solicitud sol1 = new Solicitud();
        sol1.setCodigo("SM-2026-000001");
        sol1.setSolicitante(empCliente);
        sol1.setRegistradaPor(usrCliente);
        sol1.setRecurso(recServidor);
        sol1.setDescripcion("El servidor principal presenta alerta térmica intermitente en los ventiladores del chasis y ruido anormal en la fuente #2.");
        sol1.setEstado(estPendiente);
        sol1.setCategoria(catInformatica);
        sol1.setPrioridad(prioAlta);
        sol1 = solicitudRepository.save(sol1);

        historialRepository.save(new HistorialEstado(
                sol1,
                null,
                estPendiente,
                usrCliente,
                "Radicación inicial de solicitud de mantenimiento"
        ));

        Solicitud sol2 = new Solicitud();
        sol2.setCodigo("SM-2026-000002");
        sol2.setSolicitante(empCliente);
        sol2.setRegistradaPor(usrCliente);
        sol2.setRecurso(recCompresor);
        sol2.setDescripcion("Caída de presión en línea neumática principal acompañada de vibración excesiva en el cabezal del compresor.");
        sol2.setEstado(estAsignada);
        sol2.setCategoria(catMecanica);
        sol2.setPrioridad(prioMedia);
        sol2 = solicitudRepository.save(sol2);

        asignacionRepository.save(new Asignacion(sol2, empTecnico, usrAdmin));
        historialRepository.save(new HistorialEstado(
                sol2,
                null,
                estPendiente,
                usrCliente,
                "Radicación inicial de solicitud"
        ));
        historialRepository.save(new HistorialEstado(
                sol2,
                estPendiente,
                estAsignada,
                usrAdmin,
                "Asignación técnica a Carlos Méndez"
        ));
    }
}
