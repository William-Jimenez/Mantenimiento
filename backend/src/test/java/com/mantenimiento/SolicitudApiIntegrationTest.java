package com.mantenimiento;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SolicitudApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String loginAndGetToken(String correo, String password) throws Exception {
        String payload = String.format("{\"correo\":\"%s\",\"password\":\"%s\"}", correo, password);
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("token").asText();
    }

    @Test
    void flujoCompletoCrudSolicitudesYControlDeRolesRBAC() throws Exception {
        // 1. Login como CLIENTE y ADMINISTRADOR
        String clienteToken = loginAndGetToken("ana.gomez@empresa.com", "Cliente123*");
        String adminToken = loginAndGetToken("admin@empresa.com", "admin12345");
        String tecnicoToken = loginAndGetToken("carlos.mendez@empresa.com", "Tecnico123*");

        // 2. CLIENTE intenta acceder a /api/usuarios -> 403 Forbidden
        mockMvc.perform(get("/api/usuarios")
                        .header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isForbidden());

        // 3. CLIENTE crea una nueva solicitud (POST /api/solicitudes)
        String nuevaSolicitudJson = """
                {
                  "recursoId": 1,
                  "descripcion": "Falla eléctrica severa en unidad de distribución con sobrecalentamiento de bornes."
                }
                """;
        MvcResult createRes = mockMvc.perform(post("/api/solicitudes")
                        .header("Authorization", "Bearer " + clienteToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(nuevaSolicitudJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("Pendiente"))
                .andReturn();

        Long solicitudId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // 4. CLIENTE actualiza la descripción mientras está Pendiente (PUT /api/solicitudes/{id})
        String updateJson = """
                {
                  "descripcion": "Falla eléctrica severa en unidad de distribución con sobrecalentamiento de bornes y olor a aislamiento quemado."
                }
                """;
        mockMvc.perform(put("/api/solicitudes/" + solicitudId)
                        .header("Authorization", "Bearer " + clienteToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descripcion").value("Falla eléctrica severa en unidad de distribución con sobrecalentamiento de bornes y olor a aislamiento quemado."));

        // 5. CLIENTE intenta asignar técnico -> 403 Forbidden
        mockMvc.perform(patch("/api/solicitudes/" + solicitudId + "/asignar")
                        .header("Authorization", "Bearer " + clienteToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tecnicoId\": 2}"))
                .andExpect(status().isForbidden());

        // 6. ADMINISTRADOR asigna al técnico Carlos Méndez (ID 2) -> Estado pasa a Asignada
        mockMvc.perform(patch("/api/solicitudes/" + solicitudId + "/asignar")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tecnicoId\": 2, \"categoriaId\": 1, \"prioridadId\": 3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Asignada"))
                .andExpect(jsonPath("$.asignacionVigente.tecnicoId").value(2));

        // 7. EMPLEADO (técnico) inicia la atención -> Estado pasa a En proceso
        mockMvc.perform(patch("/api/solicitudes/" + solicitudId + "/estado")
                        .header("Authorization", "Bearer " + tecnicoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nuevoEstado\": \"En proceso\", \"motivo\": \"Iniciando diagnóstico en sitio\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("En proceso"));

        // 8. EMPLEADO (técnico) registra trabajo y finaliza la solicitud -> Estado pasa a Finalizada
        mockMvc.perform(patch("/api/solicitudes/" + solicitudId + "/estado")
                        .header("Authorization", "Bearer " + tecnicoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nuevoEstado\": \"Finalizada\", \"trabajoRealizado\": \"Se reemplazaron bornes sulfatados y se verificó balance de cargas.\", \"motivo\": \"Reparación concluida\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Finalizada"))
                .andExpect(jsonPath("$.estadoEsFinal").value(true));

        // 9. Consultar historial forense de la solicitud (GET /api/solicitudes/{id}/historial)
        mockMvc.perform(get("/api/solicitudes/" + solicitudId + "/historial")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4));
    }
}
