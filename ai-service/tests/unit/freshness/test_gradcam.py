import keras
import numpy as np
import pytest
import tensorflow as tf

from app.freshness.gradcam import (
    DEFAULT_CONV_LAYER_NAME,
    GradCAM,
    _get_conv_layer,
    _split_backbone,
    show_layers,
)


INPUT_SHAPE = (32, 32, 3)

# Spatial size of the Conv_1 feature map for the models built below.
FEATURE_MAP_SHAPE = (32, 32)


# ============================================================
# Helper functions
# ============================================================

def build_backbone(name="mobilenetv2_test"):
    """
    Miniature stand-in for MobileNetV2: a functional model whose
    convolutional layer is only reachable from inside its own graph.
    """

    inputs = keras.Input(shape=INPUT_SHAPE)

    x = keras.layers.Conv2D(
        4,
        3,
        padding="same",
        name=DEFAULT_CONV_LAYER_NAME,
    )(inputs)

    x = keras.layers.BatchNormalization(
        name="Conv_1_bn",
    )(x)

    outputs = keras.layers.ReLU(
        name="out_relu",
    )(x)

    return keras.Model(
        inputs,
        outputs,
        name=name,
    )


def build_nested_model(units=1):
    """
    Transfer-learning model: a backbone wrapped as a single top level
    layer, with a classification head stacked on top of it.
    """

    keras.utils.set_random_seed(0)

    backbone = build_backbone()

    inputs = keras.Input(shape=INPUT_SHAPE)

    x = backbone(inputs)

    x = keras.layers.GlobalAveragePooling2D(
        name="global_average_pooling2d",
    )(x)

    x = keras.layers.Dropout(
        0.2,
        name="dropout",
    )(x)

    outputs = keras.layers.Dense(
        units,
        activation="sigmoid" if units == 1 else "softmax",
        name="dense_1",
    )(x)

    return keras.Model(
        inputs,
        outputs,
    )


def build_flat_model():
    """
    Model whose convolutional layer sits at the top level.
    """

    keras.utils.set_random_seed(0)

    inputs = keras.Input(shape=INPUT_SHAPE)

    x = keras.layers.Conv2D(
        4,
        3,
        padding="same",
        name=DEFAULT_CONV_LAYER_NAME,
    )(inputs)

    x = keras.layers.GlobalAveragePooling2D(
        name="global_average_pooling2d",
    )(x)

    outputs = keras.layers.Dense(
        1,
        activation="sigmoid",
        name="dense_1",
    )(x)

    return keras.Model(
        inputs,
        outputs,
    )


def create_image(batched=True):
    """
    Preprocessed image in the 0..1 range the model expects.
    """

    rng = np.random.default_rng(0)

    image = rng.random(
        INPUT_SHAPE,
    ).astype("float32")

    if batched:
        return np.expand_dims(
            image,
            axis=0,
        )

    return image


# ============================================================
# _split_backbone
# ============================================================

def test_split_backbone_returns_nested_model_and_head():
    model = build_nested_model()

    backbone, head_layers = _split_backbone(model)

    assert backbone.name == "mobilenetv2_test"

    assert [
        layer.name
        for layer in head_layers
    ] == [
        "global_average_pooling2d",
        "dropout",
        "dense_1",
    ]


def test_split_backbone_flat_model_returns_model_itself():
    model = build_flat_model()

    backbone, head_layers = _split_backbone(model)

    assert backbone is model
    assert head_layers == []


# ============================================================
# _get_conv_layer
# ============================================================

def test_get_conv_layer_returns_requested_layer():
    backbone = build_backbone()

    layer = _get_conv_layer(
        backbone,
        DEFAULT_CONV_LAYER_NAME,
    )

    assert layer.name == DEFAULT_CONV_LAYER_NAME


def test_get_conv_layer_unknown_name_lists_available_layers():
    backbone = build_backbone()

    with pytest.raises(
        ValueError,
        match="Grad-CAM layer 'missing_layer' not found",
    ) as exc_info:
        _get_conv_layer(
            backbone,
            "missing_layer",
        )

    # The message must name the searched model and its layers,
    # otherwise a wrong layer name is impossible to debug.
    assert "mobilenetv2_test" in str(exc_info.value)
    assert DEFAULT_CONV_LAYER_NAME in str(exc_info.value)


# ============================================================
# GradCAM construction
# ============================================================

def test_gradcam_finds_conv_layer_inside_nested_backbone():
    """
    Regression: the convolutional layer is not a top level layer, so
    model.get_layer(...) alone raises "No such layer: Conv_1".
    """

    model = build_nested_model()

    with pytest.raises(ValueError, match="No such layer"):
        model.get_layer(DEFAULT_CONV_LAYER_NAME)

    gradcam = GradCAM(model)

    assert gradcam.last_conv_layer_name == DEFAULT_CONV_LAYER_NAME

    assert [
        layer.name
        for layer in gradcam.head_layers
    ] == [
        "global_average_pooling2d",
        "dropout",
        "dense_1",
    ]


def test_gradcam_unknown_layer_raises_value_error():
    model = build_nested_model()

    with pytest.raises(
        ValueError,
        match="Grad-CAM layer 'nope' not found",
    ):
        GradCAM(
            model,
            "nope",
        )


# ============================================================
# _class_score
# ============================================================

def test_class_score_single_sigmoid_output():
    """
    A single sigmoid unit only scores the positive class, so the
    negative class is the same score with the gradient reversed.
    """

    gradcam = GradCAM(build_nested_model())

    predictions = tf.constant(
        [[0.8]],
        dtype=tf.float32,
    )

    assert float(
        gradcam._class_score(predictions, 1)[0]
    ) == pytest.approx(0.8)

    assert float(
        gradcam._class_score(predictions, 0)[0]
    ) == pytest.approx(-0.8)


def test_class_score_multi_class_output():
    gradcam = GradCAM(build_nested_model(units=3))

    predictions = tf.constant(
        [[0.1, 0.3, 0.6]],
        dtype=tf.float32,
    )

    assert float(
        gradcam._class_score(predictions, 2)[0]
    ) == pytest.approx(0.6)


# ============================================================
# generate
# ============================================================

@pytest.mark.parametrize(
    "class_index",
    [0, 1],
)
def test_generate_returns_normalised_heatmap(class_index):
    """
    Both classes must work on a single sigmoid output: indexing
    predictions[:, 1] on a one-unit model is out of bounds.
    """

    gradcam = GradCAM(build_nested_model())

    heatmap = gradcam.generate(
        create_image(),
        class_index,
    )

    assert heatmap.shape == FEATURE_MAP_SHAPE
    assert heatmap.dtype == np.float32

    assert not np.isnan(heatmap).any()

    assert heatmap.min() >= 0.0
    assert heatmap.max() <= 1.0


def test_generate_accepts_unbatched_image():
    """
    The caller passes an already batched image, so generate() must not
    add a second batch dimension.
    """

    gradcam = GradCAM(build_nested_model())

    batched = gradcam.generate(
        create_image(batched=True),
        1,
    )

    unbatched = gradcam.generate(
        create_image(batched=False),
        1,
    )

    assert batched.shape == FEATURE_MAP_SHAPE
    assert unbatched.shape == FEATURE_MAP_SHAPE

    np.testing.assert_allclose(
        batched,
        unbatched,
        atol=1e-5,
    )


def test_generate_works_on_flat_model():
    gradcam = GradCAM(build_flat_model())

    assert gradcam.head_layers == []

    heatmap = gradcam.generate(
        create_image(),
        1,
    )

    assert heatmap.shape == FEATURE_MAP_SHAPE
    assert heatmap.max() <= 1.0


def test_generate_dead_activations_do_not_produce_nan():
    """
    An all-zero feature map would make the normalisation divide by zero.
    """

    model = build_nested_model()

    backbone, _ = _split_backbone(model)

    conv_layer = backbone.get_layer(
        DEFAULT_CONV_LAYER_NAME,
    )

    conv_layer.set_weights([
        np.zeros_like(weight)
        for weight in conv_layer.get_weights()
    ])

    heatmap = GradCAM(model).generate(
        create_image(),
        1,
    )

    assert not np.isnan(heatmap).any()

    assert heatmap.max() == 0.0


def test_generate_heatmap_varies_across_the_feature_map():
    """
    A constant heatmap would mean Grad-CAM explains nothing.
    """

    gradcam = GradCAM(build_nested_model())

    heatmap = gradcam.generate(
        create_image(),
        1,
    )

    assert heatmap.std() > 0.0


# ============================================================
# show_layers
# ============================================================

def test_show_layers_prints_nested_layers(capsys):
    model = build_nested_model()

    show_layers(model)

    output = capsys.readouterr().out

    assert "mobilenetv2_test" in output
    assert "---- Internal layers ----" in output
    assert DEFAULT_CONV_LAYER_NAME in output
    assert "dense_1" in output
