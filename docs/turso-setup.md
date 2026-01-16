# Turso / sqld Setup Guide

Kaban uses libsql, which is compatible with both local SQLite files and Turso (managed libsql service) or self-hosted sqld.

## Option 1: Local SQLite (Default)

No setup required. Kaban creates a local SQLite database at `.kaban/kaban.db`.

```bash
kaban init
```

## Option 2: Turso Cloud (Managed)

### Prerequisites

1. Install Turso CLI:
   ```bash
   # macOS
   brew install tursodatabase/tap/turso
   
   # Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Sign up and authenticate:
   ```bash
   turso auth signup  # or turso auth login
   ```

### Create Database

```bash
turso db create kaban
turso db show kaban --url
turso db tokens create kaban
```

### Configure Kaban

Set environment variables:

```bash
export KABAN_DB_URL="libsql://your-db-name-your-org.turso.io"
export KABAN_DB_AUTH_TOKEN="your-token-here"
```

Or create `.kaban/config.json`:

```json
{
  "database": {
    "url": "libsql://your-db-name-your-org.turso.io",
    "authToken": "your-token-here"
  }
}
```

## Option 3: Self-Hosted sqld

sqld is the open-source server mode for libsql.

### Using Docker

```bash
docker run -d \
  --name sqld \
  -p 8080:8080 \
  -v sqld-data:/var/lib/sqld \
  ghcr.io/libsql/sqld:latest
```

### Using Binary

```bash
# Install sqld
curl -sSfL https://github.com/libsql/sqld/releases/latest/download/sqld-x86_64-unknown-linux-gnu.tar.gz | tar xz
sudo mv sqld /usr/local/bin/

# Run with data directory
sqld --db-path /var/lib/sqld/kaban.db --http-listen-addr 0.0.0.0:8080
```

### Configure Kaban

```bash
export KABAN_DB_URL="http://localhost:8080"
```

Or with authentication (if configured):

```bash
export KABAN_DB_URL="http://localhost:8080"
export KABAN_DB_AUTH_TOKEN="your-auth-token"
```

## Connection String Formats

| Type | Format |
|------|--------|
| Local file | `file:./path/to/db.db` |
| Turso Cloud | `libsql://db-name-org.turso.io` |
| sqld HTTP | `http://localhost:8080` |
| sqld HTTPS | `https://sqld.example.com` |
| sqld with auth | URL + `authToken` in config |

## Sync Mode (Embedded Replica)

For offline-capable applications, you can use an embedded replica that syncs with a remote database:

```json
{
  "database": {
    "url": "libsql://your-db.turso.io",
    "authToken": "your-token",
    "syncUrl": "file:.kaban/local-replica.db"
  }
}
```

This creates a local replica that syncs with Turso, enabling offline access.

## Troubleshooting

### Connection Refused

Ensure sqld is running and the port is accessible:

```bash
curl http://localhost:8080/health
```

### Authentication Failed

Verify your auth token is correct and not expired:

```bash
turso db tokens create kaban --expiration none  # Never expires
```

### Database Not Found

Create the database first:

```bash
turso db create kaban
```

### Permission Denied (Local)

Ensure the `.kaban` directory is writable:

```bash
chmod 755 .kaban
chmod 644 .kaban/kaban.db
```
