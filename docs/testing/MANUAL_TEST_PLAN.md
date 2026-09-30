# Manual test plan

**No manual test in this file has been performed.** Every "Actual result", "PASS/FAIL", "Tester", "Date" and "Evidence"
cell is intentionally empty; fill them in when the test is executed, and attach evidence (screenshot, recording,
log). Do not mark a test passed unless it was done.

| ID | Requirement | Steps | Expected result | Actual result | PASS/FAIL | Tester | Date | Evidence |
|----|-------------|-------|-----------------|---------------|-----------|--------|------|----------|
| M-01 | FR-SCAN-001 real camera | On an Android and an iOS phone open the scan page, choose a shelf, tap Open Camera, grant permission, capture | Live preview, capture works, preview shown, back camera used by default | | | | | |
| M-02 | NFR-USE-002 <= 3 interactions | From the dashboard count taps to submit a camera scan | <= 3 interactions to submission | | | | | |
| M-03 | NFR-USE-003 real device | Use login, dashboard, scan, inventory on 360 px phone and a 1024+ px desktop | no clipped/overlapping content, controls reachable with a thumb | | | | | |
| M-04 | Browser compatibility | Repeat core journeys in current Chrome, Firefox, Safari, Edge | same behaviour, no console errors | | | | | |
| M-05 | Poor lighting / blur / angles | Scan the same shelf in dim light, motion blur, 45 degree angle, partial occlusion | detections degrade gracefully; low-confidence items flagged; no crash | | | | | |
| M-06 | Slow network | Throttle to slow 3G during upload | progress shown, understandable error on timeout, retry works | | | | | |
| M-07 | NFR-USE-004 colour semantics | Review Fresh/Medium/Spoiled indicators | Fresh green, Medium yellow, Spoiled red, and each also has a text label/icon | | | | | |
| M-08 | NFR-USE-006 assistive tech | Navigate login, scan, inventory with NVDA/VoiceOver and keyboard only | every control announced with a name; focus order logical; focus visible | | | | | |
| M-09 | NFR-USE-005 irreversible actions | Delete a shelf, delete the business, remove an employee | confirmation is requested before each | | | | | |
| M-10 | NFR-USE-001 first scan <= 5 min | A new vendor who has never seen the app registers and completes a first scan (timed) | first successful scan within 5 minutes | | | | | |
| M-11 | Visual consistency | Compare spacing, typography, dark/light themes across pages | consistent per design | | | | | |
| M-12 | FR-HEALTH-002 real outage | Stop the real AI container while using the app | banner/message, auth/inventory/alerts/settings still usable, recovery after restart | | | | | |
| M-13 | Real-world AI behaviour | Scan 20 real shelf photos, compare counts with hand counts | count error and freshness agreement recorded (input to NFR-REL-004) | | | | | |
| M-14 | NFR-REL-001 availability | Monitor the demo deployment through the demo hours | >= 99 % uptime | | | | | |
| M-15 | NFR-REL-002 recovery | Kill the API container, time to healthy; restart AI, time to model ready | <= 15 min; model reload <= 5 min | | | | | |
| M-16 | NFR-SEC-001 HTTPS | Open the deployed site over http:// and https:// | HTTPS enforced, valid certificate, no mixed content, CORS limited to the client origin | | | | | |
| M-17 | Backups | Confirm daily backup exists; restore the latest into a scratch database | backup present; restore succeeds and row counts match | | | | | |
| M-18 | Email delivery | Register with a real mailbox on the deployment | verification and reset emails arrive, links work, expire after 1 h | | | | | |
| M-19 | Admin (when implemented) | Log in as admin, view vendors, platform stats, health | FR-ADMIN-001..003 behave as specified | | | | | |
