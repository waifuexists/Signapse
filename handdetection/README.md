# SignCoach - Sign Language Detection Web App

A web-based sign language detection application that uses computer vision and machine learning to recognize hand signs and convert them to text. The application supports text-to-speech and Hindi translation features.

## Features

- Real-time sign language detection using webcam
- Text-to-speech conversion
- Hindi translation with audio
- Modern web interface
- Keyboard shortcuts for quick actions
- Confidence score display for predictions

## Requirements

- Python 3.8 or higher
- Webcam
- Internet connection (for translation services)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Start the Flask server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Controls:
   - Press 'Z' or click "Add Letter" to add the current detected letter
   - Press 'X' or click "Add Space" to add a space
   - Press 'S' or click "Speak" to hear the current word
   - Press 'H' or click "Translate to Hindi" to translate and hear in Hindi
   - Press 'Q' or click "Clear" to clear the current word

## Model

The application uses a pre-trained TensorFlow model (`models/signs_detect.h5`) for sign language detection. The model is trained to recognize American Sign Language (ASL) alphabet signs. 