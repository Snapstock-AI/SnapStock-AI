// Stand-ins for the two external dependencies of the API, so E2E runs need neither
// the YOLO/TensorFlow models nor a real mail server.
//
//   Fake AI service  :AI_PORT    POST /analyze  -> canned detections (or 503 when switched off)
//                                POST /__mode   {"mode":"up"|"down"|"slow"}  control endpoint
//   Capturing SMTP   :SMTP_PORT  stores every message; read them via GET :AI_PORT/__mail?to=
import http from "node:http";
import { SMTPServer } from "smtp-server";

const AI_PORT = Number(process.env.AI_PORT || 8899);
const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);

let mode = "up";
const mails = [];

const analysisResponse = {
  image_width: 640,
  image_height: 480,
  total_count: 3,
  counts: { apple: { fresh: 2, rotten: 1, total: 3 } },
  detections: [
    { class_name: "apple", confidence: 0.95, bounding_box: { x1: 10, y1: 20, x2: 100, y2: 200 }, freshness: "good", freshness_confidence: 0.91, freshness_confidence_percent: 91, explanation: null },
    { class_name: "apple", confidence: 0.9, bounding_box: { x1: 120, y1: 30, x2: 200, y2: 220 }, freshness: "good", freshness_confidence: 0.85, freshness_confidence_percent: 85, explanation: null },
    { class_name: "apple", confidence: 0.88, bounding_box: { x1: 220, y1: 40, x2: 300, y2: 240 }, freshness: "bad", freshness_confidence: 0.8, freshness_confidence_percent: 80, explanation: null },
  ],
};

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "POST" && url.pathname === "/__mode") {
      mode = JSON.parse((await readBody(req)).toString()).mode;
      return send(200, { mode });
    }
    if (req.method === "GET" && url.pathname === "/__mail") {
      const to = (url.searchParams.get("to") || "").toLowerCase();
      return send(200, mails.filter((m) => !to || m.to.includes(to)));
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return send(200, { status: "running", mode });
    }
    if (req.method === "POST" && url.pathname === "/analyze") {
      await readBody(req);
      if (mode === "down") return send(503, { detail: "AI models are not loaded yet." });
      if (mode === "slow") await new Promise((r) => setTimeout(r, 1500));
      return send(200, analysisResponse);
    }
    send(404, { detail: "not found" });
  })
  .listen(AI_PORT, () => console.log(`fake AI listening on ${AI_PORT}`));

new SMTPServer({
  authOptional: true,
  allowInsecureAuth: true,
  disabledCommands: ["STARTTLS"],
  onAuth: (_auth, _session, callback) => callback(null, { user: "e2e" }),
  onData(stream, session, callback) {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => {
      mails.push({
        to: session.envelope.rcptTo.map((r) => r.address.toLowerCase()).join(","),
        raw: Buffer.concat(chunks).toString("utf8"),
      });
      callback();
    });
  },
}).listen(SMTP_PORT, () => console.log(`capturing SMTP listening on ${SMTP_PORT}`));
