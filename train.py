import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.utils import resample
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

print("Current working directory:", os.getcwd())

# Load data
fake = pd.read_csv('data/Fake.csv')
true = pd.read_csv('data/True.csv')
print("✅ Files loaded successfully!")

# Label
fake["label"] = 0
true["label"] = 1

# Balance the dataset
min_size = min(len(fake), len(true))
fake = resample(fake, n_samples=min_size, random_state=42)
true = resample(true, n_samples=min_size, random_state=42)

df = pd.concat([fake, true]).sample(frac=1, random_state=42).reset_index(drop=True)

# Use only title for better short-text prediction
df["text"] = df["title"].fillna("") + " " + df["text"].fillna("")
df["text"] = df["text"].str.strip()

X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["label"], test_size=0.2, random_state=42, stratify=df["label"]
)

# Better vectorizer settings
vectorizer = TfidfVectorizer(
    max_features=10000,
    stop_words="english",
    ngram_range=(1, 2),   # catches 2-word phrases too
    sublinear_tf=True     # reduces impact of very common words
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Better model settings
model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced",  # handles any remaining imbalance
    C=1.0
)
model.fit(X_train_vec, y_train)

y_pred = model.predict(X_test_vec)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nDetailed Report:")
print(classification_report(y_test, y_pred, target_names=["Fake", "Real"]))

os.makedirs("models", exist_ok=True)
pickle.dump(model, open("models/model.pkl", "wb"))
pickle.dump(vectorizer, open("models/vectorizer.pkl", "wb"))
print("✅ Model and vectorizer saved successfully!")