import numpy as np
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.utils import to_categorical

# Generate dataset
np.random.seed(42)
rows = 1000

data = {
    "screen": np.random.randint(60, 600, rows),
    "social": np.random.randint(10, 300, rows),
    "gaming": np.random.randint(0, 200, rows),
    "unlocks": np.random.randint(20, 150, rows),
    "night": np.random.randint(0, 180, rows),
    "session": np.random.randint(1, 20, rows),
}

df = pd.DataFrame(data)

def risk(row):
    score = (
        row["screen"]*0.3 +
        row["social"]*0.2 +
        row["gaming"]*0.2 +
        row["unlocks"]*0.1 +
        row["night"]*0.2
    )
    return 0 if score < 150 else 1 if score < 300 else 2

df["risk"] = df.apply(risk, axis=1)

# Prepare sequences
X = df.drop("risk", axis=1).values
y = df["risk"].values

X = X / X.max(axis=0)

timesteps = 3
X_seq, y_seq = [], []

for i in range(len(X)-timesteps):
    X_seq.append(X[i:i+timesteps])
    y_seq.append(y[i+timesteps])

X_seq = np.array(X_seq)
y_seq = to_categorical(y_seq, 3)

# Model
model = Sequential()
model.add(LSTM(32, input_shape=(3,6)))
model.add(Dense(16, activation='relu'))
model.add(Dense(3, activation='softmax'))

model.compile(loss='categorical_crossentropy', optimizer='adam')
model.fit(X_seq, y_seq, epochs=5)

# Save weights only
model.save("model.h5")