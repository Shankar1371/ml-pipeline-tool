import sys
import json
import os
from PIL import Image
import numpy as np
import joblib
import traceback

def preprocess_image(path):
    try:
        print("Preprocessing image...", file=sys.stderr, flush=True)
        img = Image.open(path).convert('L')  # Grayscale
        img = img.resize((64, 64))            # Resize to 64x64
        arr = np.array(img).flatten().reshape(1, -1)
        print(" Image preprocessed", file=sys.stderr, flush=True)
        return arr
    except Exception as e:
        raise RuntimeError(f"Image preprocessing failed: {e}")

def main():
    try:
        print("Starting prediction script...", file=sys.stderr, flush=True)

        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        image_path = payload.get('imagePath')

        if not image_path or not os.path.exists(image_path):
            sys.stdout.write(json.dumps({
                "error": " Image path is missing or file does not exist.",
                "imagePath": image_path
            }) + "\n")
            sys.stdout.flush()
            return

        print(f" Image path received: {image_path}", file=sys.stderr, flush=True)

        # Load model and encoder
        base_dir = os.path.dirname(__file__)
        model_path = os.path.join(base_dir, 'uploads', 'model.pkl')
        encoder_path = os.path.join(base_dir, 'uploads', 'label_encoder.pkl')

        if not os.path.exists(model_path):
            sys.stdout.write(json.dumps({
                "error": " Trained model file (uploads/model.pkl) not found."
            }) + "\n")
            sys.stdout.flush()
            return

        if not os.path.exists(encoder_path):
            sys.stdout.write(json.dumps({
                "error": " Label encoder file (uploads/label_encoder.pkl) not found."
            }) + "\n")
            sys.stdout.flush()
            return

        print(f"Loading model from {model_path}", file=sys.stderr, flush=True)
        model = joblib.load(model_path)
        print(" Model loaded", file=sys.stderr, flush=True)

        print(f"Loading label encoder from {encoder_path}", file=sys.stderr, flush=True)
        label_encoder = joblib.load(encoder_path)
        print("Label encoder loaded", file=sys.stderr, flush=True)

        # Preprocess and predict
        features = preprocess_image(image_path)
        prediction = model.predict(features)[0]
        predicted_class = label_encoder.inverse_transform([prediction])[0]

        print(" Prediction completed", file=sys.stderr, flush=True)

        # Send only JSON to stdout
        sys.stdout.write(json.dumps({ "prediction": predicted_class }) + "\n")
        sys.stdout.flush()

    except Exception as e:
        sys.stdout.write(json.dumps({
            "error": f" Prediction failed: {str(e)}",
            "trace": traceback.format_exc()
        }) + "\n")
        sys.stdout.flush()

if __name__ == '__main__':
    main()
