import cv2
import numpy as np
from pathlib import Path
import time
import pygame
import threading
import queue
import subprocess
import os

class VideoPlayer:
    def __init__(self):
        # Initialize dictionaries first
        self.sign_videos = {}
        self.sign_caps = {}  # Dictionary to store pre-loaded video captures
        self.last_sign_frames = {}  # Store the last valid sign frame for each word
        
        self.main_video_path = "main_video/VIDEO-2025-04-01-22-11-18.mp4"
        self.sign_videos_dir = Path(".")
        self.load_sign_videos()
        
        # Initialize pygame for audio
        pygame.mixer.init()
        
        # Create single window
        cv2.namedWindow('Video with Sign Language', cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
        
        # Set window size
        cv2.resizeWindow('Video with Sign Language', 800, 600)
        
        # Caption words and timing
        self.caption_words = ["i", "can", "talk", "with", "my", "deaf", "friend", "this", "year", "thankyou", "signapse", "i", "want", "to", "talk", "with", "friend"]
        self.word_duration = 0.8  # Duration for each word in seconds
        self.current_word_index = 0
        self.last_word_change = time.time()
        
        # Running state
        self.running = True
        self.video_finished = False
        self.audio_process = None
        
        # Sign language overlay position and size
        self.sign_width = 200  # Increased size
        self.sign_height = 150  # Increased size
        self.margin = 20  # Increased margin
        
        # Video timing
        self.video_start_time = None
        self.total_video_duration = 0
        self.frame_count = 0
        self.total_frames = 0
        
        # Store the last valid frame
        self.last_valid_frame = None
        
    def load_sign_videos(self):
        # Load all sign language videos
        for video_file in self.sign_videos_dir.glob("*.mp4"):
            if video_file.name != "VIDEO-2025-04-01-22-11-18.mp4":
                word = video_file.stem
                self.sign_videos[word] = str(video_file)
                # Pre-load the video capture
                self.sign_caps[word] = cv2.VideoCapture(str(video_file))
                # Initialize last frame storage for this word
                self.last_sign_frames[word] = None
                # Pre-load first frame
                ret, frame = self.sign_caps[word].read()
                if ret:
                    self.last_sign_frames[word] = frame
                    self.last_valid_frame = frame
                self.sign_caps[word].set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    def overlay_sign_video(self, main_frame, sign_cap, word):
        # Try to read a new frame
        ret, sign_frame = sign_cap.read()
        
        # If we can't read a new frame, try to reset and read again
        if not ret:
            sign_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, sign_frame = sign_cap.read()
        
        # If we have a valid frame, store it
        if ret:
            self.last_sign_frames[word] = sign_frame
            self.last_valid_frame = sign_frame
        # If we don't have a valid frame but have a stored one, use it
        elif self.last_sign_frames[word] is not None:
            sign_frame = self.last_sign_frames[word]
            ret = True
        elif self.last_valid_frame is not None:
            sign_frame = self.last_valid_frame
            ret = True
        
        if ret:
            # Get frame dimensions
            frame_height, frame_width = main_frame.shape[:2]
            
            # Calculate position for bottom right corner
            sign_x = frame_width - self.sign_width - self.margin
            sign_y = frame_height - self.sign_height - self.margin
            
            # Resize sign language video
            sign_frame = cv2.resize(sign_frame, (self.sign_width, self.sign_height))
            
            # Create a semi-transparent overlay
            overlay = main_frame.copy()
            cv2.rectangle(overlay, 
                         (sign_x, sign_y), 
                         (sign_x + self.sign_width, sign_y + self.sign_height), 
                         (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.3, main_frame, 0.7, 0, main_frame)
            
            # Overlay the sign language video
            main_frame[sign_y:sign_y + self.sign_height, 
                      sign_x:sign_x + self.sign_width] = sign_frame
            
            # Add a border around the sign language video
            cv2.rectangle(main_frame, 
                         (sign_x, sign_y), 
                         (sign_x + self.sign_width, sign_y + self.sign_height), 
                         (255, 255, 255), 1)
    
    def play_audio(self):
        # Use ffplay to play the video with audio
        try:
            self.audio_process = subprocess.Popen(['ffplay', '-nodisp', '-autoexit', self.main_video_path])
            self.audio_process.wait()  # Wait for the process to finish
            self.video_finished = True
        except Exception as e:
            print(f"Error playing audio: {e}")
    
    def handle_key_press(self, key):
        if key == ord('q'):  # Quit
            self.running = False
        elif key == ord('r'):  # Restart
            self.restart_video()
        elif key == ord('f'):  # Fullscreen
            cv2.setWindowProperty('Video with Sign Language', cv2.WND_PROP_FULLSCREEN, 
                                cv2.WINDOW_FULLSCREEN)
        elif key == ord('s'):  # Small window
            cv2.setWindowProperty('Video with Sign Language', cv2.WND_PROP_FULLSCREEN, 
                                cv2.WINDOW_NORMAL)
    
    def restart_video(self):
        # Reset video state
        self.current_word_index = 0
        self.last_word_change = time.time()
        self.video_finished = False
        self.video_start_time = time.time()
        self.frame_count = 0
        
        # Reset all sign language videos to start
        for word, cap in self.sign_caps.items():
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            # Pre-load first frame for each word
            ret, frame = cap.read()
            if ret:
                self.last_sign_frames[word] = frame
                self.last_valid_frame = frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        
        # Kill existing audio process if any
        if self.audio_process:
            self.audio_process.terminate()
            self.audio_process = None
        
        # Start new audio thread
        self.audio_thread = threading.Thread(target=self.play_audio)
        self.audio_thread.daemon = True
        self.audio_thread.start()
    
    def play_videos(self):
        # Start initial audio playback
        self.restart_video()
        
        # Open main video
        main_cap = cv2.VideoCapture(self.main_video_path)
        if not main_cap.isOpened():
            print("Error: Could not open main video")
            return
        
        # Get main video properties
        main_fps = main_cap.get(cv2.CAP_PROP_FPS)
        frame_delay = 1 / main_fps
        self.total_frames = int(main_cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.total_video_duration = self.total_frames / main_fps
        
        # Calculate total duration needed for all words
        total_words_duration = len(self.caption_words) * self.word_duration
        
        # Adjust word duration if needed to fit all words
        if total_words_duration > self.total_video_duration:
            self.word_duration = self.total_video_duration / len(self.caption_words)
        
        # Pre-calculate word timings
        word_timings = []
        current_time = 0
        for i in range(len(self.caption_words)):
            word_timings.append((i, current_time, current_time + self.word_duration))
            current_time += self.word_duration
        
        while self.running:
            # Read main video frame
            ret, main_frame = main_cap.read()
            if not ret:
                if not self.video_finished:
                    main_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, main_frame = main_cap.read()
                else:
                    # Show last frame when video is finished
                    main_cap.set(cv2.CAP_PROP_POS_FRAMES, self.total_frames - 1)
                    ret, main_frame = main_cap.read()
            
            # Always show sign language
            if self.last_valid_frame is not None:
                # Calculate current video time based on frame count
                self.frame_count += 1
                current_video_time = self.frame_count / main_fps
                
                # Find the current word based on timing
                current_word_index = None
                for word_index, start_time, end_time in word_timings:
                    if start_time <= current_video_time < end_time:
                        current_word_index = word_index
                        break
                
                # Update word if needed
                if current_word_index is not None and current_word_index != self.current_word_index:
                    self.current_word_index = current_word_index
                
                # Overlay current sign language video
                if self.current_word_index < len(self.caption_words):
                    current_word = self.caption_words[self.current_word_index]
                    if current_word in self.sign_caps:
                        self.overlay_sign_video(main_frame, self.sign_caps[current_word], current_word)
                # If we're past the last word, keep showing the last valid frame
                elif self.last_valid_frame is not None:
                    # Get frame dimensions
                    frame_height, frame_width = main_frame.shape[:2]
                    
                    # Calculate position for bottom right corner
                    sign_x = frame_width - self.sign_width - self.margin
                    sign_y = frame_height - self.sign_height - self.margin
                    
                    # Resize the last valid frame
                    sign_frame = cv2.resize(self.last_valid_frame, (self.sign_width, self.sign_height))
                    
                    # Create a semi-transparent overlay
                    overlay = main_frame.copy()
                    cv2.rectangle(overlay, 
                                (sign_x, sign_y), 
                                (sign_x + self.sign_width, sign_y + self.sign_height), 
                                (0, 0, 0), -1)
                    cv2.addWeighted(overlay, 0.3, main_frame, 0.7, 0, main_frame)
                    
                    # Overlay the sign language video
                    main_frame[sign_y:sign_y + self.sign_height, 
                            sign_x:sign_x + self.sign_width] = sign_frame
                    
                    # Add a border around the sign language video
                    cv2.rectangle(main_frame, 
                                (sign_x, sign_y), 
                                (sign_x + self.sign_width, sign_y + self.sign_height), 
                                (255, 255, 255), 1)
            
            # Display combined frame
            cv2.imshow('Video with Sign Language', main_frame)
            
            # Handle key presses
            key = cv2.waitKey(int(frame_delay * 1000)) & 0xFF
            self.handle_key_press(key)
            
            # Check if window was closed
            if cv2.getWindowProperty('Video with Sign Language', cv2.WND_PROP_VISIBLE) < 1:
                self.running = False
                break
        
        # Cleanup
        main_cap.release()
        for cap in self.sign_caps.values():
            cap.release()
        if self.audio_process:
            self.audio_process.terminate()
        pygame.mixer.quit()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    player = VideoPlayer()
    player.play_videos() 