import numpy as np
import tensorflow as tf

from keras import Model


DEFAULT_CONV_LAYER_NAME = "Conv_1"


def _split_backbone(model):
    """
    Split a model into its nested feature extractor (MobileNetV2) and the
    classification layers stacked on top of it.

    Transfer-learning models expose the backbone as a single top level layer,
    so the convolutional layers are not reachable with model.get_layer().
    Returns (model, []) when the model is flat.
    """

    for index, layer in enumerate(model.layers):

        if isinstance(layer, Model):

            return layer, model.layers[index + 1:]

    return model, []


def _get_conv_layer(
        backbone,
        last_conv_layer_name
):

    try:

        return backbone.get_layer(last_conv_layer_name)


    except ValueError as exc:

        available = ", ".join(
            layer.name
            for layer in backbone.layers
        )

        raise ValueError(
            f"Grad-CAM layer '{last_conv_layer_name}' not found in "
            f"'{backbone.name}'. Available layers: {available}"
        ) from exc


class GradCAM:

    def __init__(
            self,
            model,
            last_conv_layer_name=DEFAULT_CONV_LAYER_NAME
    ):

        self.model = model

        self.last_conv_layer_name = last_conv_layer_name


        backbone, self.head_layers = _split_backbone(model)

        conv_layer = _get_conv_layer(
            backbone,
            last_conv_layer_name
        )


        # Built from the backbone's own graph, so the convolutional output
        # stays connected to its inputs. The head layers are re-applied
        # manually in generate().
        self.feature_model = Model(
            inputs=backbone.inputs,
            outputs=[
                conv_layer.output,
                backbone.output
            ]
        )


    def _class_score(
            self,
            predictions,
            class_index
    ):

        # A single sigmoid unit only scores the positive class, so the
        # negative class is the same score with the gradient reversed.
        if predictions.shape[-1] == 1:

            score = predictions[:, 0]

            return score if class_index == 1 else -score


        return predictions[:, class_index]


    def generate(
            self,
            image,
            class_index
    ):


        img = (
            image
            if image.ndim == 4
            else np.expand_dims(image, axis=0)
        )

        img = tf.convert_to_tensor(
            img,
            dtype=tf.float32
        )


        with tf.GradientTape() as tape:

            conv_output, features = self.feature_model(
                img,
                training=False
            )

            tape.watch(conv_output)


            predictions = features

            for layer in self.head_layers:

                predictions = layer(
                    predictions,
                    training=False
                )


            loss = self._class_score(
                predictions,
                class_index
            )


        gradients = tape.gradient(
            loss,
            conv_output
        )


        if gradients is None:

            raise ValueError(
                f"Grad-CAM could not compute gradients for layer "
                f"'{self.last_conv_layer_name}'."
            )


        pooled_gradients = tf.reduce_mean(
            gradients,
            axis=(0, 1, 2)
        )


        conv_output = conv_output[0]


        heatmap = conv_output @ pooled_gradients[..., None]


        heatmap = tf.squeeze(
            heatmap
        )


        heatmap = np.maximum(
            heatmap.numpy(),
            0
        )


        maximum = heatmap.max()

        if maximum > 0:

            heatmap /= maximum


        return heatmap.astype("float32")


def show_layers(model):

    for layer in model.layers:
        print(layer.name)

        if hasattr(layer, "layers"):

            print("---- Internal layers ----")

            for inner in layer.layers:
                print(inner.name)
