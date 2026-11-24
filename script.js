
// 1. Seleccionar los elementos HTML
const formulario = document.querySelector("#formulario");
const campoCiudad = document.querySelector("#ciudad");
const estado = document.querySelector("#estado");
const resultado = document.querySelector("#resultado");

// 2. Escuchar el envío del formulario
formulario.addEventListener("submit", consultarClima);


// 3. Función asíncrona para consultar las API
async function consultarClima(evento) {

    // Evita que la página se recargue
    evento.preventDefault();

    // Obtener el nombre de la ciudad
    const ciudad = campoCiudad.value.trim();

    // Ocultar el resultado anterior
    resultado.hidden = true;
    estado.textContent = "Buscando ciudad...";

    try {

        // 4. PRIMERA PETICIÓN: buscar las coordenadas
        const urlGeo = new URL(
            "https://geocoding-api.open-meteo.com/v1/search"
        );

        urlGeo.search = new URLSearchParams({
            name: ciudad,
            count: "1",
            language: "es",
            format: "json"
        }).toString();

        const respuestaGeo = await fetch(urlGeo);

        if (!respuestaGeo.ok) {
            throw new Error("No se pudo buscar la ciudad.");
        }

        const datosGeo = await respuestaGeo.json();

        // Comprobar que se encontró una ciudad
        const lugar = datosGeo.results?.[0];

        if (!lugar) {
            throw new Error("No encontramos esa ciudad.");
        }

        // 5. SEGUNDA PETICIÓN: consultar el clima
        estado.textContent = "Consultando el clima...";

        const urlClima = new URL(
            "https://api.open-meteo.com/v1/forecast"
        );

        urlClima.search = new URLSearchParams({
            latitude: lugar.latitude,
            longitude: lugar.longitude,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
            daily: "weather_code,temperature_2m_max,temperature_2m_min",
            forecast_days: "4",
            timezone: "auto",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh"
        }).toString();

        const respuestaClima = await fetch(urlClima);

        if (!respuestaClima.ok) {
            throw new Error("No se pudo consultar el clima.");
        }

        const datosClima = await respuestaClima.json();

        // 6. Extraer los datos meteorológicos actuales
        const actual = datosClima.current;

        // 7. Interpretar el código meteorológico
        const condicion = describirClima(actual.weather_code);
        document.body.dataset.weather = categoriaClima(actual.weather_code);

        // 8. Mostrar los datos en los elementos HTML
        document.querySelector("#ubicacion").textContent =
            [lugar.name, lugar.admin1, lugar.country]
            .filter(Boolean).join(", ");

        document.querySelector("#icono").textContent =
            condicion.icono;

        document.querySelector("#temperatura").textContent =
            actual.temperature_2m.toFixed(1) + " °C";

        document.querySelector("#descripcion").textContent =
            condicion.texto;

        document.querySelector("#humedad").textContent =
            formatearNumero(actual.relative_humidity_2m, 0) + " %";

        document.querySelector("#sensacion").textContent =
            formatearNumero(actual.apparent_temperature, 1) + " °C";

        document.querySelector("#viento").textContent =
            formatearNumero(actual.wind_speed_10m, 1) + " km/h";

        document.querySelector("#actualizacion").textContent =
            "Datos para " + actual.time.replace("T", " ") +
            " (hora local).";

        const contenedorDias = document.querySelector("#dias");
        contenedorDias.replaceChildren();

        const nombresPronostico = ["Mañana", "Pasado mañana", "En 3 días"];

        for (let indice = 1; indice <= 3; indice++) {
            const indicePronostico = indice - 1;
            const codigoDia = datosClima.daily?.weather_code?.[indice];
            const condicionDia = describirClima(codigoDia);
            const fechaTexto = datosClima.daily?.time?.[indice];

            if (codigoDia == null || !fechaTexto) continue;

            const fecha = new Date(fechaTexto + "T12:00:00");
            const fechaCorta = new Intl.DateTimeFormat("es", {
                day: "numeric",
                month: "short"
            }).format(fecha);

            const tarjeta = document.createElement("article");

            const dia = document.createElement("strong");
            dia.className = "dia-nombre";
            dia.textContent = nombresPronostico[indicePronostico] + " · " + fechaCorta;

            const icono = document.createElement("span");
            icono.className = "dia-icono";
            icono.textContent = condicionDia.icono;

            const temperaturas = document.createElement("p");
            temperaturas.className = "dia-temperaturas";
            temperaturas.textContent =
                formatearNumero(datosClima.daily?.temperature_2m_max?.[indice], 0) + "°" +
                " / " +
                formatearNumero(datosClima.daily?.temperature_2m_min?.[indice], 0) + "°";

            const descripcion = document.createElement("span");
            descripcion.className = "dia-descripcion";
            descripcion.textContent = condicionDia.texto;

            tarjeta.append(dia, icono, temperaturas, descripcion);
            contenedorDias.appendChild(tarjeta);
        }

        // Mostrar el resultado
        resultado.hidden = false;
        estado.textContent = "Consulta completada.";

    } catch (error) {

        // Mostrar un mensaje si ocurre algún problema
        estado.textContent = error.message;
        console.error(error);
    }
}


// 9. Función para traducir los códigos meteorológicos
function formatearNumero(valor, decimales) {
    return typeof valor === "number" && Number.isFinite(valor)
        ? valor.toFixed(decimales)
        : "--";
}

function categoriaClima(codigo) {
    if (codigo === 0) return "soleado";
    if (codigo === 1 || codigo === 2) return "parcial";
    if (codigo === 3 || codigo === 45 || codigo === 48) return "nublado";
    if (codigo >= 71 && codigo <= 77) return "nieve";
    if (codigo >= 95) return "tormenta";
    return "lluvia";
}

function describirClima(codigo) {

    const condiciones = {
        0:  { texto: "Despejado", icono: "☀️" },
        1:  { texto: "Principalmente despejado", icono: "🌤️" },
        2:  { texto: "Parcialmente nublado", icono: "⛅" },
        3:  { texto: "Nublado", icono: "☁️" },
        45: { texto: "Niebla", icono: "🌫️" },
        48: { texto: "Niebla", icono: "🌫️" },
        51: { texto: "Llovizna", icono: "🌦️" },
        53: { texto: "Llovizna", icono: "🌦️" },
        55: { texto: "Llovizna intensa", icono: "🌧️" },
        61: { texto: "Lluvia ligera", icono: "🌧️" },
        63: { texto: "Lluvia moderada", icono: "🌧️" },
        65: { texto: "Lluvia intensa", icono: "🌧️" },
        71: { texto: "Nevada ligera", icono: "❄️" },
        73: { texto: "Nevada moderada", icono: "❄️" },
        75: { texto: "Nevada intensa", icono: "❄️" },
        80: { texto: "Chubascos", icono: "🌦️" },
        81: { texto: "Chubascos moderados", icono: "🌧️" },
        82: { texto: "Chubascos intensos", icono: "🌧️" },
        95: { texto: "Tormenta eléctrica", icono: "⛈️" },
        96: { texto: "Tormenta con granizo", icono: "⛈️" },
        99: { texto: "Tormenta intensa con granizo", icono: "⛈️" }
    };

    return condiciones[codigo] || {
        texto: "Condición meteorológica variable",
        icono: "🌡️"
    };
}
