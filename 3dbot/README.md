# Video Language Translator

This web application allows you to speak words and see corresponding videos play in sequence. It uses speech recognition to convert your speech to text and matches the words with available video files.

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

3. Create a `videos` folder in the project root directory and add your video files (supported formats: .mp4, .avi, .mov)

4. Run the application:
```bash
python app.py
```

5. Open your web browser and navigate to `http://localhost:5000`

## Usage

1. Click the "Start Recording" button to begin recording your speech
2. Speak the words that correspond to your video filenames
3. Click "Stop Recording" when you're done
4. The application will:
   - Show the transcribed text
   - Play the matching videos in sequence
   - Automatically move to the next video when one finishes

## Video Naming Convention

Name your video files according to the words you want to speak. For example:
- `hello.mp4` - will play when you say "hello"
- `world.mp4` - will play when you say "world"

When you say "hello world", both videos will play in sequence.

## Requirements

- Python 3.7+
- Modern web browser with JavaScript enabled
- Microphone access
- Video files in supported formats (.mp4, .avi, .mov) 