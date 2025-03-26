from flask import Flask, render_template, request, jsonify
import json
import os
import numpy as np
import wave
import struct

app = Flask(__name__)

class IntervalTimer:
    def __init__(self):
        self.sections = []
        self.templates = {
            "Male Exercise Class": [("Exercise", 60), ("Exercise", 60), ("Rest", 30)],
            "Pulmonary Rehab Class": [("Exercise", 45), ("Exercise", 45), ("Rest", 30)]
        }
        self.create_sounds()

    def create_sounds(self):
        for filename, freq, dur in [("static/beep.wav", 1000, 0.5), ("static/start.wav", 800, 0.3)]:
            if not os.path.exists(filename):
                sample_rate = 44100
                samples = np.sin(2 * np.pi * freq * np.arange(sample_rate * dur) / sample_rate)
                samples = (samples * 32767).astype(np.int16)
                with wave.open(filename, "w") as f:
                    f.setnchannels(1)
                    f.setsampwidth(2)
                    f.setframerate(sample_rate)
                    for sample in samples:
                        f.writeframes(struct.pack("h", sample))

timer = IntervalTimer()

@app.route('/')
def index():
    return render_template('index.html', templates=timer.templates.keys())

@app.route('/add_section', methods=['POST'])
def add_section():
    data = request.json
    try:
        duration = int(data['duration'])
        section_type = data['section_type']
        if duration > 0:
            timer.sections.append((section_type, duration))
            return jsonify({'success': True, 'section': f"{section_type} - {duration}s"})
        return jsonify({'success': False, 'error': 'Invalid duration'})
    except:
        return jsonify({'success': False, 'error': 'Invalid input'})

@app.route('/delete_section', methods=['POST'])
def delete_section():
    data = request.json
    index = data['index']
    if 0 <= index < len(timer.sections):
        timer.sections.pop(index)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid index'})

@app.route('/save_template', methods=['POST'])
def save_template():
    if not timer.sections:
        return jsonify({'success': False, 'error': 'No sections to save'})
    data = {'sections': timer.sections, 'rounds': request.json['rounds']}
    with open('static/workout.json', 'w') as f:
        json.dump(data, f)
    return jsonify({'success': True})

@app.route('/load_template', methods=['POST'])
def load_template():
    try:
        with open('static/workout.json', 'r') as f:
            data = json.load(f)
        timer.sections = data['sections']
        return jsonify({'success': True, 'sections': [(s[0], s[1]) for s in timer.sections], 'rounds': data['rounds']})
    except:
        return jsonify({'success': False, 'error': 'Failed to load'})

@app.route('/load_builtin_template', methods=['POST'])
def load_builtin_template():
    template_name = request.json['template']
    if template_name in timer.templates:
        timer.sections = timer.templates[template_name]
        return jsonify({'success': True, 'sections': [(s[0], s[1]) for s in timer.sections], 'rounds': 1})
    return jsonify({'success': False, 'error': 'Invalid template'})

if __name__ == '__main__':
    app.run(debug=True)