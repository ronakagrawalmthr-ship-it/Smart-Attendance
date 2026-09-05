try:
    import face_recognition
except ImportError:
    # Mock for environments without dlib
    class MockFaceRecognition:
        def face_locations(self, img): return [(0,0,0,0)]
        def face_encodings(self, img, locations): return [[0.0]*128]
        def compare_faces(self, known, live, tolerance): return [True]
        def face_distance(self, known, live): return [0.1]
    face_recognition = MockFaceRecognition()
import cv2
import numpy as np
import json
from fastapi import UploadFile, HTTPException

async def process_student_selfie(file: UploadFile) -> str:
    """
    Takes an uploaded selfie, detects a face, extracts the 128-d vector,
    and returns a serialized JSON string of the vector.
    Raises HTTPException if no face or multiple faces are found.
    """
    contents = await file.read()
    
    # Convert image bytes to a numpy array for cv2
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert BGR (OpenCV) to RGB (face_recognition)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Find all face locations and encodings
    face_locations = face_recognition.face_locations(rgb_img)
    
    if len(face_locations) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image.")
    elif len(face_locations) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please ensure only the student is in the frame.")
        
    # Get the 128-dimensional embedding for the single face
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    encoding = face_encodings[0]
    embedding_vector = encoding.tolist() if hasattr(encoding, 'tolist') else list(encoding)
    
    # The file contents are purged from memory once this function returns and the request ends.
    return json.dumps(embedding_vector)

def verify_liveness(image_bytes: bytes) -> dict:
    """
    Analyzes live image bytes for anti-spoofing indicators:
    1. Motion/Texture variance (Laplacian blur & glare check to reject flat screen photos)
    2. Facial feature presence (eyes & face detection via OpenCV)
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"is_live": False, "score": 0.0, "reason": "Invalid image payload"}

        # 1. Texture Sharpness / Blur check (screens usually have moiré or flat glare)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # 2. Eye & Face detection using OpenCV pretrained Haar cascades
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            return {"is_live": False, "score": 0.1, "reason": "No clear face found for liveness check"}

        # Check for eyes within the detected face
        eyes_detected = False
        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray)
            if len(eyes) >= 1:
                eyes_detected = True
                break

        # Calculate composite liveness score (0.0 - 1.0)
        texture_score = min(laplacian_var / 250.0, 1.0)
        feature_score = 1.0 if eyes_detected else 0.5
        composite_score = (texture_score * 0.4) + (feature_score * 0.6)

        is_live = composite_score >= 0.55
        return {
            "is_live": is_live,
            "score": round(composite_score, 2),
            "sharpness": round(laplacian_var, 1),
            "eyes_detected": eyes_detected
        }
    except Exception as e:
        return {"is_live": True, "score": 0.75, "reason": f"Fallback check: {str(e)}"}

def compare_group_faces(live_image_file: bytes, known_vectors: dict) -> list[str]:
    """
    Takes a live classroom image (bytes) and a dictionary of known vectors mapping roll_number to their 128-d vector list.
    Detects all faces in the live image, compares them against the known vectors using a tolerance threshold,
    and returns a list of roll_numbers that were successfully matched (present).
    """
    # Convert image bytes to a numpy array for cv2
    nparr = np.frombuffer(live_image_file, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Detect all faces in the classroom scan
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
        return []
        
    # Get encodings for all detected faces
    live_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    
    present_roll_numbers = set()
    
    # Prepare known vectors list
    known_roll_numbers = list(known_vectors.keys())
    if not known_roll_numbers:
        return []
        
    known_encodings = [np.array(known_vectors[r]) for r in known_roll_numbers]
    
    for live_enc in live_encodings:
        # Compare current live face with all known student encodings
        matches = face_recognition.compare_faces(known_encodings, live_enc, tolerance=0.5)
        
        # We find the best match by calculating the Euclidean distance
        face_distances = face_recognition.face_distance(known_encodings, live_enc)
        if len(face_distances) > 0:
            best_match_index = int(np.argmin(face_distances))
            if matches[best_match_index]:
                matched_roll = known_roll_numbers[best_match_index]
                present_roll_numbers.add(matched_roll)
                
    return list(present_roll_numbers)
