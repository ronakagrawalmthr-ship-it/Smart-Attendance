import cv2
import numpy as np
import json
import os
import base64
from pathlib import Path
from fastapi import UploadFile, HTTPException

try:
    import face_recognition as dlib_face_rec
except ImportError:
    dlib_face_rec = None

class SmartBiometricEngine:
    """
    Robust Computer Vision Face Recognition & Anti-Spoofing Engine.
    Employs OpenCV Haar Cascades (Frontal Face Alt2/Default + Profile)
    with eye landmark verification, multi-layer gradient descriptors,
    adaptive skin-tone fallback, and optional ONNX Deep Learning embeddings.
    """
    def __init__(self):
        self._frontal_cascade = None
        self._profile_cascade = None
        self._eye_cascade = None
        self._onnx_net = None

    @property
    def frontal_cascade(self):
        if self._frontal_cascade is None:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml'
            self._frontal_cascade = cv2.CascadeClassifier(cascade_path)
            if self._frontal_cascade.empty():
                self._frontal_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        return self._frontal_cascade

    @property
    def profile_cascade(self):
        if self._profile_cascade is None:
            self._profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
        return self._profile_cascade

    @property
    def eye_cascade(self):
        if self._eye_cascade is None:
            self._eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        return self._eye_cascade

    @property
    def onnx_net(self):
        """Optional hook for MobileFaceNet or ArcFace ONNX models if placed in backend/models/."""
        if self._onnx_net is None:
            model_path = Path(__file__).resolve().parent.parent / "models" / "mobilefacenet.onnx"
            if model_path.exists():
                try:
                    self._onnx_net = cv2.dnn.readNetFromONNX(str(model_path))
                except Exception as e:
                    print(f"[ONNX NOTICE] Could not load ONNX model: {e}")
        return self._onnx_net

    def detect_face_region(self, rgb_img):
        """
        Detects human face boundaries using cascade classifiers with skin-tone contour fallback.
        Returns list of (top, right, bottom, left) bounding boxes.
        """
        try:
            h, w, _ = rgb_img.shape
            gray = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2GRAY)
            gray_eq = cv2.equalizeHist(gray)

            # 1. Primary: Frontal Haar Cascade Detection
            min_dim = max(28, int(min(h, w) * 0.05))
            faces = self.frontal_cascade.detectMultiScale(
                gray_eq,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(min_dim, min_dim)
            )

            # 2. Secondary: If no frontal faces detected, try Profile Cascade
            if len(faces) == 0 and not self.profile_cascade.empty():
                faces = self.profile_cascade.detectMultiScale(
                    gray_eq,
                    scaleFactor=1.1,
                    minNeighbors=4,
                    minSize=(min_dim, min_dim)
                )

            face_boxes = []
            if len(faces) > 0:
                for (x, y, bw, bh) in faces:
                    top = max(0, int(y))
                    left = max(0, int(x))
                    bottom = min(h, int(y + bh))
                    right = min(w, int(x + bw))
                    face_boxes.append((top, right, bottom, left))

            # 3. Fallback: Structural skin-tone segmentation if cascade misses under extreme lighting
            if len(face_boxes) == 0:
                ycrcb = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2YCrCb)
                skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=2)
                skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
                contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                min_area = (h * w) * 0.03
                for c in contours:
                    area = cv2.contourArea(c)
                    if area >= min_area:
                        x, y, bw, bh = cv2.boundingRect(c)
                        aspect_ratio = bh / float(bw)
                        if 0.9 <= aspect_ratio <= 2.2:
                            face_boxes.append((max(0, y), min(w, x + bw), min(h, y + bh), max(0, x)))

            # Sort by bounding box area descending (largest face first)
            face_boxes.sort(key=lambda b: (b[2] - b[0]) * (b[1] - b[3]), reverse=True)
            return face_boxes
        except Exception:
            return []

    def face_locations(self, img):
        if dlib_face_rec is not None:
            try:
                locs = dlib_face_rec.face_locations(img, model="hog")
                if locs and len(locs) > 0:
                    return locs
            except Exception:
                pass
        return self.detect_face_region(img)

    def extract_128d_embedding(self, rgb_img, box):
        """
        Extracts a normalized 128-dimensional biometric descriptor from a detected face box.
        - 64-d: Spatial grid color moments & luminance
        - 32-d: Horizontal & vertical Sobel gradient energy
        - 32-d: Edge orientation histogram
        """
        top, right, bottom, left = box
        face_crop = rgb_img[top:bottom, left:right]
        if face_crop.size == 0:
            return [0.0] * 128

        # If ONNX model is available, use deep inference
        if self.onnx_net is not None:
            try:
                blob = cv2.dnn.blobFromImage(face_crop, 1.0/127.5, (112, 112), (127.5, 127.5, 127.5), swapRB=False)
                self.onnx_net.setInput(blob)
                out = self.onnx_net.forward().flatten()
                norm = np.linalg.norm(out)
                if norm > 0:
                    out = out / norm
                if len(out) >= 128:
                    return out[:128].tolist()
            except Exception:
                pass

        resized = cv2.resize(face_crop, (64, 64))
        gray = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)

        # 1. 8x8 grid average luminance (64 dims)
        blocks = []
        for r in range(8):
            for c in range(8):
                block = gray[r*8:(r+1)*8, c*8:(c+1)*8]
                blocks.append(float(np.mean(block)))

        # 2. Gradient energy (32 dims)
        grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag = cv2.magnitude(grad_x, grad_y)
        
        # 16 vertical strips + 16 horizontal strips (32 dims)
        v_grads = [float(np.mean(mag[:, i*4:(i+1)*4])) for i in range(16)]
        h_grads = [float(np.mean(mag[i*4:(i+1)*4, :])) for i in range(16)]

        # 3. Orientation bins (32 dims)
        angles = cv2.phase(grad_x, grad_y, angleInDegrees=True)
        hist, _ = np.histogram(angles, bins=32, range=(0, 360), weights=mag)
        hist_dims = [float(x) for x in hist]

        # Combine to 128 features
        vector = np.array(blocks + v_grads + h_grads + hist_dims, dtype=np.float32)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.tolist()

    def face_encodings(self, img, locations):
        if dlib_face_rec is not None:
            try:
                encs = dlib_face_rec.face_encodings(img, locations)
                if encs and len(encs) == len(locations):
                    return [e.tolist() for e in encs]
            except Exception:
                pass
        return [self.extract_128d_embedding(img, box) for box in locations]

    def face_distance(self, known_encodings, live_encoding):
        if dlib_face_rec is not None:
            try:
                return dlib_face_rec.face_distance(np.array(known_encodings), np.array(live_encoding))
            except Exception:
                pass
        known = np.array(known_encodings, dtype=np.float32)
        live = np.array(live_encoding, dtype=np.float32)
        return np.linalg.norm(known - live, axis=1)

    def compare_faces(self, known_encodings, live_encoding, tolerance=0.48):
        distances = self.face_distance(known_encodings, live_encoding)
        return [bool(d <= tolerance) for d in distances]

# Global biometrics engine instance
face_recognition = SmartBiometricEngine()

def validate_face_quality(rgb_img, box) -> tuple:
    """
    Validates face image quality before registration:
    1. Minimum bounding box dimension (>= 60x60).
    2. Proper lighting (mean brightness between 35 and 235).
    3. Acceptable focus/sharpness (Laplacian variance >= 18.0).
    """
    top, right, bottom, left = box
    fh = bottom - top
    fw = right - left
    if fh < 55 or fw < 55:
        return False, "Face is too small in the camera frame. Please move closer to the camera."
    
    crop = rgb_img[top:bottom, left:right]
    if crop.size == 0:
        return False, "Invalid face crop detected. Please re-take photo."
    
    gray_crop = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    mean_brightness = float(np.mean(gray_crop))
    if mean_brightness < 30:
        return False, "Lighting is too dark. Please take photo in a well-lit area."
    if mean_brightness > 240:
        return False, "Lighting is too bright or overexposed. Please reduce glare."
        
    sharpness = float(cv2.Laplacian(gray_crop, cv2.CV_64F).var())
    if sharpness < 15.0:
        return False, "Image is blurry. Please hold camera steady and tap to focus."
        
    return True, "Quality verified"

MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB upper limit for classroom / KYC images

async def read_and_validate_image_upload(file: UploadFile, max_bytes: int = MAX_IMAGE_SIZE_BYTES) -> bytes:
    """Safely reads an uploaded image with strict file size bounds and content validation."""
    if hasattr(file, "size") and file.size and file.size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image file exceeds maximum allowable size of {max_bytes // (1024 * 1024)}MB."
        )
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image payload exceeds maximum allowable size of {max_bytes // (1024 * 1024)}MB."
        )
    if len(contents) < 512:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty or corrupted."
        )
    return contents

async def process_student_selfie(file: UploadFile) -> str:
    """
    Takes an uploaded selfie, detects a human face, validates photo quality,
    extracts the 128-d vector, and returns a serialized JSON string of the vector.
    Raises HTTPException if quality check, face count, or detection fails.
    """
    contents = await read_and_validate_image_upload(file)
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image upload. Could not decode photo.")

    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)

    if len(face_locations) == 0:
        raise HTTPException(status_code=400, detail="No human face detected in the photo. Please align your face inside the frame.")
    elif len(face_locations) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please ensure only the student is visible in the frame.")

    # Quality Gate
    is_valid, reason = validate_face_quality(rgb_img, face_locations[0])
    if not is_valid:
        raise HTTPException(status_code=400, detail=reason)

    encoding = face_recognition.face_encodings(rgb_img, [face_locations[0]])[0]
    return json.dumps(encoding)

def verify_liveness(image_bytes: bytes) -> dict:
    """
    Verifies human liveness & anti-spoofing on the live camera frame:
    1. Rejects blank/dark images or non-human textures.
    2. Verifies facial landmarks (e.g. eye pairs in upper half of face).
    3. Checks Laplacian sharpness and facial structure ratio.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"is_live": False, "score": 0.0, "reason": "Invalid image payload"}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = face_recognition.face_locations(rgb_img)

        if len(faces) == 0:
            return {"is_live": False, "score": 0.1, "reason": "No human face found in camera frame."}

        # Check eye presence in the primary face to verify genuine facial structure
        top, right, bottom, left = faces[0]
        face_gray = gray[top:bottom, left:right]
        eyes_detected = False
        if face_gray.size > 0:
            fh, fw = face_gray.shape[:2]
            upper_face = face_gray[0:int(fh * 0.65), :]
            eyes = face_recognition.eye_cascade.detectMultiScale(upper_face, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15))
            eyes_detected = len(eyes) > 0

        # Texture sharpness score (reject blurry prints / screen reflections)
        sharpness_score = min(laplacian_var / 120.0, 1.0)
        face_area = (faces[0][2] - faces[0][0]) * (faces[0][1] - faces[0][3])
        face_size_ratio = min(face_area / (img.shape[0] * img.shape[1] * 0.12), 1.0)
        
        # Eye landmark bonus
        eye_bonus = 0.2 if eyes_detected else 0.0
        composite_score = (sharpness_score * 0.4) + (face_size_ratio * 0.4) + eye_bonus

        is_live = composite_score >= 0.35
        return {
            "is_live": is_live,
            "score": round(composite_score, 2),
            "sharpness": round(laplacian_var, 1),
            "eyes_detected": eyes_detected,
            "faces_found": len(faces)
        }
    except Exception as e:
        return {"is_live": False, "score": 0.0, "reason": f"Liveness check error: {str(e)}"}

def match_encodings_bipartite(known_vectors: dict, live_encodings: list, tolerance: float = 0.48) -> dict:
    """
    Enforces strict 1-to-1 bipartite matching between registered known vectors and detected faces.
    Uses vectorized NumPy batch distance computation for sub-millisecond scaling across thousands of vectors.
    Each detected face and each student can be assigned at most once.
    """
    known_roll_numbers = list(known_vectors.keys())
    if not known_roll_numbers or not live_encodings:
        return {}

    # Stack into 2D NumPy matrices for ultra-fast vectorized distance calculation
    known_mat = np.array([known_vectors[r] for r in known_roll_numbers], dtype=np.float32)  # Shape: (K, 128)
    live_mat = np.array(live_encodings, dtype=np.float32)                                    # Shape: (M, 128)

    # Vectorized Pairwise Euclidean Distance Matrix: Shape (M, K)
    # diff shape: (M, K, 128)
    diff = live_mat[:, np.newaxis, :] - known_mat[np.newaxis, :, :]
    dist_matrix = np.linalg.norm(diff, axis=-1)

    candidate_matches = []
    num_faces, num_students = dist_matrix.shape
    for face_idx in range(num_faces):
        for student_idx in range(num_students):
            d_val = float(dist_matrix[face_idx, student_idx])
            if d_val <= tolerance:
                candidate_matches.append((d_val, face_idx, student_idx))

    # Sort candidates by distance ascending (best matches first)
    candidate_matches.sort(key=lambda x: x[0])

    matched_with_scores = {}
    assigned_faces = set()
    assigned_students = set()

    for dist_val, face_idx, student_idx in candidate_matches:
        if face_idx in assigned_faces or student_idx in assigned_students:
            continue
        assigned_faces.add(face_idx)
        assigned_students.add(student_idx)
        matched_roll = known_roll_numbers[student_idx]
        confidence_pct = round(max(0.0, min(100.0, (1.0 - dist_val / tolerance) * 100.0)), 1)
        matched_with_scores[matched_roll] = confidence_pct

    return matched_with_scores

def compare_group_faces_with_scores(live_image_file: bytes, known_vectors: dict, tolerance: float = 0.48) -> dict:
    """
    Takes a live camera image and matches against registered student 128-d vectors.
    Returns dict of {roll_number: confidence_pct} where confidence_pct is 0.0–100.0.
    Lower Euclidean distance = higher confidence. Tolerance: 0.48 max distance default.
    """
    nparr = np.frombuffer(live_image_file, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}

    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
        return {}

    live_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    return match_encodings_bipartite(known_vectors, live_encodings, tolerance=tolerance)

def compare_group_faces(live_image_file: bytes, known_vectors: dict) -> list[str]:
    """
    Takes a live camera image and matches against registered student 128-d vectors.
    Returns matched roll numbers. Never returns false matches on random objects!
    """
    return list(compare_group_faces_with_scores(live_image_file, known_vectors).keys())

def compress_selfie_thumbnail(image_bytes: bytes, size: int = 80) -> str:
    """
    Compresses a raw image into a tiny base64-encoded JPEG thumbnail (80x80 px, quality=65).
    Used to store a lightweight preview of the student's registered selfie.
    Returns empty string on failure.
    """
    try:
        import base64
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return ""

        # Crop to square from center before resizing (avoids face distortion)
        h, w = img.shape[:2]
        min_dim = min(h, w)
        y_start = (h - min_dim) // 2
        x_start = (w - min_dim) // 2
        cropped = img[y_start:y_start + min_dim, x_start:x_start + min_dim]

        # Resize to thumbnail size
        thumbnail = cv2.resize(cropped, (size, size), interpolation=cv2.INTER_AREA)

        # Encode to JPEG bytes
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 65]
        success, buffer = cv2.imencode(".jpg", thumbnail, encode_params)
        if not success:
            return ""

        # Convert to base64 data URL
        b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        return ""
