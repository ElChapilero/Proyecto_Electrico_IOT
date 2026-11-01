export const metricInfo = {
  energia: {
    label: "Energía (kWh)",
    summary: "Es la cantidad total de electricidad que has consumido.",
    how: "Aumenta con el tiempo y cuanto más consumen tus equipos, más rápido sube. Este valor se encuentra en los recibos eléctricos.",
    detail:
      "Representa la energía acumulada que consume el circuito a lo largo del tiempo. Se calcula a partir de la potencia consumida y el tiempo de funcionamiento. Cuanto mayor sea la potencia de los equipos o más tiempo permanezcan encendidos, mayor será la energía acumulada y el costo asociado en la factura eléctrica.",
  },
  potencia: {
    label: "Potencia (W)",
    summary: "Indica cuánta electricidad están consumiendo tus equipos en este momento.",
    how: "Aumenta cuando enciendes equipos que necesitan más energía, como una nevera o un microondas.",
    detail:
      "Representa la velocidad a la que se consume energía eléctrica en un instante determinado. Depende del voltaje, la corriente y el factor de potencia. Cuando se conectan equipos de mayor demanda, la potencia aumenta. Si se mantiene elevada durante largos periodos, el consumo de energía también será mayor.",
  },
  voltaje: {
    label: "Voltaje (V)",
    summary: "Es la fuerza con la que llega la electricidad a tus equipos.",
    how: "En una vivienda de Colombia, lo normal es que esté cerca de 120 V. Puede variar sin que esto represente un problema, siempre que no se mantenga.",
    detail:
      "Representa la tensión eléctrica que alimenta los equipos conectados al circuito. Su valor puede variar según la demanda eléctrica y las características de la red de distribución. Un voltaje demasiado alto o bajo puede afectar el funcionamiento, el rendimiento y la vida útil de algunos equipos. Aunque no mide directamente el consumo de energía, sus variaciones pueden influir en él dependiendo del tipo de equipo conectado.",
  },
  corriente: {
    label: "Corriente (A)",
    summary: "Indica cuánta electricidad está circulando por el circuito en ese momento.",
    how: "Aumenta cuando conectas o enciendes más equipos.",
    detail:
      "Representa la cantidad de corriente eléctrica que circula por el circuito. Su valor depende de los equipos conectados y de su demanda de energía. Cuando aumenta la cantidad de equipos en funcionamiento, generalmente aumenta la corriente. Si supera la capacidad del circuito, puede provocar sobrecalentamientos y activar las protecciones eléctricas.",
  },
  factor_potencia: {
    label: "Factor de potencia (FP)",
    summary: "Indica qué tan bien se aprovecha la electricidad que utilizan tus equipos.",
    how: "Su valor va de 0 a 1. Cuanto más cerca esté de 1, mejor es el aprovechamiento de la electricidad.",
    detail:
      "Representa la relación entre la potencia que realmente utilizan los equipos y la potencia que necesita suministrar la red eléctrica. Su valor depende de las características de los equipos conectados, especialmente motores y dispositivos electrónicos. Un factor de potencia bajo requiere mayor corriente para entregar la misma potencia útil, lo que puede aumentar las pérdidas eléctricas y el calentamiento en cables e instalaciones. Cuanto más cercano esté a 1, mejor es el aprovechamiento de la capacidad eléctrica.",
  },
};

export function metricInfoFor(key) {
  return metricInfo[key] || metricInfo.potencia;
}
