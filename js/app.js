document.addEventListener("DOMContentLoaded", () => {
  iniciarMenu();
  iniciarPCGE();
  iniciarLibros();
  iniciarConsejos();
  iniciarCalculadora();
  iniciarQuiz();
  $("#totalCuentas").textContent = CUENTAS.length;
});

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const ICONO_LIBRO = `<svg class="icono" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>`;

const formatoSoles = (n) =>
  "S/ " + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizar = (txt) =>
  txt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function descargarArchivo(nombre, contenido, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function iniciarMenu() {
  const btn = $("#menuBtn");
  const nav = $("#nav");

  btn.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    btn.setAttribute("aria-expanded", abierto);
  });

  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("abierto");
      btn.setAttribute("aria-expanded", "false");
    })
  );

  const secciones = $$("#inicio, main section[id]");
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        const enlace = nav.querySelector(`a[href="#${e.target.id}"]`);
        if (!enlace) return;
        nav.querySelectorAll("a").forEach((a) => a.classList.remove("activo"));
        enlace.classList.add("activo");
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  secciones.forEach((s) => observador.observe(s));

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      const destino = document.querySelector(a.getAttribute("href"));
      if (destino && destino.tagName === "DETAILS") destino.open = true;
    });
  });
}

let elementoActivo = "todos";
let cuentasFiltradas = [];

function iniciarPCGE() {
  const chips = $("#chipsElementos");

  chips.innerHTML =
    `<button class="chip activo" data-elemento="todos">Todos</button>` +
    ELEMENTOS.map(
      (e) => `<button class="chip" data-elemento="${e.id}">${e.id} · ${e.nombre}</button>`
    ).join("");

  chips.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".chip");
    if (chip) seleccionarElemento(chip.dataset.elemento);
  });

  $("#buscador").addEventListener("input", renderCuentas);

  $("#listaCuentas").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".cuenta");
    if (btn) mostrarDetalle(btn.dataset.cod);
  });

  $("#btnDescargarFiltro").addEventListener("click", () => {
    const filas = [["Codigo", "Cuenta", "Elemento", "Naturaleza"]];
    cuentasFiltradas.forEach((c) =>
      filas.push([c.cod, c.nombre, nombreElemento(c), c.naturaleza])
    );
    const csv = filas.map((f) => f.map((v) => `"${v}"`).join(";")).join("\n");
    descargarArchivo("pcge-filtrado.csv", csv);
  });

  $$("a[data-elemento]").forEach((a) =>
    a.addEventListener("click", () => seleccionarElemento(a.dataset.elemento))
  );
  $$("a[data-cuenta]").forEach((a) =>
    a.addEventListener("click", () => {
      seleccionarElemento("todos");
      mostrarDetalle(a.dataset.cuenta);
    })
  );

  renderCuentas();
}

const elementoDe = (cuenta) => cuenta.cod.charAt(0);

function nombreElemento(cuenta) {
  const el = ELEMENTOS.find((e) => e.id === elementoDe(cuenta));
  return el ? `${el.id} – ${el.nombre}` : "";
}

function seleccionarElemento(id) {
  elementoActivo = id;
  $$("#chipsElementos .chip").forEach((c) =>
    c.classList.toggle("activo", c.dataset.elemento === id)
  );
  renderCuentas();
}

function renderCuentas() {
  const texto = normalizar($("#buscador").value.trim());

  cuentasFiltradas = CUENTAS.filter((c) => {
    const coincideElemento = elementoActivo === "todos" || elementoDe(c) === elementoActivo;
    const coincideTexto =
      !texto || c.cod.startsWith(texto) || normalizar(c.nombre).includes(texto);
    return coincideElemento && coincideTexto;
  });

  const lista = $("#listaCuentas");
  if (!cuentasFiltradas.length) {
    lista.innerHTML = `<p class="sin-resultados">No se encontraron cuentas. Prueba con otro término.</p>`;
    return;
  }

  lista.innerHTML = cuentasFiltradas
    .map(
      (c) => `
      <button class="cuenta cuenta--${c.naturaleza}" data-cod="${c.cod}">
        <span class="cuenta__codigo">${c.cod}</span>
        <span class="cuenta__nombre">${c.nombre}</span>
      </button>`
    )
    .join("");
}

function dinamicaGeneral(c) {
  if (c.naturaleza === "deudora") {
    return {
      debe: ["Aumentos de la cuenta", "Saldo inicial"],
      haber: ["Disminuciones de la cuenta", "Cierre o traslado del saldo"]
    };
  }
  if (c.naturaleza === "acreedora") {
    return {
      debe: ["Disminuciones de la cuenta", "Cierre o traslado del saldo"],
      haber: ["Aumentos de la cuenta", "Saldo inicial"]
    };
  }
  return {
    debe: ["Saldos deudores trasladados (gastos o pérdidas)"],
    haber: ["Saldos acreedores trasladados (ingresos o ganancias)"]
  };
}

const TEXTO_NATURALEZA = {
  deudora: "Naturaleza deudora · aumenta por el Debe",
  acreedora: "Naturaleza acreedora · aumenta por el Haber",
  saldo: "Cuenta de saldos · determina resultados"
};

function mostrarDetalle(cod) {
  const c = CUENTAS.find((x) => x.cod === cod);
  if (!c) return;

  $$(".cuenta").forEach((b) => b.classList.toggle("seleccionada", b.dataset.cod === cod));

  const btnSel = document.querySelector(`.cuenta[data-cod="${cod}"]`);
  const listaEl = $("#listaCuentas");
  if (btnSel) listaEl.scrollTop = btnSel.offsetTop - listaEl.offsetTop - 10;

  const general = dinamicaGeneral(c);
  const debe = c.debe || general.debe;
  const haber = c.haber || general.haber;
  const lista = (arr) => `<ul>${arr.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  $("#detalleCuenta").innerHTML = `
    <div class="detalle__codigo">${c.cod}</div>
    <h3>${c.nombre}</h3>
    <div class="detalle__meta">
      <span class="insignia">Elemento ${nombreElemento(c)}</span>
      <span class="insignia insignia--${c.naturaleza}">${TEXTO_NATURALEZA[c.naturaleza]}</span>
    </div>
    ${c.desc ? `<p>${c.desc}</p>` : ""}
    <div class="cuenta-t">
      <p class="cuenta-t__titulo">Dinámica de la cuenta ${c.cod}</p>
      <div class="cuenta-t__cuerpo">
        <div class="cuenta-t__lado cuenta-t__lado--debe"><h5>Debe (se carga)</h5>${lista(debe)}</div>
        <div class="cuenta-t__lado cuenta-t__lado--haber"><h5>Haber (se abona)</h5>${lista(haber)}</div>
      </div>
    </div>
    ${!c.debe ? `<p class="nota">Dinámica general según su naturaleza.</p>` : ""}
  `;

  if (window.innerWidth < 900) {
    $("#detalleCuenta").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function iniciarLibros() {
  $("#librosGrid").innerHTML = LIBROS.map(
    (l) => `
    <article class="libro">
      <span class="libro__icono">${ICONO_LIBRO}</span>
      <div>
        <h4>${l.nombre}</h4>
        <p>${l.desc}</p>
      </div>
    </article>`
  ).join("");

  $("#selRegimen").addEventListener("change", calcularLibros);
  $("#inpIngresos").addEventListener("input", calcularLibros);
  calcularLibros();
}

function calcularLibros() {
  const regimen = $("#selRegimen").value;
  const ingresos = Number($("#inpIngresos").value) || 0;
  const enUIT = ingresos / UIT;
  const caja = $("#resultadoLibros");
  let libros = [];
  let aviso = "";

  if (regimen === "nrus") {
    caja.innerHTML = `<b>No estás obligado a llevar libros contables.</b>`;
    if (ingresos > 96000) aviso = "El Nuevo RUS tiene un límite de ingresos de S/ 96,000 al año.";
  } else if (regimen === "rer") {
    libros = ["Registro de Ventas e Ingresos", "Registro de Compras"];
    if (ingresos > 525000) aviso = "El RER tiene un límite de ingresos de S/ 525,000 al año.";
  } else if (enUIT <= 300) {
    libros = ["Registro de Ventas e Ingresos", "Registro de Compras", "Libro Diario de formato simplificado"];
  } else if (enUIT <= 500) {
    libros = ["Registro de Ventas e Ingresos", "Registro de Compras", "Libro Diario", "Libro Mayor"];
  } else if (enUIT <= 1700) {
    libros = ["Registro de Ventas e Ingresos", "Registro de Compras", "Libro Diario", "Libro Mayor", "Libro de Inventarios y Balances"];
  } else {
    libros = ["Contabilidad completa: Registro de Ventas, Registro de Compras, Libro Diario, Libro Mayor, Libro de Inventarios y Balances, Libro Caja y Bancos, Registro de Activos Fijos, Registro de Inventario Permanente y demás que correspondan"];
  }

  if (libros.length) {
    caja.innerHTML = `
      <b>Ingresos: ${formatoSoles(ingresos)} (${enUIT.toFixed(1)} UIT)</b>
      <ul>${libros.map((l) => `<li>${l}</li>`).join("")}</ul>`;
  }
  if (aviso) caja.innerHTML += `<p class="aviso">Atención: ${aviso}</p>`;
}

let consejoActual = 0;
let temporizadorConsejo = null;

function iniciarConsejos() {
  $("#consejoPuntos").innerHTML = CONSEJOS.map(() => "<span></span>").join("");
  $("#consejoAnterior").addEventListener("click", () => cambiarConsejo(-1));
  $("#consejoSiguiente").addEventListener("click", () => cambiarConsejo(1));
  mostrarConsejo();
}

function cambiarConsejo(paso) {
  consejoActual = (consejoActual + paso + CONSEJOS.length) % CONSEJOS.length;
  mostrarConsejo();
}

function mostrarConsejo() {
  const c = CONSEJOS[consejoActual];
  $("#consejoTexto").textContent = c.texto;
  $("#consejoAutor").textContent = "— " + c.autor;
  $$("#consejoPuntos span").forEach((p, i) => p.classList.toggle("activo", i === consejoActual));
  clearTimeout(temporizadorConsejo);
  temporizadorConsejo = setTimeout(() => cambiarConsejo(1), 7000);
}

function iniciarCalculadora() {
  ["#calcActivo", "#calcPasivo", "#calcPatrimonio"].forEach((id) =>
    $(id).addEventListener("input", calcularEcuacion)
  );
}

function calcularEcuacion() {
  const leer = (id) => ($(id).value === "" ? null : Number($(id).value));
  const A = leer("#calcActivo");
  const P = leer("#calcPasivo");
  const PT = leer("#calcPatrimonio");
  const r = $("#calcResultado");
  r.className = "resultado";

  const llenos = [A, P, PT].filter((v) => v !== null).length;

  if (llenos < 2) {
    r.textContent = "Completa dos campos.";
  } else if (llenos === 3) {
    const cuadra = Math.abs(A - (P + PT)) < 0.01;
    r.classList.add(cuadra ? "resultado--ok" : "resultado--error");
    r.textContent = cuadra
      ? "Correcto: la ecuación cuadra. Activo = Pasivo + Patrimonio."
      : `No cuadra: hay una diferencia de ${formatoSoles(A - (P + PT))}.`;
  } else if (A === null) {
    r.textContent = `Activo = ${formatoSoles(P + PT)}`;
  } else if (P === null) {
    r.textContent = `Pasivo = ${formatoSoles(A - PT)}`;
  } else {
    r.textContent = `Patrimonio = ${formatoSoles(A - P)}`;
  }
}

let preguntaActual = null;
let aciertos = 0;
let intentos = 0;

function iniciarQuiz() {
  $$("#quiz [data-respuesta]").forEach((btn) =>
    btn.addEventListener("click", () => responder(btn.dataset.respuesta))
  );
  nuevaPregunta();
}

function nuevaPregunta() {
  const opciones = CUENTAS.filter((c) => c.naturaleza !== "saldo" && Number(c.cod) >= 10);
  preguntaActual = opciones[Math.floor(Math.random() * opciones.length)];
  $("#quizCuenta").textContent = `${preguntaActual.cod} · ${preguntaActual.nombre}`;
}

function responder(respuesta) {
  intentos++;
  const r = $("#quizResultado");
  const correcta = respuesta === preguntaActual.naturaleza;
  if (correcta) aciertos++;

  const lado = preguntaActual.naturaleza === "deudora" ? "Debe" : "Haber";
  r.className = "resultado " + (correcta ? "resultado--ok" : "resultado--error");
  r.textContent = correcta
    ? `Correcto. Es de naturaleza ${preguntaActual.naturaleza}.`
    : `Incorrecto. La cuenta ${preguntaActual.cod} es de naturaleza ${preguntaActual.naturaleza}: aumenta por el ${lado}.`;

  $("#quizPuntaje").textContent = `${aciertos} / ${intentos}`;
  setTimeout(nuevaPregunta, 1400);
}