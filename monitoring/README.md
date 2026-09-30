# SnapStock local monitoring (Grafana + Prometheus on your PC)

Grafana, Prometheus and Blackbox run **only on your machine**. Production stays thin (`/health`, `/metrics`). The PEM is for an optional **SSH tunnel** to the EC2 host (e.g. node_exporter), not for hosting Grafana on AWS.

## Quick start

```bash
# 1) Start the stack
cd monitoring
cp .env.example .env          # edit if needed
docker compose up -d

# 2) Open UIs
# Grafana:    http://localhost:3001  (admin / admin by default)
# Prometheus: http://localhost:9090
```

Dashboard **SnapStock overview** is provisioned automatically.

## What gets scraped

| Job | Needs PEM? | Target |
|-----|------------|--------|
| `snapstock-health-prod` | No | Blackbox probe of public `…/health` |
| `snapstock-api-prod` | No | Public `https://snapstock.rashmika.dev/snapstock-backend-http/metrics` (after deploy with `/metrics`) |
| `snapstock-api-local` | No | `host.docker.internal:5000/metrics` when API runs locally |
| `ec2-node-via-tunnel` | **Yes** | `localhost:9100` via `./tunnel.sh` → EC2 `node_exporter` |

## SSH tunnel (PEM)

```bash
# Repo root must contain snapstock-k3s-key.pem (gitignored)
cd monitoring
chmod +x tunnel.sh
./tunnel.sh
```

Defaults: `ubuntu@15.252.170.236`, forward remote `9100` → local `9100`. Override in `monitoring/.env`.

### One-time: node_exporter on the EC2 host

SSH in (same PEM), then:

```bash
# example — pick a current release from prometheus/node_exporter
curl -sLO https://github.com/prometheus/node_exporter/releases/download/v1.8.2/node_exporter-1.8.2.linux-amd64.tar.gz
tar xzf node_exporter-1.8.2.linux-amd64.tar.gz
sudo mv node_exporter-1.8.2.linux-amd64/node_exporter /usr/local/bin/
# listen on localhost only (scraped via SSH tunnel, not public internet)
sudo tee /etc/systemd/system/node_exporter.service >/dev/null <<'EOF'
[Unit]
Description=Node Exporter
After=network.target
[Service]
ExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100
Restart=always
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

If SSH port 22 is closed, use AWS SSM instead of this tunnel, or rely on the public health/metrics scrapes only.

## Protect `/metrics` (recommended after first deploy)

In the API `.env` / deploy secrets:

```bash
METRICS_TOKEN=long-random-string
```

Put the **same** string in `monitoring/prometheus/metrics_token` (copy from `metrics_token.example`), mount it in `docker-compose.yml` if you enable `authorization.credentials_file`, then restart Prometheus.

## Optional: CloudWatch (EC2 CPU/disk without PEM)

1. Create an IAM user (or use keys) with CloudWatch read (`cloudwatch:GetMetricData`, `cloudwatch:ListMetrics`, `ec2:DescribeTags`, …).
2. Set in `monitoring/.env`:

```bash
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

3. Restart Grafana: `docker compose up -d grafana`
4. In Grafana → **Connections → CloudWatch** (provisioned). Explore EC2 CPUUtilization for your instance.

CloudWatch is independent of the PEM tunnel; use both if you want app metrics + AWS host metrics.

## Stop

```bash
cd monitoring
docker compose down
# Ctrl+C the tunnel terminal
```

## Security notes

- Never commit `snapstock-k3s-key.pem`, `monitoring/.env`, or a real `metrics_token`.
- Do not expose Grafana or Prometheus ports on the EC2 security group.
- Prefer `node_exporter` bound to `127.0.0.1` and reached only via SSH.
