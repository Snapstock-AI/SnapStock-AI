"""Freshness classifier evaluation (SRS NFR-REL-004: macro F1 >= 0.75).

    cd ai-service
    venv/Scripts/python -m evaluation.evaluate_freshness [--dataset dataset] [--limit N]

Uses the production model loader and preprocessing (app.freshness.model_loader / app.common.image_utils), the
held-out `test/` split only, and refuses to score if any test image is byte-identical to a train/val image.

HONESTY NOTE: the SRS defines three classes (Fresh / Medium / Spoiled). The dataset in the repository is
binary (good / bad). The metrics below are therefore reported as PARTIAL: real numbers for a different
(2-class) task, never PASS/FAIL against the 3-class SRS target. A labelled Fresh/Medium/Spoiled test set is required
for a definitive verdict (see docs/testing/AI_MODEL_EVALUATION.md).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from evaluation.metrics import (
    FRESHNESS_MACRO_F1_TARGET,
    confusion_matrix,
    find_leakage,
    images_in,
    macro_f1,
    per_class_report,
    verdict,
)

BASE = Path(__file__).resolve().parent.parent
REPORT_DIR = Path(__file__).resolve().parent / "reports"


def write_report(report: dict) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (REPORT_DIR / "freshness.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=str(BASE / "dataset"))
    parser.add_argument("--limit", type=int, default=0, help="evaluate at most N images per class (smoke run)")
    args = parser.parse_args()
    dataset = Path(args.dataset)

    report: dict = {
        "metric": "freshness macro F1",
        "srs_target": FRESHNESS_MACRO_F1_TARGET,
        "date": datetime.now(timezone.utc).isoformat(),
    }

    test_dir = dataset / "test"
    if not test_dir.is_dir() or not any(test_dir.iterdir()):
        report.update(status="NOT RUN", reason=f"DATASET REQUIRED: no held-out test split at {test_dir}")
        write_report(report)
        return 0

    classes = sorted(p.name for p in test_dir.iterdir() if p.is_dir())
    test_files = {c: images_in(test_dir / c) for c in classes}
    if args.limit:
        test_files = {c: f[: args.limit] for c, f in test_files.items()}
    train_files = [f for split in ("train", "val") if (dataset / split).is_dir() for f in images_in(dataset / split)]

    leaks = find_leakage([f for files in test_files.values() for f in files], train_files)
    if leaks:
        report.update(
            status="NOT RUN",
            reason=f"DATA LEAKAGE: {len(leaks)} test image(s) are byte-identical to train/val images; refusing to score",
            leak_examples=leaks[:5],
        )
        write_report(report)
        return 1

    try:
        from PIL import Image

        from app.common.image_utils import preprocess_image
        from app.config import NEGATIVE_CLASS_LABEL, POSITIVE_CLASS_LABEL, PREDICTION_THRESHOLD, MODEL_PATH, MODEL_NAME
        from app.freshness.model_loader import get_model

        model = get_model()
    except Exception as error:  # model weights absent, TensorFlow missing, ...
        report.update(status="NOT RUN", reason=f"Model could not be loaded: {error}")
        write_report(report)
        return 0

    if set(classes) != {NEGATIVE_CLASS_LABEL, POSITIVE_CLASS_LABEL}:
        report.update(status="NOT RUN", reason=f"Unexpected class folders {classes}")
        write_report(report)
        return 0

    y_true: list[str] = []
    y_pred: list[str] = []
    skipped = 0
    for label, files in test_files.items():
        for path in files:
            try:
                image = Image.open(path).convert("RGB")
                probability = float(model.predict(preprocess_image(image), verbose=0).flatten()[0])
            except Exception:
                skipped += 1
                continue
            y_true.append(label)
            y_pred.append(POSITIVE_CLASS_LABEL if probability >= PREDICTION_THRESHOLD else NEGATIVE_CLASS_LABEL)

    labels = [NEGATIVE_CLASS_LABEL, POSITIVE_CLASS_LABEL]
    matrix = confusion_matrix(y_true, y_pred, labels)
    per_class = per_class_report(matrix, labels)
    score = macro_f1(per_class)
    accuracy = float(np.mean(np.array(y_true) == np.array(y_pred))) if y_true else 0.0

    report.update(
        status=verdict(score, FRESHNESS_MACRO_F1_TARGET, comparable_to_srs=False),
        reason="Binary good/bad dataset; the SRS target is defined over Fresh/Medium/Spoiled, so this is NOT evidence for NFR-REL-004.",
        model={"name": MODEL_NAME, "path": str(MODEL_PATH)},
        dataset={
            "path": str(dataset),
            "split": "test (held out)",
            "classes": labels,
            "samples": len(y_true),
            "per_class_samples": {c: sum(1 for t in y_true if t == c) for c in labels},
            "skipped_unreadable": skipped,
            "train_val_images_checked_for_leakage": len(train_files),
            "leaks_found": 0,
        },
        confusion_matrix={"labels": labels, "rows_true_cols_predicted": matrix},
        per_class=per_class,
        accuracy=accuracy,
        macro_f1=score,
        binary_macro_f1_vs_target_note=f"macro F1 {score:.4f} vs 0.75 (informational only)",
    )
    write_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
