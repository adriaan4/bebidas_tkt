# 🍹 Bebidas de los Traketeros

Buscador de bebidas por supermercado + carrito compartido para la peña.
Cada uno entra con su nombre, busca la bebida, ve en qué súper está más barata
y la mete al carrito común. Todos ven lo mismo en tiempo real y cualquiera
puede quitar lo que no interese.

## Qué hay en el repo

| Archivo | Qué es |
|---|---|
| `index.html` | La web entera (diseño, catálogo de bebidas, carrito). Es el archivo que vas a tocar tú. |
| `server.js` | El servidor: sirve la web y guarda el carrito compartido. |
| `package.json` | Dependencias (express y pg). |
| `render.yaml` | Configuración lista para Render. |

---

## 1. Subirlo a GitHub

Con la web de GitHub, sin tocar la terminal:

1. Entra en <https://github.com/new>, nombre `traketeros`, público o privado, **Create repository**.
2. En el repo vacío: **uploading an existing file**.
3. Arrastra `index.html`, `server.js`, `package.json`, `render.yaml` y `.gitignore`.
4. **Commit changes**.

Si prefieres terminal:

```bash
cd traketeros
git init
git add .
git commit -m "Primera version de la web de los Traketeros"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/traketeros.git
git push -u origin main
```

## 2. Publicarlo en Render

1. Entra en <https://render.com> y regístrate con tu cuenta de GitHub.
2. **New → Web Service** y elige el repo `traketeros`.
3. Rellena:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. **Create Web Service**. En 2-3 minutos tendrás una URL tipo
   `https://traketeros.onrender.com` — esa es la que pasas por el grupo.

## 3. Importante: que el carrito no se borre

El plan gratis de Render tiene el disco "de usar y tirar": cada vez que el
servicio se reinicia o se vuelve a desplegar, los archivos locales se pierden,
y los servicios gratuitos se apagan solos tras 15 minutos sin visitas. Sin base
de datos, el carrito puede aparecer vacío al día siguiente.

Solución: una base de datos Postgres gratis. El servidor la usa automáticamente
si le pones la variable `DATABASE_URL`.

**Opción recomendada — Neon** (gratis y sin caducidad):

1. Crea cuenta en <https://neon.com>, crea un proyecto.
2. Copia la cadena de conexión (`postgresql://...`).
3. En Render: tu servicio → **Environment** → **Add Environment Variable**
   → clave `DATABASE_URL`, valor la cadena de conexión → **Save**.
4. Render vuelve a desplegar y listo: las tablas se crean solas.

Ojo con el Postgres gratuito **de Render**: caduca 30 días después de crearlo,
así que para algo que quieras tener todo el año usa Neon o Supabase.

Sin `DATABASE_URL` el servidor guarda en `datos/traketeros.json`, que va perfecto
para probarlo en tu ordenador.

## 4. Dominio propio

Con la URL de Render ya funciona, pero si quieres `traketeros.es` o parecido:

1. Compra el dominio (Dondominio, Namecheap, IONOS… unos 10-15 € al año).
2. En Render: tu servicio → **Settings → Custom Domains → Add Custom Domain**.
3. Render te dará un registro DNS (un `CNAME` para `www` y una `A`/`ALIAS`
   para el dominio raíz). Cópialo en el panel DNS de donde compraste el dominio.
4. En unos minutos u horas se activa, con HTTPS incluido y gratis.

## 5. Probarlo en tu ordenador antes de subir

```bash
npm install
npm start
# abre http://localhost:3000
```

## 6. Editar la web

Todo está en `index.html`, sin frameworks ni compilación: lo abres, lo cambias,
lo subes a GitHub y Render lo despliega solo.

- **Supermercados**: variable `SUPERS` (y `WEBS` con sus enlaces).
- **Catálogo y precios**: la lista `BASE`. Cada línea es una bebida y el array
  `p` lleva los precios en el mismo orden que `SUPERS`; `null` = ese súper no
  lo tiene.
- **Colores y tipografías**: bloque `:root` al principio del `<style>`.
- **Textos**: busca "Traketeros".

Los precios que vienen de fábrica son **orientativos**. Lo bueno es que no hace
falta tocar el código para corregirlos: desde la propia web, en cada bebida,
"Editar precios" los actualiza para toda la peña. Ninguna web puede leer los
precios de Mercadona o Carrefour en directo sin un acuerdo con ellos, así que
el catálogo lo mantenéis vosotros.
