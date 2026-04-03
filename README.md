# Smartphone Addiction Risk Prediction System

## Overview

This project is a Deep Learning-based system designed to predict smartphone addiction risk using user behavioral data. It analyzes patterns such as screen time, social media usage, gaming activity, unlock frequency, and night-time usage to classify users into Low, Medium, or High addiction risk.

The system uses a Long Short-Term Memory (LSTM) model to capture temporal patterns in user behavior and provides real-time predictions through a Flask API integrated with a React Native mobile application.

---

## Features

- Predicts addiction risk (Low / Medium / High)
- Uses LSTM for time-series behavior analysis
- Displays confidence score of predictions
- Real-time communication between app and backend
- Interactive mobile UI with animations
- Synthetic dataset generation for training

---

## Project Architecture

Mobile App (React Native)  
↓  
Flask API (Backend)  
↓  
LSTM Model (Deep Learning)

---

## Project Structure

DL-project/
│
├── train.py                 # Model training script  
├── app.py                   # Flask API backend  
├── model.h5                 # Trained LSTM model  
├── dataset.csv              # Raw dataset  
├── dataset_with_labels.csv  # Labeled dataset  
│
└── addictionApp/            # React Native App  
    ├── app/  
    ├── components/  
    ├── package.json  

---

## Dataset Description

Since real-world smartphone data is restricted, a synthetic dataset is generated with the following features:

- Screen Time  
- Social Media Usage  
- Gaming Time  
- Unlock Count  
- Night Usage  
- Session Duration  

### Risk Calculation

Score =  
(0.3 × Screen Time) +  
(0.2 × Social Media) +  
(0.2 × Gaming) +  
(0.1 × Unlocks) +  
(0.2 × Night Usage)

### Classification Thresholds

| Score Range | Risk Level  |
|------------|------------|
| < 150      | Low Risk   |
| 150 – 299  | Medium Risk|
| ≥ 300      | High Risk  |

---

## Data Preprocessing

- Normalization (0–1 scaling)  
- Feature scaling  
- Conversion into time-series sequences  
- Sliding window approach (3 timesteps)  

Final input shape to model: (3, 6)

---

## Model Architecture

- LSTM Layer (32 units)  
- Dense Layer (16 neurons, ReLU activation)  
- Output Layer (Softmax, 3 classes)  

### Why LSTM?

LSTM is used because it captures temporal dependencies in user behavior, making it ideal for analyzing usage trends over time.

---

## Installation & Setup

### 1. Clone Repository

git clone https://github.com/your-username/your-repo-name.git  
cd your-repo-name  

---

### 2. Setup Backend (Flask + Model)

python -m venv venv  
venv\Scripts\activate  

pip install tensorflow flask numpy pandas scikit-learn  

python train.py  
python app.py  

Server will run at:  
http://127.0.0.1:5000  

---

### 3. Setup Mobile App (React Native)

cd addictionApp  

npm install  

npx expo start  

---

## API Endpoint

POST /predict  

Request:

{
  "features": [
    [120, 60, 30, 80, 20, 5],
    [130, 70, 20, 90, 25, 6],
    [150, 80, 40, 100, 30, 7]
  ]
}

Response:

{
  "risk": 1,
  "confidence": 0.87
}

---

## Model Evaluation

- Accuracy  
- Confusion Matrix  
- ROC Curve  

These metrics evaluate the model’s ability to correctly classify addiction risk levels.

---

## Mobile App Features

- Displays current risk level  
- Shows confidence percentage  
- Visual indicators (Low / Medium / High)  
- Usage statistics (screen time, unlocks, etc.)  
- Interactive UI with animations  

---

## Limitations

- Uses synthetic data (not real user data)  
- Rule-based risk labeling  
- Limited features  
- No direct integration with Digital Wellbeing APIs  

---

## Future Scope

- Integration with real smartphone usage data  
- Advanced models (Transformer, GRU)  
- Personalized predictions  
- Real-time tracking  
- Cloud deployment  

---

## Author

Developed as part of a Deep Learning project.