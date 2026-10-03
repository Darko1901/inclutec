-- Recalcula el índice de compatibilidad a partir de los datos y lo compara con la tabla precalculada.
-- Sirve como referencia para implementar el motor de compatibilidad en el API.
WITH h AS (
  SELECT c.usuario_id AS candidato_id, v.id AS vacante_id,
         (2 * count(*) FILTER (WHERE vh.obligatoria AND ch.habilidad_id IS NOT NULL)
            + count(*) FILTER (WHERE NOT vh.obligatoria AND ch.habilidad_id IS NOT NULL))::numeric
         / NULLIF(2 * count(*) FILTER (WHERE vh.obligatoria) + count(*) FILTER (WHERE NOT vh.obligatoria), 0) AS h
  FROM candidato c CROSS JOIN vacante v
  JOIN vacante_habilidad vh ON vh.vacante_id = v.id
  LEFT JOIN candidato_habilidad ch ON ch.candidato_id = c.usuario_id AND ch.habilidad_id = vh.habilidad_id
  GROUP BY c.usuario_id, v.id
), a AS (
  SELECT c.usuario_id AS candidato_id, v.id AS vacante_id,
         COALESCE(count(va.ajuste_id)::numeric / NULLIF(count(cn.ajuste_id), 0), 1) AS a
  FROM candidato c CROSS JOIN vacante v
  LEFT JOIN candidato_necesidad cn ON cn.candidato_id = c.usuario_id
  LEFT JOIN vacante_ajuste va ON va.vacante_id = v.id AND va.ajuste_id = cn.ajuste_id
  GROUP BY c.usuario_id, v.id
), m AS (
  SELECT c.usuario_id AS candidato_id, v.id AS vacante_id,
         CASE WHEN EXISTS (SELECT 1 FROM candidato_modalidad cm
                           WHERE cm.candidato_id = c.usuario_id AND cm.modalidad_id = v.modalidad_id) THEN 1
              WHEN (SELECT nombre FROM modalidad WHERE id = v.modalidad_id) = 'Híbrido' THEN 0.5
              ELSE 0 END AS m
  FROM candidato c CROSS JOIN vacante v
), f AS (
  SELECT c.usuario_id AS candidato_id, v.id AS vacante_id,
         CASE WHEN v.nivel_educativo_id IS NULL THEN 1
              WHEN EXISTS (SELECT 1 FROM formacion fo JOIN nivel_educativo ne ON ne.id = fo.nivel_educativo_id
                           WHERE fo.candidato_id = c.usuario_id AND fo.estado = 'concluida'
                             AND ne.orden >= (SELECT orden FROM nivel_educativo WHERE id = v.nivel_educativo_id)) THEN 1
              WHEN EXISTS (SELECT 1 FROM formacion fo JOIN nivel_educativo ne ON ne.id = fo.nivel_educativo_id
                           WHERE fo.candidato_id = c.usuario_id AND fo.estado = 'en_curso'
                             AND ne.orden >= (SELECT orden FROM nivel_educativo WHERE id = v.nivel_educativo_id)) THEN 0.5
              ELSE 0 END AS f
  FROM candidato c CROSS JOIN vacante v
)
SELECT h.candidato_id, h.vacante_id, round(h.h, 3) AS h, round(a.a, 3) AS a, m.m, f.f,
       round(100 * (0.40 * h.h + 0.30 * a.a + 0.15 * m.m + 0.15 * f.f)) AS puntaje_candidato,
       round(100 * (0.40 * h.h + 0.15 * m.m + 0.15 * f.f) / 0.70) AS puntaje_reclutador,
       (SELECT puntaje_candidato FROM compatibilidad x WHERE x.candidato_id = h.candidato_id AND x.vacante_id = h.vacante_id) AS guardado_candidato,
       (SELECT puntaje_reclutador FROM compatibilidad x WHERE x.candidato_id = h.candidato_id AND x.vacante_id = h.vacante_id) AS guardado_reclutador
FROM h JOIN a USING (candidato_id, vacante_id) JOIN m USING (candidato_id, vacante_id) JOIN f USING (candidato_id, vacante_id)
ORDER BY 1, 2;
