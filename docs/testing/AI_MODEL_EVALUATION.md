# AI model evaluation (NFR-REL-004)

Targets: detection mAP@0.5 >= 0.70; freshness macro F1 >= 0.75 over Fresh / Medium / Spoiled.

| Metric | Command | Result on this repository |
|--------|---------|---------------------------|
| Detection mAP@0.5 | `python -m evaluation.evaluate_detection --data <yaml>` | **NOT RUN - DATASET REQUIRED.** No labelled YOLO validation set is in the repository; provide one that was not used for training |
| Freshness macro F1, per-class P/R, confusion matrix | `python -m evaluation.evaluate_freshness` | **NOT RUN - DATA LEAKAGE.** 2698 images in `dataset/test` are byte-identical to images in `dataset/train` or `dataset/val`, so any score would be inflated; the tool refuses to score |

Additionally the deployed freshness model and the local dataset are 2-class (`good`/`bad`), so even a clean run would be
reported **PARTIAL** (`verdict(..., comparable_to_srs=False)`): a real number for a different task, not evidence for
the 3-class SRS metric. Required to close this: a de-duplicated held-out Fresh/Medium/Spoiled test set and a labelled
detection validation set. The report records dataset path and split, sample counts, model name/path, metrics, target and
verdict (`ai-service/evaluation/reports/*.json`, git-ignored). The evaluation code itself is unit tested with synthetic
data (`tests/unit/evaluation/test_metrics.py`). Datasets and weights are never committed.
