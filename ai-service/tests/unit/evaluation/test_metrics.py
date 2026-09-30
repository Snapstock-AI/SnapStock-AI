from pathlib import Path

import pytest

from evaluation.metrics import (
    confusion_matrix,
    find_leakage,
    macro_f1,
    per_class_report,
    verdict,
)

LABELS = ["Fresh", "Medium", "Spoiled"]


def test_confusion_matrix_rows_are_true_labels_and_columns_predictions():
    y_true = ["Fresh", "Fresh", "Medium", "Spoiled", "Spoiled"]
    y_pred = ["Fresh", "Medium", "Medium", "Spoiled", "Fresh"]

    assert confusion_matrix(y_true, y_pred, LABELS) == [
        [1, 1, 0],
        [0, 1, 0],
        [1, 0, 1],
    ]


def test_per_class_precision_recall_f1_match_hand_computation():
    matrix = [[8, 2, 0], [1, 7, 2], [0, 1, 9]]

    report = per_class_report(matrix, LABELS)

    # Fresh: tp 8, fp 1, fn 2 -> P 8/9, R 8/10
    assert report["Fresh"]["precision"] == pytest.approx(8 / 9)
    assert report["Fresh"]["recall"] == pytest.approx(0.8)
    assert report["Fresh"]["f1"] == pytest.approx(2 * (8 / 9) * 0.8 / ((8 / 9) + 0.8))
    assert report["Medium"]["support"] == 10


def test_macro_f1_is_the_unweighted_mean_so_a_rare_bad_class_is_not_hidden():
    # 100 easy Fresh samples, 4 Spoiled samples all missed: accuracy 96 %, macro F1 is poor.
    matrix = [[100, 0, 0], [0, 0, 0], [4, 0, 0]]

    report = per_class_report(matrix, LABELS)

    assert report["Fresh"]["f1"] > 0.97
    assert report["Spoiled"]["f1"] == 0.0
    assert macro_f1(report) < 0.55  # Medium has no samples and is excluded


def test_macro_f1_of_a_perfect_classifier_is_one():
    report = per_class_report([[5, 0, 0], [0, 5, 0], [0, 0, 5]], LABELS)

    assert macro_f1(report) == 1.0


def test_leakage_check_flags_identical_files_even_when_renamed(tmp_path: Path):
    train, evaluation = tmp_path / "train", tmp_path / "test"
    train.mkdir(), evaluation.mkdir()
    (train / "a.jpg").write_bytes(b"same-bytes")
    (train / "b.jpg").write_bytes(b"other")
    (evaluation / "renamed.jpg").write_bytes(b"same-bytes")
    (evaluation / "unique.jpg").write_bytes(b"unique")

    leaks = find_leakage(sorted(evaluation.glob("*.jpg")), sorted(train.glob("*.jpg")))

    assert [Path(e).name for e, _ in leaks] == ["renamed.jpg"]


def test_leakage_check_is_empty_for_disjoint_sets(tmp_path: Path):
    (tmp_path / "t.jpg").write_bytes(b"1")
    (tmp_path / "e.jpg").write_bytes(b"2")

    assert find_leakage([tmp_path / "e.jpg"], [tmp_path / "t.jpg"]) == []


@pytest.mark.parametrize(
    "metric,comparable,expected",
    [
        (0.80, True, "PASS"),
        (0.75, True, "PASS"),
        (0.7499, True, "FAIL"),
        (0.95, False, "PARTIAL"),  # right number, wrong metric (e.g. 2 classes instead of 3)
        (None, True, "NOT RUN"),
    ],
)
def test_verdict_never_reports_pass_for_a_metric_that_is_not_the_srs_metric(metric, comparable, expected):
    assert verdict(metric, 0.75, comparable_to_srs=comparable) == expected
