import json
import numpy as np
import pytest
from services.biometrics import (
    SmartBiometricEngine,
    compare_group_faces_with_scores,
    match_encodings_bipartite,
    verify_liveness
)

@pytest.fixture
def biometric_engine():
    return SmartBiometricEngine()

def test_face_encoding_dimension_and_normalization(biometric_engine):
    # Create synthetic RGB image (120x120x3)
    img = np.ones((120, 120, 3), dtype=np.uint8) * 128
    # Draw simple facial feature region
    img[30:90, 30:90] = 200
    
    locations = [(30, 90, 90, 30)]
    encodings = biometric_engine.face_encodings(img, locations)
    
    assert len(encodings) == 1
    enc = encodings[0]
    assert len(enc) == 128
    # Ensure vector elements are floats
    assert all(isinstance(x, (float, np.floating)) for x in enc)

def test_face_distance_and_comparison(biometric_engine):
    base_vec = [0.1] * 128
    identical_vec = [0.1] * 128
    distant_vec = [0.9] * 128
    
    distances = biometric_engine.face_distance([identical_vec, distant_vec], base_vec)
    assert len(distances) == 2
    assert distances[0] < 0.05
    assert distances[1] > 0.5
    
    matches = biometric_engine.compare_faces([identical_vec, distant_vec], base_vec, tolerance=0.48)
    assert matches[0] is True
    assert matches[1] is False

def test_bipartite_one_to_one_matching_no_duplicate_assignment():
    """
    Test that compare_group_faces_with_scores enforces strict 1-to-1 matching:
    One detected face cannot be assigned to two different students.
    """
    # 2 students in database (known_vectors map roll -> vector)
    known_vectors = {
        "CS001": [0.1] * 128,
        "CS002": [0.12] * 128  # Very similar to student 1
    }
    
    # Only 1 face in the group photo, slightly closer to CS001
    face_1 = [0.09] * 128
    detected_faces = [face_1]
    
    recognized = match_encodings_bipartite(known_vectors, detected_faces, tolerance=0.50)
    
    # Strictly 1 match should occur, never 2 matches for 1 detected face
    assert len(recognized) == 1
    assert "CS001" in recognized
    assert "CS002" not in recognized
    assert recognized["CS001"] > 50.0

def test_verify_liveness_invalid_payload():
    result = verify_liveness(b"not_an_image")
    assert result["is_live"] is False
    assert result["score"] == 0.0
    assert "Invalid image" in result["reason"]

def test_verify_liveness_blank_image():
    # Create black 100x100 image encoded to JPEG bytes
    import cv2
    black_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', black_img)
    
    result = verify_liveness(buffer.tobytes())
    assert result["is_live"] is False
    assert result["score"] < 40.0


def test_validate_face_quality():
    from services.biometrics import validate_face_quality
    # Create valid synthetic face
    valid_face = np.ones((120, 120, 3), dtype=np.uint8) * 128
    box = (10, 110, 110, 10) # 100x100
    is_valid, reason = validate_face_quality(valid_face, box)
    # Brightness should be valid
    assert "Lighting" not in reason

    # Too small face box
    tiny_box = (10, 30, 30, 10) # 20x20
    is_valid_tiny, reason_tiny = validate_face_quality(valid_face, tiny_box)
    assert is_valid_tiny is False
    assert "too small" in reason_tiny.lower()
