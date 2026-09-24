"""Object detection evaluation (SRS NFR-REL-004: mAP@0.5 >= 0.70 on the reserved validation set).

    cd ai-service
    venv/Scripts/python -m evaluation.evaluate_detection --data path/to/dataset.yaml [--split val]

Needs a YOLO-format dataset (data.yaml + labelled images) that was NOT used for training. The repository contains
no such labelled detection set, so without --data the result is NOT RUN / DATASET REQUIRED. No number is invented.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from evaluation.metrics import DETECTION_MAP50_TARGET, verdict

REPORT_DIR = Path(__file__).resolve().parent / "reports"


def write_report(report: dict) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (REPORT_DIR / "detection.json").write_text(json.dumps(report, indent=2, default=str))
    print(json.dumps(report, indent=2, default=str))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", help="YOLO dataset yaml with a reserved validation split")
    parser.add_argument("--split", default="val")
    args = parser.parse_args()

    report: dict = {
        "metric": "detection mAP@0.5",
        "srs_target": DETECTION_MAP50_TARGET,
        "date": datetime.now(timezone.utc).isoformat(),
    }

    if not args.data or not Path(args.data).is_file():
        report.update(
            status="NOT RUN",
            reason="DATASET REQUIRED: pass --data <dataset.yaml> pointing at a labelled validation split that was not used for training.",
        )
        write_report(report)
        return 0

    try:
        from ultralytics import YOLO

        from app.config import DETECTION_MODEL_NAME, DETECTION_MODEL_PATH, YOLO_IMAGE_SIZE, YOLO_IOU_THRESHOLD

        if not DETECTION_MODEL_PATH.is_file():
            raise FileNotFoundError(DETECTION_MODEL_PATH)
        model = YOLO(str(DETECTION_MODEL_PATH))
        metrics = model.val(data=args.data, split=args.split, imgsz=YOLO_IMAGE_SIZE, iou=YOLO_IOU_THRESHOLD, verbose=False)
    except Exception as error:
        report.update(status="NOT RUN", reason=f"Evaluation could not run: {error}")
        write_report(report)
        return 0

    map50 = float(metrics.box.map50)
    report.update(
        status=verdict(map50, DETECTION_MAP50_TARGET, comparable_to_srs=True),
        model={"name": DETECTION_MODEL_NAME, "path": str(DETECTION_MODEL_PATH)},
        dataset={"yaml": args.data, "split": args.split},
        map50=map50,
        map50_95=float(metrics.box.map),
        per_class_ap50={str(model.names[int(c)]): float(v) for c, v in zip(metrics.box.ap_class_index, metrics.box.ap50)},
        classes=len(model.names),
    )
    write_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
