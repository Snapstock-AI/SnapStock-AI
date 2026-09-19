import cv2
import numpy as np
import os
import uuid


OUTPUT_DIR = "temp/gradcam"


os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)



def save_heatmap(
        image,
        heatmap
):


    heatmap = cv2.resize(
        heatmap,
        (
            image.shape[1],
            image.shape[0]
        )
    )


    heatmap = np.uint8(
        np.clip(255 * heatmap, 0, 255)
    )


    heatmap = cv2.applyColorMap(
        heatmap,
        cv2.COLORMAP_JET
    )


    # The model input is RGB in 0..1, while OpenCV writes BGR.
    image = np.uint8(
        np.clip(image * 255, 0, 255)
    )

    image = cv2.cvtColor(
        image,
        cv2.COLOR_RGB2BGR
    )


    result = cv2.addWeighted(
        image,
        0.6,
        heatmap,
        0.4,
        0
    )


    filename = (
        str(uuid.uuid4())
        +
        ".jpg"
    )


    path = os.path.join(
        OUTPUT_DIR,
        filename
    )


    cv2.imwrite(
        path,
        result
    )


    return path