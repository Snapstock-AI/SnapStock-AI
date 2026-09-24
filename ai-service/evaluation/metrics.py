"""Metric and report helpers for the AI evaluation suite (no model or TensorFlow needed).

SRS NFR-REL-004 targets: object detection mAP@0.5 >= 0.70, freshness macro F1 >= 0.75.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

DETECTION_MAP50_TARGET = 0.70
FRESHNESS_MACRO_F1_TARGET = 0.75
SRS_FRESHNESS_CLASSES = ("Fresh", "Medium", "Spoiled")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def confusion_matrix(y_true: list[str], y_pred: list[str], labels: list[str]) -> list[list[int]]:
    """Rows = true label, columns = predicted label, in `labels` order."""
    index = {label: i for i, label in enumerate(labels)}
    matrix = [[0] * len(labels) for _ in labels]
    for truth, pred in zip(y_true, y_pred):
        matrix[index[truth]][index[pred]] += 1
    return matrix


def per_class_report(matrix: list[list[int]], labels: list[str]) -> dict[str, dict[str, float]]:
    report = {}
    for i, label in enumerate(labels):
        tp = matrix[i][i]
        fp = sum(matrix[r][i] for r in range(len(labels))) - tp
        fn = sum(matrix[i]) - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        report[label] = {"precision": precision, "recall": recall, "f1": f1, "support": sum(matrix[i])}
    return report


def macro_f1(report: dict[str, dict[str, float]]) -> float:
    """Unweighted mean of per-class F1 over classes that have samples."""
    scored = [c["f1"] for c in report.values() if c["support"] > 0]
    return sum(scored) / len(scored) if scored else 0.0


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def images_in(directory: Path) -> list[Path]:
    return sorted(p for p in directory.rglob("*") if p.suffix.lower() in IMAGE_SUFFIXES)


def find_leakage(evaluation_files: list[Path], training_files: list[Path]) -> list[tuple[str, str]]:
    """Byte-identical images present in both sets (train/eval contamination)."""
    training_hashes = {file_sha256(p): str(p) for p in training_files}
    leaks = []
    for p in evaluation_files:
        digest = file_sha256(p)
        if digest in training_hashes:
            leaks.append((str(p), training_hashes[digest]))
    return leaks


def verdict(metric: float | None, target: float, *, comparable_to_srs: bool) -> str:
    """PASS / FAIL against the SRS target, or PARTIAL when the measured metric is not the SRS metric.

    PARTIAL is used, for example, when the SRS asks for a 3-class macro F1 but only a 2-class
    dataset exists: the number is reported, but it must not be presented as proof of the SRS target.
    """
    if metric is None:
        return "NOT RUN"
    if not comparable_to_srs:
        return "PARTIAL"
    return "PASS" if metric >= target else "FAIL"
