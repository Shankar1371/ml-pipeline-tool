# ML Pipeline Tool

This project provides an interactive environment for building and executing simple machine learning pipelines. It consists of a React front‑end, a Node/Express API, and Python scripts for model training and prediction.

## Features

- **Drag‑and‑drop pipeline editor** using React Flow
- **Dataset upload** via ZIP archives
- **Real‑time logs** streamed over WebSockets
- **Python training script** that trains a RandomForest model
- **Image prediction** using the trained model
- **Pipeline persistence** with MongoDB
- **Docker and docker‑compose** support for easy setup

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB instance (local or remote)

## Local Development

1. Install dependencies for the front‑end:
   ```bash
   npm install
   ```
2. Install dependencies for the back‑end and Python scripts:
   ```bash
   cd ml-backend
   npm install
   pip install -r requirements.txt
   ```
3. Copy `ml-backend/.env` and update `MONGODB_URI` with your database connection.
4. Start the back‑end server:
   ```bash
   node index.js
   ```
5. In a separate terminal, start the front‑end:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173` in your browser.

## Docker Compose

Alternatively, you can run the project using Docker Compose:

```bash
docker-compose up
```

The front‑end will be available on port `5173` and the back‑end on `5000`.

## Usage Overview

1. Navigate to the **Pipeline** page.
2. Drag nodes (Data Ingestion, Data Validation, Model Training, etc.) into the canvas and connect them.
3. Upload a ZIP file containing labeled image folders.
4. Execute the pipeline to train the model. Logs will appear in real time.
5. Visit the **Deployment** page to download the trained model and make predictions on new images.

## License

This project is provided as-is for demonstration purposes.
