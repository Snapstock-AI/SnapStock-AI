import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image


model = tf.keras.models.load_model("models/fruit_freshness.keras")
#model = tf.keras.models.load_model("models/mobilenet_fruit.keras")
img_path = "dataset/test/R.jpeg"   

img = image.load_img(img_path, target_size=(224, 224))
img_array = image.img_to_array(img)
img_array = img_array / 255.0
img_array = np.expand_dims(img_array, axis=0)

prediction = model.predict(img_array)
print("Raw prediction:", prediction[0][0])

if prediction[0][0] >= 0.5:
    print("Prediction: GOOD")
else:
    print("Prediction: BAD")