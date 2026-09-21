# Scan Pipeline Diagram Samples

Two versions of **Figure 11 — Scan Processing Activity Diagram** for comparison.

| Sample | File | How to preview |
|--------|------|----------------|
| **HTML (recommended for report)** | [scan-pipeline-activity.html](./scan-pipeline-activity.html) | Open in browser (double-click or Live Server) |
| **Mermaid** | [scan-pipeline-activity-mermaid.html](./scan-pipeline-activity-mermaid.html) | Open in browser (needs internet for Mermaid CDN) |
| **Mermaid source only** | [scan-pipeline-activity.mmd](./scan-pipeline-activity.mmd) | Paste into [mermaid.live](https://mermaid.live) |

## Style match (reference image)

Both samples follow the swimlane layout:

- **Vendor User** — Start → Open Scan Page → Capture/Upload → Display Results → End
- **System (Backend)** — Validate → Store (Temp) → Send for Analysis → Save Results → Return
- **AI Service** — Receive → YOLOv8 detect → MobileNet classify → Return results
- **Database / Storage** — Image Storage + PostgreSQL cylinders

- Solid arrows = sequential flow within a lane  
- Dashed arrows = cross-component communication  
- Grey lane headers, blue title, rounded activity boxes  

## Which to use?

| Criterion | HTML | Mermaid |
|-----------|------|---------|
| Matches reference image | **Best** | Good |
| Easy to edit in docs/Git | Moderate | **Best** |
| Export to PNG/PDF | Print from browser | mermaid.live export |
| Maintenance in SAD markdown | Embed HTML or screenshot | Embed ` ```mermaid ` block |

**Recommendation:** Use **HTML** for final report figures (print/screenshot). Use **Mermaid** if you want the diagram editable as text inside markdown.
