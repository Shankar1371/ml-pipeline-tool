"""Train a simple image classification model based on a pipeline description.

The script reads a JSON payload from stdin describing the nodes and edges of
the pipeline as well as the directory of extracted images. It outputs progress
messages to stderr (forwarded to the browser via WebSocket) and finally emits a
JSON result on stdout.
"""

import sys
import os
import json
from collections import defaultdict, deque
from PIL import Image
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
import traceback

def extract_features(image_path):
    """Convert an image to a flat grayscale feature vector."""
    try:
        img = Image.open(image_path).convert("L").resize((64, 64))
        return np.array(img).flatten()
    except Exception as e:
        print(f"Error processing image {image_path}: {e}", file=sys.stderr, flush=True)
        return None

def build_execution_order(nodes, edges):
    """Return node ids in topological order to respect dependencies."""
    graph = defaultdict(list)
    in_degree = {node['id']: 0 for node in nodes}
    for edge in edges:
        graph[edge['source']].append(edge['target'])
        in_degree[edge['target']] += 1

    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
    order = []

    while queue:
        nid = queue.popleft()
        order.append(nid)
        for neighbor in graph[nid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order

def run_pipeline(image_dir, nodes, edges):
    """Execute the pipeline and train a RandomForest model."""
    print("Starting ML pipeline execution...", file=sys.stderr, flush=True)

    image_paths, labels = [], []
    for label in os.listdir(image_dir):
        class_dir = os.path.join(image_dir, label)
        if os.path.isdir(class_dir):
            for file in os.listdir(class_dir):
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                    image_paths.append(os.path.join(class_dir, file))
                    labels.append(label)

    if not image_paths:
        return {"error": "No valid images found."}

    id_to_label = {node['id']: node['data']['label'] for node in nodes}
    exec_order = build_execution_order(nodes, edges)

    print("Execution order:", exec_order, file=sys.stderr, flush=True)
    print("ID to Label mapping:", id_to_label, file=sys.stderr, flush=True)

    stages = []
    model_training_reached = False

    for node_id in exec_order:
        label = id_to_label.get(node_id, "Unknown")
        print(f"Visiting node: {label}", file=sys.stderr, flush=True)
        stages.append(label)
        if label == "Model Training":
            model_training_reached = True
            break

    if not model_training_reached:
        return {"error": "Model Training node not connected in the pipeline."}

    X, y = [], []
    for path, label in zip(image_paths, labels):
        features = extract_features(path)
        if features is not None:
            X.append(features)
            y.append(label)

    if not X or not y:
        return {"error": "Feature extraction failed or no images were processed."}

    print("Encoding labels...", file=sys.stderr, flush=True)
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    print(f"Dataset size: {len(X)} samples", file=sys.stderr, flush=True)
    print("Splitting data into train/test sets...", file=sys.stderr, flush=True)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42
    )

    print("Training RandomForestClassifier model...", file=sys.stderr, flush=True)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    print("Model trained. Evaluating performance...", file=sys.stderr, flush=True)
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    project_root = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(project_root, 'model.pkl')
    encoder_path = os.path.join(project_root, 'label_encoder.pkl')
    joblib.dump(clf, model_path)
    joblib.dump(le, encoder_path)

    print(f"Model and label encoder saved at:\n - {model_path}\n - {encoder_path}", file=sys.stderr, flush=True)

    result = {
        "message": "Pipeline executed and model trained successfully!",
        "model": "RandomForestClassifier",
        "accuracy": accuracy,
        "stagesExecuted": stages,
        "downloadLink": "/uploads/model.pkl"
    }

    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()

def main():
    """Entry point for reading payload from stdin and running the pipeline."""
    try:
        input_data = sys.stdin.read()
        payload = json.loads(input_data)

        nodes = payload.get("nodes", [])
        edges = payload.get("edges", [])
        image_folder = payload.get("imageFolder", "")

        if not os.path.exists(image_folder):
            print(json.dumps({"error": "Extracted image folder not found."}))
            return

        run_pipeline(image_folder, nodes, edges)

    except Exception as e:
        print(json.dumps({
            "error": f"Unexpected error occurred: {str(e)}",
            "trace": traceback.format_exc()
        }), flush=True)

if __name__ == "__main__":
    main()
