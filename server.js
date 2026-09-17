// Servidor de "Bebidas de los Traketeros".
// Sirve la web (index.html) y guarda el carrito compartido.
//
// Dónde guarda los datos:
//   - Si existe la variable de entorno DATABASE_URL  -> Postgres (recomendado en Render).
//   - Si no                                          -> fichero JSON en DATA_DIR (por defecto ./datos).
//
// Arrancar en local:  npm install && npm start   ->  http://localhost:3000

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "datos");
const DB_URL = process.env.DATABASE_URL || "";

app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

/* ---------------------------------------------------------------
   ALMACÉN A: fichero JSON (local, o Render con disco persistente)
   --------------------------------------------------------------- */
function almacenJSON() {
  const file = path.join(DATA_DIR, "traketeros.json");
  fs.mkdirSync(DATA_DIR, { recursive: true });

  function leer() {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return { items: [], precios: {}, productos: [] };
    }
  }
  function escribir(d) {
    fs.writeFileSync(file, JSON.stringify(d, null, 2));
    return d;
  }

  return {
    async estado() {
      return leer();
    },
    async guardarItem(it) {
      const d = leer();
      const i = d.items.findIndex((x) => String(x.id) === String(it.id));
      if (i >= 0) d.items[i] = it;
      else d.items.push(it);
      return escribir(d);
    },
    async borrarItem(id) {
      const d = leer();
      d.items = d.items.filter((x) => String(x.id) !== String(id));
      return escribir(d);
    },
    async vaciar() {
      const d = leer();
      d.items = [];
      return escribir(d);
    },
    async guardarPrecio(clave, precio) {
      const d = leer();
      d.precios[clave] = precio;
      return escribir(d);
    },
    async guardarProducto(p) {
      const d = leer();
      const i = d.productos.findIndex((x) => String(x.id) === String(p.id));
      if (i >= 0) d.productos[i] = p;
      else d.productos.push(p);
      return escribir(d);
    },
  };
}

/* ---------------------------------------------------------------
   ALMACÉN B: Postgres (Render, Neon, Supabase...)
   --------------------------------------------------------------- */
function almacenPostgres() {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: DB_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const listo = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS items (
      id text PRIMARY KEY, pid text, nombre text, formato text, super text,
      precio numeric, qty integer, quien text, ts bigint)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS precios (
      clave text PRIMARY KEY, precio numeric, quien text, ts bigint)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS productos (
      id text PRIMARY KEY, n text, f text, c text, p jsonb, quien text, ts bigint)`);
  })();

  async function estado() {
    await listo;
    const items = (await pool.query("SELECT * FROM items ORDER BY ts")).rows.map((r) => ({
      id: r.id, pid: r.pid, nombre: r.nombre, formato: r.formato, super: r.super,
      precio: Number(r.precio), qty: Number(r.qty), quien: r.quien, ts: Number(r.ts),
    }));
    const precios = {};
    (await pool.query("SELECT clave, precio FROM precios")).rows.forEach((r) => {
      precios[r.clave] = Number(r.precio);
    });
    const productos = (await pool.query("SELECT * FROM productos")).rows.map((r) => ({
      id: r.id, n: r.n, f: r.f, c: r.c, p: r.p,
    }));
    return { items, precios, productos };
  }

  return {
    estado,
    async guardarItem(it) {
      await listo;
      await pool.query(
        `INSERT INTO items (id,pid,nombre,formato,super,precio,qty,quien,ts)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET precio=$6, qty=$7`,
        [it.id, it.pid, it.nombre, it.formato, it.super, it.precio, it.qty, it.quien, it.ts]
      );
      return estado();
    },
    async borrarItem(id) {
      await listo;
      await pool.query("DELETE FROM items WHERE id=$1", [String(id)]);
      return estado();
    },
    async vaciar() {
      await listo;
      await pool.query("DELETE FROM items");
      return estado();
    },
    async guardarPrecio(clave, precio) {
      await listo;
      await pool.query(
        `INSERT INTO precios (clave,precio,quien,ts) VALUES ($1,$2,$3,$4)
         ON CONFLICT (clave) DO UPDATE SET precio=$2, quien=$3, ts=$4`,
        [clave, precio, "", Date.now()]
      );
      return estado();
    },
    async guardarProducto(p) {
      await listo;
      await pool.query(
        `INSERT INTO productos (id,n,f,c,p,quien,ts) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET n=$2, f=$3, c=$4, p=$5`,
        [p.id, p.n, p.f, p.c, JSON.stringify(p.p || []), "", Date.now()]
      );
      return estado();
    },
  };
}

const store = DB_URL ? almacenPostgres() : almacenJSON();
console.log(DB_URL ? "Guardando en Postgres" : "Guardando en fichero JSON: " + DATA_DIR);

/* ---------------------------------------------------------------
   API
   --------------------------------------------------------------- */
function texto(v, max) {
  return String(v == null ? "" : v).slice(0, max || 80);
}
function num(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

app.get("/api/state", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store").json(await store.estado());
  } catch (e) {
    res.status(500).json({ error: "no se ha podido leer" });
  }
});

app.post("/api/items", async (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.nombre) return res.status(400).json({ error: "faltan datos" });
  const it = {
    id: texto(b.id, 40),
    pid: texto(b.pid, 40),
    nombre: texto(b.nombre, 80),
    formato: texto(b.formato, 30),
    super: texto(b.super, 40),
    precio: Math.max(0, Math.min(9999, num(b.precio))),
    qty: Math.max(1, Math.min(999, Math.round(num(b.qty) || 1))),
    quien: texto(b.quien, 24) || "anónimo",
    ts: Math.round(num(b.ts)) || Date.now(),
  };
  try {
    res.json(await store.guardarItem(it));
  } catch (e) {
    res.status(500).json({ error: "no se ha podido guardar" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    res.json(await store.borrarItem(req.params.id));
  } catch (e) {
    res.status(500).json({ error: "no se ha podido borrar" });
  }
});

app.delete("/api/items", async (req, res) => {
  try {
    res.json(await store.vaciar());
  } catch (e) {
    res.status(500).json({ error: "no se ha podido vaciar" });
  }
});

app.post("/api/precios", async (req, res) => {
  const b = req.body || {};
  if (!b.clave) return res.status(400).json({ error: "falta la clave" });
  const precio = num(b.precio) < 0 ? -1 : Math.min(9999, num(b.precio));
  try {
    res.json(await store.guardarPrecio(texto(b.clave, 90), precio));
  } catch (e) {
    res.status(500).json({ error: "no se ha podido guardar" });
  }
});

app.post("/api/productos", async (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.n) return res.status(400).json({ error: "faltan datos" });
  const p = {
    id: texto(b.id, 40),
    n: texto(b.n, 80),
    f: texto(b.f, 30),
    c: texto(b.c, 30),
    p: Array.isArray(b.p) ? b.p.slice(0, 20).map((v) => (v == null ? null : num(v))) : [],
  };
  try {
    res.json(await store.guardarProducto(p));
  } catch (e) {
    res.status(500).json({ error: "no se ha podido guardar" });
  }
});

app.listen(PORT, () => console.log("Traketeros en marcha: http://localhost:" + PORT));
