# backend/app/services/anomaly_detector.py

from sklearn.ensemble import IsolationForest
import numpy as np


class AnomalyDetector:
    """
    Uses IsolationForest to detect anomalous exam sessions
    based on behavioral metrics.
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.is_fitted = False

    def fit(self, session_features: list):
        """
        Train the model on historical session features.
        Each feature vector: [event_count, avg_severity_score,
                              time_between_events, score_drops]
        """
        if len(session_features) < 10:
            return  # Need minimum data to train

        X = np.array(session_features)
        self.model.fit(X)
        self.is_fitted = True

    def predict(self, features: list) -> bool:
        """
        Returns True if the session is anomalous.
        """
        if not self.is_fitted:
            return False

        X = np.array([features])
        prediction = self.model.predict(X)
        return prediction[0] == -1  # -1 = anomaly


# Singleton instance
detector = AnomalyDetector()
