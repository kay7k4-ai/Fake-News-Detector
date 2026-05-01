from flask import Flask, request, jsonify, render_template
import pickle
import os

app = Flask(__name__)

model = pickle.load(open("models/model.pkl", "rb"))
vectorizer = pickle.load(open("models/vectorizer.pkl", "rb"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    text = data.get("text", "")

    if len(text.split()) < 5:
        return jsonify({"error": "Please enter at least a full sentence."})

    vec = vectorizer.transform([text])
    prediction = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]

    label = "Real" if prediction == 1 else "Fake"
    confidence = round(max(proba) * 100, 2)

    return jsonify({"label": label, "confidence": confidence})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))