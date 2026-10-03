# Performance testing

Tooling, commands, thresholds and interpretation are in [tests/performance/README.md](../../tests/performance/README.md).
Latest measured numbers are in [TEST_RESULTS.md](TEST_RESULTS.md). Key caveats:

* Local machine, Docker-run k6 via `host.docker.internal`; SRS figures describe the reference deployment.
* Upload figures use a fake AI, so they exclude inference. Inference was measured separately against the real
  models on CPU: average 3.0 s but maximum 12.7 s, close to the 15 s limit; the first request pays a warm-up cost.
* Concurrent scans were run at 10 only. Run `SCAN_CONCURRENCY=20|50` on suitable hardware before quoting them.
* Capacity was seeded with SQL (`generate_series`) at 100 businesses / 500 users / 50 000 scans / 500 000 detections and
  the dashboard, inventory and 50-VU read tests were re-run at that size.
* Memory: API idle RSS max 88.8 MB (limit 512 MB); AI service observed about 1 GB after model load (no SRS limit).
  Growth after one load was +38 MB mean; a proper leak check needs repeated runs (not done).
* Not measured: CPU utilisation, deployed-environment latency, throughput beyond 50 readers.
