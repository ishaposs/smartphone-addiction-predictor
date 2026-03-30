from flask import Flask, request, jsonify
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

app = Flask(__name__)

timesteps = 3
features = 6

# SAME MODEL
model = Sequential()
model.add(LSTM(32, input_shape=(timesteps, features)))
model.add(Dense(16, activation='relu'))
model.add(Dense(3, activation='softmax'))

# Load weights
model.load_weights("model.h5")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json["features"]
    
    input_data = np.array(data).reshape(1, timesteps, features)
    pred = model.predict(input_data)

    return jsonify({
        "risk": int(np.argmax(pred)),
        "confidence": float(np.max(pred))
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)