"""
Synapse Classifier
TF-IDF + Logistic Regression trained on labeled examples.
Falls back to rule engine if sklearn not available.
"""

from core.logger import get_logger
log = get_logger("synapse.classifier")

# Training data — (query, label)
TRAINING_DATA = [
    # chat
    ("hello how are you", "chat"),
    ("what is the meaning of life", "chat"),
    ("tell me about yourself", "chat"),
    ("who invented the telephone", "chat"),
    ("what happened in world war 2", "chat"),
    ("explain photosynthesis", "chat"),
    ("what is machine learning", "chat"),
    ("can you help me", "chat"),
    ("good morning", "chat"),
    ("what is the capital of france", "chat"),
    ("recommend a book for me", "chat"),
    ("translate this to spanish", "chat"),
    ("summarize this paragraph", "chat"),

    # code
    ("write a python function to sort a list", "code"),
    ("debug this javascript code", "code"),
    ("fix the error in my script", "code"),
    ("how do I use async await in python", "code"),
    ("create a REST API endpoint", "code"),
    ("write a SQL query to join two tables", "code"),
    ("what is the difference between list and tuple", "code"),
    ("implement binary search", "code"),
    ("my code throws a null pointer exception", "code"),
    ("how to install npm packages", "code"),
    ("write a class in typescript", "code"),
    ("create a dockerfile", "code"),
    ("help me with regex pattern", "code"),
    ("write unit tests for this function", "code"),

    # math
    ("solve this equation x squared plus 3x minus 4", "math"),
    ("calculate the derivative of sin x", "math"),
    ("what is the integral of x squared", "math"),
    ("prove that root 2 is irrational", "math"),
    ("find the probability of rolling a 6", "math"),
    ("matrix multiplication example", "math"),
    ("what is the fourier transform", "math"),
    ("solve this linear programming problem", "math"),
    ("calculate compound interest", "math"),
    ("what is bayes theorem", "math"),
    ("find eigenvalues of this matrix", "math"),
    ("simplify this algebraic expression", "math"),

    # vision
    ("what is in this image", "vision"),
    ("describe this photo", "vision"),
    ("analyze this picture", "vision"),
    ("what do you see in this image", "vision"),
    ("read the text in this image", "vision"),
    ("is there a person in this photo", "vision"),
    ("what color is the object in the image", "vision"),
]


class TFIDFClassifier:
    """Lightweight sklearn-based classifier."""

    def __init__(self):
        self.model = None
        self.vectorizer = None
        self._trained = False
        self._try_train()

    def _try_train(self):
        try:
            from sklearn.pipeline import Pipeline
            from sklearn.linear_model import LogisticRegression
            from sklearn.feature_extraction.text import TfidfVectorizer

            X = [q for q, _ in TRAINING_DATA]
            y = [label for _, label in TRAINING_DATA]

            self.pipeline = Pipeline([
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=500)),
                ("clf", LogisticRegression(max_iter=200, C=1.0))
            ])
            self.pipeline.fit(X, y)
            self._trained = True
            log.info("TF-IDF classifier trained successfully")
        except ImportError:
            log.warning("sklearn not installed — TF-IDF classifier unavailable")
        except Exception as e:
            log.warning(f"Classifier training failed: {e}")

    def predict(self, query: str) -> tuple[str, float]:
        """Returns (label, confidence). Falls back to 'chat' if untrained."""
        if not self._trained:
            return "chat", 0.0
        try:
            proba = self.pipeline.predict_proba([query.lower()])[0]
            classes = self.pipeline.classes_
            best_idx = proba.argmax()
            return classes[best_idx], round(float(proba[best_idx]), 3)
        except Exception as e:
            log.warning(f"Classifier predict error: {e}")
            return "chat", 0.0

    @property
    def is_available(self) -> bool:
        return self._trained
