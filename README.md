# retroactive-compensation-cf-worker

An API for a retroactive compensation system, built with [Cloudflare
Workers](https://workers.cloudflare.com/) and [Cloudflare
D1](https://developers.cloudflare.com/d1/).

Used template for [Cosmos wallet
authentication](https://github.com/NoahSaso/cloudflare-worker-cosmos-auth) to
authenticate requests via a [Cosmos](https://cosmos.network) wallet signature.

## Development

### Run locally

```sh
npm run dev
# OR
wrangler dev --local --persist
```

### Configuration

Create KV namespaces for production and development:

```sh
wrangler kv:namespace create NONCES
wrangler kv:namespace create NONCES --preview
```

Add the binding to `wrangler.toml`:

```toml
kv-namespaces = [
  { binding = "NONCES", id = "NONCE_ID", preview_id = "NONCE_PREVIEW_ID" }
]
```

Create D1 database for production:

```sh
wrangler d1 create DB
```

Add the binding to `wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "DB"
database_id = "DB_ID"
```

Seed the database with:

```sh
wrangler d1 execute DB --file=./schema.sql
```

Seed the local database with:

```sh
npm run reset-local-db
# OR
wrangler d1 execute DB --file=./schema.sql --local
```

## Deploy

```sh
wrangler publish
# OR
npm run deploy
```
