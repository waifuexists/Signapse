from flask import Flask, render_template, Response, jsonify, request
import cv2
import numpy as np
import tensorflow as tf
import os
from gtts import gTTS
import time
import google.generativeai as genai
import base64
import threading
from datetime import datetime

app = Flask(__name__)

# Initialize TensorFlow model
try:
    model = tf.keras.models.load_model('C:/Users/adity/Downloads/SIH (3)/SIH/SignCoach/models/signs_detect.h5')
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

# Configure Gemini API
genai.configure(api_key="AIzaSyBmlXofiz94w22DqdAw112RviVNu4EQ9is")

# Global variables
class_labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
default_label = 'None'
CONFIDENCE_THRESHOLD = 0.3

# Camera handling
camera = None
camera_lock = threading.Lock()

def get_camera():
    global camera
    if camera is None:
        camera = cv2.VideoCapture(0)
    return camera

def preprocess_frame(frame):
    frame_resized = cv2.resize(frame, (224, 224))
    frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
    frame_preprocessed = tf.keras.applications.mobilenet.preprocess_input(frame_rgb)
    frame_expanded = np.expand_dims(frame_preprocessed, axis=0)
    return frame_expanded

def predict_frame(frame):
    preprocessed_frame = preprocess_frame(frame)
    predictions = model.predict(preprocessed_frame)
    return predictions

def detect_hand(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_skin, upper_skin)
    mask = cv2.dilate(mask, None, iterations=2)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    return len(contours) > 0

def translate_to_hindi(text):
    prompt = f"Translate the following English sentence to Hindi: '{text}'"
    try:
        response = genai.GenerativeModel("gemini-pro").generate_content(prompt)
        translated_text = response.text.strip()
        return translated_text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def generate_frames():
    while True:
        with camera_lock:
            camera = get_camera()
            success, frame = camera.read()
            if not success:
                break

            frame = cv2.flip(frame, 1)
            predicted_letter = default_label
            confidence = 0

            if detect_hand(frame):
                predictions = predict_frame(frame)
                confidence = np.max(predictions)
                predicted_class = np.argmax(predictions)

                if confidence > CONFIDENCE_THRESHOLD:
                    predicted_letter = class_labels[predicted_class]

            # Add prediction text to frame
            text = f"{predicted_letter} ({confidence:.2f})"
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)

            # Convert frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/speak', methods=['POST'])
def speak():
    text = request.json.get('text', '')
    filename = f"static/audio/word_{int(time.time())}.mp3"
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    tts = gTTS(text=text, lang='en')
    tts.save(filename)
    
    return jsonify({'audio_url': '/' + filename})

@app.route('/translate', methods=['POST'])
def translate():
    text = request.json.get('text', '')
    hindi_text = translate_to_hindi(text)
    filename = f"static/audio/hindi_{int(time.time())}.mp3"
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    tts = gTTS(text=hindi_text, lang='hi')
    tts.save(filename)
    
    return jsonify({
        'translated_text': hindi_text,
        'audio_url': '/' + filename
    })

@app.route('/get_prediction')
def get_prediction():
    with camera_lock:
        camera = get_camera()
        success, frame = camera.read()
        if not success:
            return jsonify({'error': 'Failed to capture frame'})

        frame = cv2.flip(frame, 1)
        if detect_hand(frame):
            predictions = predict_frame(frame)
            confidence = np.max(predictions)
            predicted_class = np.argmax(predictions)

            if confidence > CONFIDENCE_THRESHOLD:
                return jsonify({
                    'letter': class_labels[predicted_class],
                    'confidence': float(confidence)
                })

    return jsonify({'letter': default_label, 'confidence': 0.0})

if __name__ == '__main__':
    app.run(debug=True) 