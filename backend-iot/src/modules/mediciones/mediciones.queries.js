const SQL_MEDICIONES_POR_CIRCUITO = `
  SELECT m.id, m.circuito_id, c.indice AS circuito,
         m.potencia, m.energia, m.voltaje, m.corriente,
         m.factor_potencia, m.created_at
  FROM mediciones m
  JOIN circuitos c ON c.id = m.circuito_id
  WHERE m.circuito_id = $1
  ORDER BY m.created_at ASC, c.indice ASC, m.id ASC
`;

module.exports = { SQL_MEDICIONES_POR_CIRCUITO };
