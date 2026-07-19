import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix
from sklearn.metrics import ConfusionMatrixDisplay

Model_Dir = 'models/fruit_freshness.keras'
#Model_Dir = 'models/mobienet_friut.keras'
Image_Size = (224,224)
Batch_Size = 32

Model = tf.keras.models.load_model(Model_Dir)

test_datagen = ImageDataGenerator(
    rescale = 1./255
) 

test_generator = test_datagen.flow_from_directory(
    "dataset/test",
    target_size = Image_Size,
    batch_size = Batch_Size,
    class_mode = 'binary',
    shuffle = False
)

loss , accuracy = Model.evaluate(test_generator)
print(f"\nTest Loss     : {loss:.4f}")
print(f"Test Accuracy : {accuracy*100:.2f}%")

prediction = Model.predict(test_generator)
predicted_labels = (prediction > 0.5).astype(int).flatten()

true_labels = test_generator.classes

print(classification_report(
    true_labels,
    predicted_labels,
    target_names=["bad","good"]
))

cm = confusion_matrix(
    true_labels,
    predicted_labels
)

print(cm)

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=["bad","good"]
)

disp.plot(cmap="Blues")
plt.title("Confusion Matrix")
plt.show()
