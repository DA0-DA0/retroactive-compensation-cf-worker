# retroactive-compensation-cf-worker

An API for a retroactive compensation system, built with [Cloudflare
Workers](https://workers.cloudflare.com/) and [Cloudflare
D1](https://developers.cloudflare.com/d1/).

Used template for [Cosmos wallet
authentication](https://github.com/NoahSaso/cloudflare-worker-cosmos-auth) to
authenticate requests via a [Cosmos](https://cosmos.network) wallet signature.

Read through the design spec [here](./DESIGN.md).

## Development

### Run locally

```sh
npm run dev
# OR
wrangler dev --local --persist
```

### Configuration

1. Copy `wrangler.toml.example` to `wrangler.toml`.

2. Create KV namespaces for production and development:

```sh
wrangler kv:namespace create NONCES
wrangler kv:namespace create NONCES --preview
```

3. Update the binding IDs in `wrangler.toml`:

```toml
kv-namespaces = [
  { binding = "NONCES", id = "<INSERT NONCES_ID>", preview_id = "<INSERT NONCES_PREVIEW_ID>" }
]
```

4. Create D1 database for production:

```sh
wrangler d1 create DB
```

5. Update the binding ID in `wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "DB"
database_id = "<INSERT DB_ID>"
```

6. Seed the database with:

```sh
npm run seed
# OR
wrangler d1 execute DB --file=./schema.sql
```

7. Seed the local database with:

```sh
npm run seed:local
# OR
wrangler d1 execute DB --file=./schema.sql --local
```

## Deploy

```sh
wrangler publish
# OR
npm run deploy
```
