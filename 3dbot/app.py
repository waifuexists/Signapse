from flask import Flask, render_template, send_from_directory, Response
import os

app = Flask(__name__)

def get_video_files():
    """Get list of video files from the videos directory"""
    video_files = []
    for file in os.listdir('videos'):
        if file.endswith(('.mp4', '.avi', '.mov')):
            video_files.append(file)
    return video_files

@app.route('/')
def index():
    return render_template('index.html', videos=get_video_files())

@app.route('/videos/<path:filename>')
def serve_video(filename):
    return send_from_directory('videos', filename)

if __name__ == '__main__':
    app.run(debug=True, port=8080) 