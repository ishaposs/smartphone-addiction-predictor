import numpy as np
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping

np.random.seed(42)
samples_per_class = 500
timesteps = 3

MAX_VALS = np.array([600, 300, 200, 150, 180, 20], dtype=float)

# ── Generate per-class data ───────────────────────────────────────────────────

mild_df = pd.DataFrame({
    "screen":  np.random.randint(60,  150, samples_per_class),
    "social":  np.random.randint(10,  60,  samples_per_class),
    "gaming":  np.random.randint(0,   40,  samples_per_class),
    "unlocks": np.random.randint(20,  50,  samples_per_class),
    "night":   np.random.randint(0,   30,  samples_per_class),
    "session": np.random.randint(1,   6,   samples_per_class),
    "risk":    np.zeros(samples_per_class, dtype=int),
})

moderate_df = pd.DataFrame({
    "screen":  np.random.randint(200, 350, samples_per_class),
    "social":  np.random.randint(70,  150, samples_per_class),
    "gaming":  np.random.randint(40,  100, samples_per_class),
    "unlocks": np.random.randint(60,  100, samples_per_class),
    "night":   np.random.randint(30,  80,  samples_per_class),
    "session": np.random.randint(5,   12,  samples_per_class),
    "risk":    np.ones(samples_per_class, dtype=int),
})

severe_df = pd.DataFrame({
    "screen":  np.random.randint(400, 600, samples_per_class),
    "social":  np.random.randint(150, 300, samples_per_class),
    "gaming":  np.random.randint(100, 200, samples_per_class),
    "unlocks": np.random.randint(100, 150, samples_per_class),
    "night":   np.random.randint(90,  180, samples_per_class),
    "session": np.random.randint(10,  20,  samples_per_class),
    "risk":    np.full(samples_per_class, 2, dtype=int),
})

# ── Save full dataset ─────────────────────────────────────────────────────────

full_df = pd.concat([mild_df, moderate_df, severe_df]).reset_index(drop=True)
full_df.drop("risk", axis=1).to_csv("dataset.csv", index=False)
full_df.to_csv("dataset_with_labels.csv", index=False)

print("Class distribution:")
print(full_df["risk"].value_counts().sort_index())

# ── Build sequences PER CLASS (critical fix) ──────────────────────────────────

def make_sequences(df_class, label):
    X = df_class.drop("risk", axis=1).values.astype(float) / MAX_VALS
    seqs, labels = [], []
    for i in range(len(X) - timesteps):
        seqs.append(X[i:i + timesteps])
        labels.append(label)
    return seqs, labels

m_X,  m_y  = make_sequences(mild_df,     0)
mo_X, mo_y = make_sequences(moderate_df, 1)
s_X,  s_y  = make_sequences(severe_df,   2)

X_seq = np.array(m_X  + mo_X  + s_X)
y_raw = np.array(m_y  + mo_y  + s_y)

print(f"\nTotal sequences: {len(X_seq)}")
print(f"Sequences per class: {len(m_X)} mild / {len(mo_X)} moderate / {len(s_X)} severe\n")

# ── Shuffle AFTER building sequences ─────────────────────────────────────────

idx = np.random.permutation(len(X_seq))
X_seq = X_seq[idx]
y_seq = to_categorical(y_raw[idx], num_classes=3)

# ── Model ─────────────────────────────────────────────────────────────────────

model = Sequential()
model.add(LSTM(64, input_shape=(timesteps, 6), return_sequences=True))
model.add(Dropout(0.2))
model.add(LSTM(32))
model.add(Dropout(0.2))
model.add(Dense(16, activation="relu"))
model.add(Dense(3, activation="softmax"))

model.compile(
    loss="categorical_crossentropy",
    optimizer="adam",
    metrics=["accuracy"],
)

model.summary()

# ── Train ─────────────────────────────────────────────────────────────────────

early_stop = EarlyStopping(
    monitor="val_accuracy",
    patience=5,
    restore_best_weights=True,
    verbose=1,
)

history = model.fit(
    X_seq, y_seq,
    epochs=50,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=1,
)

# ── Evaluate ──────────────────────────────────────────────────────────────────

final_acc = max(history.history["val_accuracy"])
print(f"\nBest validation accuracy: {final_acc * 100:.1f}%")

# ── Quick sanity check ────────────────────────────────────────────────────────

print("\nSanity check predictions:")
test_cases = {
    "Mild":     np.array([[90, 20, 10, 25, 5,  3],
                           [85, 15, 5,  22, 8,  2],
                           [95, 25, 12, 28, 6,  4]], dtype=float) / MAX_VALS,
    "Moderate": np.array([[250, 90, 60, 75, 45, 8],
                           [270,110, 50, 80, 55, 9],
                           [260, 95, 70, 70, 40, 7]], dtype=float) / MAX_VALS,
    "Severe":   np.array([[480,200,150,120,140,15],
                           [510,220,160,130,150,17],
                           [490,210,140,125,160,16]], dtype=float) / MAX_VALS,
}

labels = ["Mild", "Moderate", "Severe"]
for expected, features in test_cases.items():
    pred = model.predict(features.reshape(1, 3, 6), verbose=0)
    predicted = labels[int(np.argmax(pred))]
    confidence = float(np.max(pred)) * 100
    status = "✓" if predicted == expected else "✗"
    print(f"  {status} Expected {expected:10s} → Got {predicted:10s} ({confidence:.1f}%)")

# ── Save ──────────────────────────────────────────────────────────────────────

model.save("model.h5")
print("\nModel saved to model.h5")
