from flask import Flask, request, jsonify
import numpy as np
from tensorflow.keras.models import load_model

app = Flask(__name__)

# Load the full saved model (not just weights)
model = load_model("model.h5")

# These are the max values used during training normalization
# Must match: X = X / X.max(axis=0) from training script
# Order: screen, social, gaming, unlocks, night, session
MAX_VALS = np.array([600, 300, 200, 150, 180, 20], dtype=float)

LABELS = {0: "Mild", 1: "Moderate", 2: "Severe"}

TIPS = {
    "Mild": "Great job! Your usage looks healthy. Keep it up.",
    "Moderate": "Try reducing social media time before bed. Set app timers.",
    "Severe": "Consider a digital detox. Use app limits and grayscale mode.",
}


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json.get("features")

        if data is None:
            return jsonify({"error": "Missing 'features' in request body"}), 400

        input_array = np.array(data, dtype=float)

        # Validate shape: must be (3, 6) — 3 timesteps, 6 features
        if input_array.shape != (3, 6):
            return jsonify({
                "error": f"Expected shape (3, 6), got {input_array.shape}"
            }), 400

        # Normalize using same max values as training
        input_normalized = input_array / MAX_VALS

        # Reshape to (1, 3, 6) for model input
        input_reshaped = input_normalized.reshape(1, 3, 6)

        pred = model.predict(input_reshaped)

        risk_index = int(np.argmax(pred))
        risk_label = LABELS[risk_index]
        confidence = round(float(np.max(pred)) * 100, 1)

        return jsonify({
            "risk": risk_label,
            "confidence": confidence,
            "tip": TIPS[risk_label],
            "probabilities": {
                "Mild": round(float(pred[0][0]) * 100, 1),
                "Moderate": round(float(pred[0][1]) * 100, 1),
                "Severe": round(float(pred[0][2]) * 100, 1),
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
