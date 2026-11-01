# biblioteca-prestamos

Microservicio de préstamos del proyecto guía de DSY1107, **tal como queda al terminar L8**: el antiguo
`prestamos.mjs` migrado a NestJS 12, con el mismo contrato HTTP. Puerto **3002**. Es el dueño del esquema
`prestamos` de Postgres y el que publica `prestamo.creado` y `prestamo.devuelto` en RabbitMQ, **después** de
escribir.

## El contrato HTTP

Lo consumen el gateway (`GET /prestamos`) y el BFF (la raíz y `/:id`). Cada petición paga 300 ms de latencia
simulada, también las que terminan en 401 o 405. Los errores traen `{ "mensaje": "..." }`.

| Método y ruta | Código | Qué hace |
|---|---|---|
| `GET /` o `GET /prestamos` | 200 | Lista de préstamos. No pide token |
| | 503 | Postgres no responde |
| `POST /` o `POST /prestamos` | 201 | Crea un préstamo del `sub` del token y publica `prestamo.creado` |
| | 400 | Cuerpo inválido (DTO) o dato que Postgres rechaza |
| | 401 | Sin token válido |
| | 409 | Ya tiene un préstamo vigente de ese libro |
| | 503 | Postgres no responde |
| `DELETE /:id` o `DELETE /prestamos/:id` | 200 | Marca devuelto y publica `prestamo.devuelto` |
| | 401 / 404 / 503 | Sin token válido / no existe / Postgres no responde |
| cualquier otro método | 405 | `metodo X no soportado` |

Cuerpo del `POST`: `{ "libroId": 3, "desde": "2026-11-02", "hasta": "2026-11-16" }`. `ValidationPipe` con
`whitelist` y `forbidNonWhitelisted` rechaza lo que no esté en `src/prestamos/dto/crear-prestamo.dto.ts`. El BFF
también manda `usuarioSub` y `devuelto`; el DTO los acepta y los ignora: el dueño sale del token.

## Qué hay en cada archivo

| Archivo | Qué es |
|---|---|
| `src/main.ts` | Arranque: latencia simulada, `ValidationPipe`, filtro de errores y cierre ordenado |
| `src/auth/jwt.guard.ts` | `jose` y JWKS en `COGNITO_ISSUER`: firma, `iss` y `exp`. Deja el `sub` en la petición |
| `src/prestamos/` | Controlador, DTO y repositorio `pg` (todo el SQL). Aplica `esquema.sql` al arrancar |
| `src/mensajeria/` | Publicador `amqplib`: exchange `biblioteca.eventos`, headers `x-evento-id` y `x-emitido-en` |
| `esquema.sql` | El esquema `prestamos`, con la regla de un préstamo vigente por lector y libro |
| `Dockerfile` | Dos etapas sobre `node:24-alpine`: compila y deja solo lo de producción |

## Cómo usarlo

Necesitas **Node 24.15.0 o superior**, Postgres y RabbitMQ (los de `biblioteca-plataforma`). Forkea
`biblioteca-prestamos-l9` y clónalo **sin el sufijo**, junto a los otros siete. Los mismos comandos sirven en
Windows (PowerShell), macOS y Linux:

```bash
cd $HOME/DSY1107/l9
git clone https://github.com/TU_USUARIO/biblioteca-prestamos-l9.git biblioteca-prestamos
cd biblioteca-prestamos
npm install
```

Copia `.env.example` a `.env` (Windows: `Copy-Item .env.example .env`; macOS y Linux: `cp .env.example .env`) y
rellena los nombres que trae, sin valores. Después, con Postgres y RabbitMQ arriba:

```bash
npm run start:dev
```

`npm run build` compila y `npm test` corre las pruebas del DTO. Con todo el sistema, desde
`biblioteca-plataforma`: `docker compose up -d --build --wait`; el compose le pone `POSTGRES_HOST`,
`POSTGRES_PORT` y `RABBITMQ_URL` hacia los contenedores.
