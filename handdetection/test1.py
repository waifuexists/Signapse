import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, Reshape
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import accuracy_score

import os

# Paths to data
train_path = 'data/train'
valid_path = 'data/valid'
test_path = 'data/test'



print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))


# physical_devices = tf.config.experimental.list_physical_devices('GPU')
# print("Num GUPs Available:",len(physical_devices))
# tf.config.experimental.set_memory_growth(physical_devices[0],True)

# Data generators
train_batch = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.mobilenet.preprocess_input
).flow_from_directory(
    directory=train_path,
    target_size=(224, 224),
    batch_size=100
)

valid_batch = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.mobilenet.preprocess_input
).flow_from_directory(
    directory=valid_path,
    target_size=(224, 224),
    batch_size=100
)

test_batch = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.mobilenet.preprocess_input
).flow_from_directory(
    directory=test_path,
    target_size=(224, 224),
    batch_size=10,
    shuffle=False  # Ensure shuffling is off for accuracy calculation
)

# Create model
mobile = tf.keras.applications.mobilenet.MobileNet()
x = mobile.layers[-5].output
y = Reshape((1024,))(x)
output = Dense(units=len(train_batch.class_indices), activation='softmax')(y)  # Dynamically set units
model = Model(inputs=mobile.input, outputs=output)

# Freeze the first few layers
for layer in model.layers[:-23]:
    layer.trainable = False

model.summary()

# EarlyStopping callback
# early_stopping = EarlyStopping(
#     monitor='val_loss',   # Monitor the validation loss
#     patience=5,           # Stop after 5 epochs of no improvement
#     restore_best_weights=True  # Restore the best weights when stopping
# )

# Compile and train the model
model.compile(optimizer=Adam(learning_rate=0.002), loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(x=train_batch, validation_data=valid_batch, epochs=3, verbose=2)

# Save the model
if not os.path.isfile('models/signs_detect.h5'):
    model.save('models/signs_detect.h5')

# Load the model (in case you want to use this code independently)
#model = tf.keras.models.load_model('models/sign.h5')

# Calculate Accuracy
true_labels = test_batch.classes  # True class indices
predictions = model.predict(test_batch, verbose=1)  # Predict probabilities
predicted_class_indices = np.argmax(predictions, axis=1)  # Convert to class indices

# Calculate accuracy
accuracy = accuracy_score(true_labels, predicted_class_indices)
print(f'Accuracy: {accuracy * 100:.2f}%')