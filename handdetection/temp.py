import cv2
import numpy as np
import tensorflow as tf
import os
from gtts import gTTS
import pygame
import time
from translate import Translator  # ✅ New translation library

pygame.mixer.init()

# ✅ Load the sign language model
try:
    model = tf.keras.models.load_model('SignCoach/models/signs_detect.h5')
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

cap = cv2.VideoCapture(0)  

CONFIDENCE_THRESHOLD = 0.3  

class_labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
default_label = 'None' 
predicted_letter = None  
stored_word = []  

cv2.namedWindow('Stored Word', cv2.WINDOW_NORMAL)
cv2.resizeWindow('Stored Word', 400, 100) 

# ✅ Offline English to Hindi translator
translator = Translator(to_lang="hi")

# ✅ Function to translate English to Hindi
def translate_to_hindi(text):
    try:
        translated_text = translator.translate(text)
        return translated_text.strip()  # Ensure no extra spaces
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Fallback to original text if translation fails

# ✅ Function to speak text using gTTS
def speak_text(text, lang="en"):
    filename = f"word_{int(time.time())}.mp3"
    tts = gTTS(text=text, lang=lang)
    tts.save(filename)

    pygame.mixer.music.stop()
    pygame.mixer.music.unload()
    pygame.mixer.music.load(filename)
    pygame.mixer.music.play()

    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)

    time.sleep(1)

    if os.path.exists(filename):
        try:
            os.remove(filename)
        except PermissionError as e:
            print(f"Error removing file: {e}")

# ✅ Preprocess frame for model prediction
def preprocess_frame(frame):
    frame_resized = cv2.resize(frame, (224, 224))
    frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
    frame_preprocessed = tf.keras.applications.mobilenet.preprocess_input(frame_rgb)
    frame_expanded = np.expand_dims(frame_preprocessed, axis=0)
    return frame_expanded

# ✅ Predict sign language from frame
def predict_frame(frame):
    preprocessed_frame = preprocess_frame(frame)
    predictions = model.predict(preprocessed_frame)
    return predictions

# ✅ Detect hand in the frame
def detect_hand(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_skin, upper_skin)
    mask = cv2.dilate(mask, None, iterations=2)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)

    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    return len(contours) > 0

# ✅ Main loop for sign detection
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    if detect_hand(frame):
        predictions = predict_frame(frame)
        confidence = np.max(predictions)
        predicted_class = np.argmax(predictions)

        if confidence > CONFIDENCE_THRESHOLD:
            label = class_labels[predicted_class]
            predicted_letter = label 
        else:
            label = default_label

        text = f"{label} ({confidence:.2f})"
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
    else:
        text = "None"
        predicted_letter = None 
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)

    cv2.imshow('Sign Language Detection', frame)

    key = cv2.waitKey(1)
    
    if key & 0xFF == ord('z'):  # Press 'Z' to add detected letter to stored word
        if predicted_letter is not None and predicted_letter != default_label:
            stored_word.append(predicted_letter)

    if key & 0xFF == ord('s'):  # Press 'S' to speak stored word in English
        if stored_word:
            word_str = ''.join(stored_word)
            speak_text(word_str, lang="en")
            stored_word = []

    if key & 0xFF == ord('h'):  # Press 'H' to translate and speak in Hindi
        if stored_word:
            word_str = ''.join(stored_word)  # Convert stored letters to a full word/sentence
            hindi_translation = translate_to_hindi(word_str)  # Translate offline
            
            print(f"Translated: {hindi_translation}")  # Print the translation for debugging
            speak_text(hindi_translation, lang="hi")  # Speak the Hindi text

    if key & 0xFF == ord('q'):  # Press 'Q' to clear stored word
        stored_word = [] 
        cv2.destroyWindow('Stored Word')  
        cv2.namedWindow('Stored Word', cv2.WINDOW_NORMAL) 
        cv2.resizeWindow('Stored Word', 400, 100) 

    if key & 0xFF == ord('x'):  # Press 'X' to add space between words
        stored_word.append(" ")

    accumulated_text = ''.join(stored_word)
    blank_img = np.zeros((100, 400, 3), dtype=np.uint8) 
    cv2.putText(blank_img, accumulated_text, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.imshow('Stored Word', blank_img)

cap.release()
cv2.destroyAllWindows()
