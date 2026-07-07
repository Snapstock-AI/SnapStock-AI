import tensorflow as tf
import matplotlib.pyplot as plt
from tensorflow.keras import layers,models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

Image_Size = (224,224)
Batch_Size = 32
Epochs = 20

Train_Dir = "dataset/train"
Val_Dir = "dataset/val"
Model_Dir = "models/fruit_freshness.keras"

train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode="nearest"
)

val_datagen = ImageDataGenerator(
    rescale=1.0 / 255
)

train_generator = train_datagen.flow_from_directory(
    Train_Dir,
    target_size = Image_Size,
    batch_size = Batch_Size,
    class_mode = 'binary',
    shuffle = True
)

val_generator = val_datagen.flow_from_directory(
    Val_Dir,
    target_size = Image_Size,
    batch_size = Batch_Size,
    class_mode = 'binary',
    shuffle = False
)

model = models.Sequential([
    layers.Conv2D(32,(3,3), activation='relu', input_shape=(224,224,3)),
    layers.MaxPooling2D((2,2)),

    layers.Conv2D(64,(3,3), activation='relu'),
    layers.MaxPooling2D((2,2)),

    layers.Conv2D(128,(3,3), activation='relu'),
    layers.MaxPooling2D((2,2)),

    layers.Flatten(),

    layers.Dense(1024, activation = 'relu'),
    layers.Dense(128, activation = 'relu'),
    layers.Dense(16, activation = 'relu'),

    layers.Dense(1, activation = 'sigmoid')
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=Epochs
)

model.save(Model_Dir)
print("Model saved to", Model_Dir)

plt.plot(history.history['accuracy'], label='train acc')
plt.plot(history.history['val_accuracy'], label='val acc')
plt.legend()
plt.title("CNN Accuracy")
plt.show()