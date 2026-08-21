from unittest.mock import Mock

import pytest

import app.detection.model_loader as model_loader


# ============================================================
# detection_model_exists()
# ============================================================

def test_detection_model_exists_when_file_present(
    monkeypatch,
    tmp_path,
):
    """
    A non-empty model file should be considered valid.
    """

    model_path = tmp_path / "detection.pt"

    model_path.write_bytes(
        b"fake-yolo-model"
    )

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        model_path,
    )

    assert model_loader.detection_model_exists() is True


def test_detection_model_exists_when_file_missing(
    monkeypatch,
    tmp_path,
):
    """
    Missing checkpoint should return False.
    """

    model_path = tmp_path / "missing.pt"

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        model_path,
    )

    assert model_loader.detection_model_exists() is False


def test_detection_model_exists_when_file_empty(
    monkeypatch,
    tmp_path,
):
    """
    An empty checkpoint file should not be accepted.
    """

    model_path = tmp_path / "empty.pt"

    model_path.touch()

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        model_path,
    )

    assert model_loader.detection_model_exists() is False


# ============================================================
# ensure_detection_model()
# ============================================================

def test_ensure_detection_model_uses_existing_file(
    monkeypatch,
    tmp_path,
):
    """
    If the model already exists locally,
    Hugging Face should not be contacted.
    """

    model_path = (
        tmp_path
        / "models"
        / "detection.pt"
    )

    model_path.parent.mkdir()

    model_path.write_bytes(
        b"existing-yolo-model"
    )

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        model_path,
    )

    mock_download = Mock()

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    result = model_loader.ensure_detection_model()

    assert result == model_path

    mock_download.assert_not_called()


def test_ensure_detection_model_downloads_missing_model(
    monkeypatch,
    tmp_path,
):
    """
    Missing model should be downloaded,
    copied to the configured path,
    and returned.
    """

    destination_path = (
        tmp_path
        / "models"
        / "detection.pt"
    )

    cached_path = (
        tmp_path
        / "huggingface-cache"
        / "model.pt"
    )

    cached_path.parent.mkdir()

    cached_path.write_bytes(
        b"downloaded-yolo-model"
    )

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        destination_path,
    )

    monkeypatch.setattr(
        model_loader,
        "HF_DETECTION_REPO_ID",
        "test/yolo-repository",
    )

    monkeypatch.setattr(
        model_loader,
        "HF_DETECTION_MODEL_FILE",
        "model.pt",
    )

    monkeypatch.setenv(
        "HF_TOKEN",
        "test-token",
    )

    mock_download = Mock(
        return_value=str(cached_path)
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    result = model_loader.ensure_detection_model()

    assert result == destination_path

    assert destination_path.exists()

    assert (
        destination_path.read_bytes()
        == b"downloaded-yolo-model"
    )

    mock_download.assert_called_once_with(
        repo_id="test/yolo-repository",
        filename="model.pt",
        token="test-token",
    )


def test_ensure_detection_model_download_failure(
    monkeypatch,
    tmp_path,
):
    """
    Hugging Face failure should be converted
    into a clear RuntimeError.
    """

    destination_path = (
        tmp_path
        / "models"
        / "detection.pt"
    )

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        destination_path,
    )

    mock_download = Mock(
        side_effect=Exception(
            "Network unavailable"
        )
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    with pytest.raises(
        RuntimeError,
        match="Failed to download the YOLO detection model",
    ):
        model_loader.ensure_detection_model()


def test_ensure_detection_model_rejects_empty_download(
    monkeypatch,
    tmp_path,
):
    """
    Even if the download operation finishes,
    an empty checkpoint must not be accepted.
    """

    destination_path = (
        tmp_path
        / "models"
        / "detection.pt"
    )

    cached_path = (
        tmp_path
        / "cache"
        / "empty.pt"
    )

    cached_path.parent.mkdir()

    # Zero-byte model
    cached_path.touch()

    monkeypatch.setattr(
        model_loader,
        "DETECTION_MODEL_PATH",
        destination_path,
    )

    mock_download = Mock(
        return_value=str(cached_path)
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    with pytest.raises(
        RuntimeError,
        match=(
            "model download finished"
        ),
    ):
        model_loader.ensure_detection_model()


# ============================================================
# get_detection_model()
# ============================================================

def test_get_detection_model_loads_yolo(
    monkeypatch,
    tmp_path,
):
    """
    get_detection_model() should load YOLO
    using the path returned by ensure_detection_model().
    """

    model_path = tmp_path / "detection.pt"

    fake_model = Mock()

    fake_model.names = {
        0: "apple",
        1: "orange",
    }

    mock_ensure = Mock(
        return_value=model_path
    )

    mock_yolo = Mock(
        return_value=fake_model
    )

    monkeypatch.setattr(
        model_loader,
        "ensure_detection_model",
        mock_ensure,
    )

    monkeypatch.setattr(
        model_loader,
        "YOLO",
        mock_yolo,
    )

    # Important because get_detection_model()
    # uses @lru_cache.
    model_loader.get_detection_model.cache_clear()

    result = model_loader.get_detection_model()

    assert result is fake_model

    mock_ensure.assert_called_once()

    mock_yolo.assert_called_once_with(
        str(model_path)
    )

    model_loader.get_detection_model.cache_clear()


def test_get_detection_model_yolo_load_failure(
    monkeypatch,
    tmp_path,
):
    """
    An invalid/corrupted YOLO checkpoint should
    produce the loader's RuntimeError.
    """

    model_path = tmp_path / "broken.pt"

    monkeypatch.setattr(
        model_loader,
        "ensure_detection_model",
        Mock(
            return_value=model_path
        ),
    )

    mock_yolo = Mock(
        side_effect=Exception(
            "Invalid checkpoint"
        )
    )

    monkeypatch.setattr(
        model_loader,
        "YOLO",
        mock_yolo,
    )

    model_loader.get_detection_model.cache_clear()

    with pytest.raises(
        RuntimeError,
        match=(
            "YOLO checkpoint exists, "
            "but it could not be loaded"
        ),
    ):
        model_loader.get_detection_model()

    model_loader.get_detection_model.cache_clear()


def test_get_detection_model_is_cached(
    monkeypatch,
    tmp_path,
):
    """
    YOLO should only be loaded once.
    Later calls should reuse the cached instance.
    """

    model_path = tmp_path / "detection.pt"

    fake_model = Mock()

    fake_model.names = {
        0: "apple",
    }

    mock_ensure = Mock(
        return_value=model_path
    )

    mock_yolo = Mock(
        return_value=fake_model
    )

    monkeypatch.setattr(
        model_loader,
        "ensure_detection_model",
        mock_ensure,
    )

    monkeypatch.setattr(
        model_loader,
        "YOLO",
        mock_yolo,
    )

    model_loader.get_detection_model.cache_clear()

    first_result = (
        model_loader.get_detection_model()
    )

    second_result = (
        model_loader.get_detection_model()
    )

    assert first_result is second_result

    # Because of @lru_cache(maxsize=1),
    # model loading should happen only once.
    mock_yolo.assert_called_once_with(
        str(model_path)
    )

    mock_ensure.assert_called_once()

    model_loader.get_detection_model.cache_clear()