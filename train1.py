# ================================
# 1. IMPORTS
# ================================
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, roc_curve
from sklearn.preprocessing import label_binarize

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

import seaborn as sns

# ================================
# 2. LOAD YOUR DATASET
# ================================
df = pd.read_csv("dataset_with_labels.csv")

print(df.head())
print(df.describe())

# ================================
# 3. PREPROCESSING
# ================================
X = df.drop("risk", axis=1)
y = df["risk"]

scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Convert to sequences (LSTM input)
def create_sequences(X, y, time_steps=3):
    Xs, ys = [], []
    for i in range(len(X) - time_steps):
        Xs.append(X[i:i+time_steps])
        ys.append(y.iloc[i+time_steps])
    return np.array(Xs), np.array(ys)

X_seq, y_seq = create_sequences(X_scaled, y)

# ================================
# 4. TRAIN TEST SPLIT
# ================================
X_train, X_test, y_train, y_test = train_test_split(
    X_seq, y_seq, test_size=0.2
)

# ================================
# 5. MODEL (LSTM)
# ================================
model = Sequential([
    LSTM(32, input_shape=(3, 6)),
    Dense(16, activation='relu'),
    Dense(3, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# ================================
# 6. TRAIN
# ================================
history = model.fit(
    X_train, y_train,
    epochs=10,
    validation_data=(X_test, y_test)
)

# ================================
# 7. SAVE MODEL
# ================================
model.save("model.h5")

# ================================
# 8. PLOTS
# ================================
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Val Loss')
plt.legend()
plt.title("Loss Graph")
plt.show()

plt.plot(history.history['accuracy'], label='Train Acc')
plt.plot(history.history['val_accuracy'], label='Val Acc')
plt.legend()
plt.title("Accuracy Graph")
plt.show()

# ================================
# 9. CONFUSION MATRIX
# ================================
y_pred = model.predict(X_test)
y_pred_classes = np.argmax(y_pred, axis=1)

cm = confusion_matrix(y_test, y_pred_classes)
sns.heatmap(cm, annot=True)
plt.title("Confusion Matrix")
plt.show()

# ================================
# 10. ROC CURVE
# ================================
y_test_bin = label_binarize(y_test, classes=[0,1,2])

for i in range(3):
    fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_pred[:, i])
    plt.plot(fpr, tpr, label=f"Class {i}")

plt.legend()
plt.title("ROC Curve")
plt.show()

# ================================
# 11. TEST PREDICTION
# ================================
sample = X_test[0].reshape(1, 3, 6)
prediction = model.predict(sample)

print("Predicted class:", np.argmax(prediction))
print("Confidence:", np.max(prediction))