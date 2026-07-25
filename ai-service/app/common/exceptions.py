

class InvalidImageError(Exception):
    """Raised when the uploaded file is not a valid image."""

class PredictionError(Exception):
    """Raised when prediction fails."""

class InvalidDetectionImageError(ValueError):
    """Raised when the provided file is not a valid image."""