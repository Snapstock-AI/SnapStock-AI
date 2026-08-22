from unittest.mock import Mock

import pytest

import app.freshness.model_loader as model_loader

def test_get_model_uses_existing_model(monkeypatch, tmp_path):
    """
    If the normal model already exists locally,
    it should be loaded without downloading anything.
    """

    model_path = tmp_path / "model.keras"
    model_path.touch()

    legacy_path = tmp_path / "legacy.keras"
    model_dir = tmp_path / "models"

    monkeypatch.setattr(
        model_loader,
        "MODEL_PATH",
        model_path,
    )
    monkeypatch.setattr(
        model_loader,
        "LEGACY_MODEL_PATH",
        legacy_path,
    )
    monkeypatch.setattr(
        model_loader,
        "MODEL_DIR",
        model_dir,
    )

    fake_model = Mock()

    mock_load_model = Mock(
        return_value=fake_model
    )
    mock_download = Mock()

    monkeypatch.setattr(
        model_loader.tf.keras.models,
        "load_model",
        mock_load_model,
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    result = model_loader.get_model()

    assert result is fake_model

    mock_load_model.assert_called_once_with(
        model_path,
        compile=False,
    )

    mock_download.assert_not_called()


def test_get_model_uses_legacy_model(monkeypatch, tmp_path):
    """
    If the normal model does not exist but the legacy
    model exists, the legacy model should be loaded.
    """

    model_path = tmp_path / "model.keras"

    legacy_path = tmp_path / "legacy.keras"
    legacy_path.touch()

    model_dir = tmp_path / "models"

    monkeypatch.setattr(
        model_loader,
        "MODEL_PATH",
        model_path,
    )
    monkeypatch.setattr(
        model_loader,
        "LEGACY_MODEL_PATH",
        legacy_path,
    )
    monkeypatch.setattr(
        model_loader,
        "MODEL_DIR",
        model_dir,
    )

    fake_model = Mock()

    mock_load_model = Mock(
        return_value=fake_model
    )
    mock_download = Mock()

    monkeypatch.setattr(
        model_loader.tf.keras.models,
        "load_model",
        mock_load_model,
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    result = model_loader.get_model()

    assert result is fake_model

    mock_load_model.assert_called_once_with(
        legacy_path,
        compile=False,
    )

    mock_download.assert_not_called()


def test_get_model_downloads_when_model_missing(
    monkeypatch,
    tmp_path,
):
    """
    If neither local model exists, the model should
    be downloaded from Hugging Face and then loaded.
    """

    model_path = tmp_path / "model.keras"
    legacy_path = tmp_path / "legacy.keras"
    model_dir = tmp_path / "models"

    downloaded_path = (
        model_dir / "downloaded_model.keras"
    )

    monkeypatch.setattr(
        model_loader,
        "MODEL_PATH",
        model_path,
    )
    monkeypatch.setattr(
        model_loader,
        "LEGACY_MODEL_PATH",
        legacy_path,
    )
    monkeypatch.setattr(
        model_loader,
        "MODEL_DIR",
        model_dir,
    )

    monkeypatch.setattr(
        model_loader,
        "HF_REPO_ID",
        "test/repository",
    )
    monkeypatch.setattr(
        model_loader,
        "HF_MODEL_FILE",
        "downloaded_model.keras",
    )

    fake_model = Mock()

    mock_download = Mock(
        return_value=str(downloaded_path)
    )

    mock_load_model = Mock(
        return_value=fake_model
    )

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    monkeypatch.setattr(
        model_loader.tf.keras.models,
        "load_model",
        mock_load_model,
    )

    result = model_loader.get_model()

    assert result is fake_model

    assert model_dir.exists()

    mock_download.assert_called_once_with(
        repo_id="test/repository",
        filename="downloaded_model.keras",
        local_dir=model_dir,
    )

    mock_load_model.assert_called_once_with(
        downloaded_path,
        compile=False,
    )


def test_get_model_download_failure(
    monkeypatch,
    tmp_path,
):
    """
    If Hugging Face downloading fails, get_model()
    should not attempt to load a TensorFlow model.
    """

    model_path = tmp_path / "model.keras"
    legacy_path = tmp_path / "legacy.keras"
    model_dir = tmp_path / "models"

    monkeypatch.setattr(
        model_loader,
        "MODEL_PATH",
        model_path,
    )
    monkeypatch.setattr(
        model_loader,
        "LEGACY_MODEL_PATH",
        legacy_path,
    )
    monkeypatch.setattr(
        model_loader,
        "MODEL_DIR",
        model_dir,
    )

    mock_download = Mock(
        side_effect=RuntimeError(
            "Download failed"
        )
    )

    mock_load_model = Mock()

    monkeypatch.setattr(
        model_loader,
        "hf_hub_download",
        mock_download,
    )

    monkeypatch.setattr(
        model_loader.tf.keras.models,
        "load_model",
        mock_load_model,
    )

    with pytest.raises(
        RuntimeError,
        match="Download failed",
    ):
        model_loader.get_model()

    mock_load_model.assert_not_called()


def test_get_model_tensorflow_load_failure(
    monkeypatch,
    tmp_path,
):
    """
    If TensorFlow cannot load an existing model,
    the loading exception should propagate.
    """

    model_path = tmp_path / "model.keras"
    model_path.touch()

    legacy_path = tmp_path / "legacy.keras"
    model_dir = tmp_path / "models"

    monkeypatch.setattr(
        model_loader,
        "MODEL_PATH",
        model_path,
    )
    monkeypatch.setattr(
        model_loader,
        "LEGACY_MODEL_PATH",
        legacy_path,
    )
    monkeypatch.setattr(
        model_loader,
        "MODEL_DIR",
        model_dir,
    )

    mock_load_model = Mock(
        side_effect=ValueError(
            "Invalid TensorFlow model"
        )
    )

    monkeypatch.setattr(
        model_loader.tf.keras.models,
        "load_model",
        mock_load_model,
    )

    with pytest.raises(
        ValueError,
        match="Invalid TensorFlow model",
    ):
        model_loader.get_model()

