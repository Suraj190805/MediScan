# MediScan AI — FastAPI AI Microservice
"""
AI Inference Service for MediScan AI
Handles medical image predictions using DenseNet-121 with Grad-CAM explainability.
"""

import torch
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional

from inference.predictor import Predictor
from inference.model_registry import ModelRegistry

app = FastAPI(
    title="MediScan AI Inference Service",
    description="Medical image prediction and explainability engine",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model registry and predictor (lazy loading)
registry = ModelRegistry()
predictor = Predictor(registry)


@app.get("/inference/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "ok",
        "service": "mediscan-ai-inference",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "gpu_available": torch.cuda.is_available(),
        "mps_available": torch.backends.mps.is_available(),
        "device": str(registry.device),
        "models_loaded": len(registry._loaded_models),
    }


@app.get("/inference/models")
async def list_models():
    """List available models and their status."""
    return {"models": registry.list_models()}


@app.post("/inference/predict")
async def predict(
    file: UploadFile = File(..., description="Medical image file (JPEG, PNG)"),
    modality: str = Form(..., description="Image modality: 'xray' or 'brain'"),
    explain: bool = Form(False, description="Generate Grad-CAM heatmap"),
    top_k: int = Form(3, description="Number of top predictions"),
):
    """
    Run AI prediction on a medical image.

    - **file**: Upload a medical image (X-ray or Brain MRI)
    - **modality**: Specify 'xray' for chest X-rays, 'brain' for brain MRI
    - **explain**: Set to true to include Grad-CAM heatmap visualization
    - **top_k**: Number of top class predictions to return

    Returns prediction with confidence score and optional heatmap.
    """
    # Validate modality
    valid_modalities = ["xray", "brain", "fracture", "covid"]
    if modality not in valid_modalities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid modality '{modality}'. Must be one of: {valid_modalities}"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/tiff", "image/bmp"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Accepted: {allowed_types}"
        )

    try:
        image_bytes = await file.read()

        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        result = predictor.predict(
            image_bytes=image_bytes,
            modality=modality,
            explain=explain,
            top_k=top_k,
        )

        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/inference/predict/batch")
async def predict_batch(
    files: list[UploadFile] = File(..., description="Multiple medical image files"),
    modality: str = Form(..., description="Image modality: 'xray' or 'brain'"),
    explain: bool = Form(False, description="Generate Grad-CAM heatmaps"),
):
    """
    Batch prediction for multiple images.
    """
    valid_modalities = ["xray", "brain"]
    if modality not in valid_modalities:
        raise HTTPException(status_code=400, detail=f"Invalid modality. Must be: {valid_modalities}")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    try:
        images_bytes = [await f.read() for f in files]
        results = predictor.predict_batch(images_bytes, modality, explain=explain)
        return {"results": results, "total": len(results), "timestamp": datetime.utcnow().isoformat()}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.post("/inference/explain")
async def explain_prediction(
    file: UploadFile = File(...),
    modality: str = Form(...),
):
    """
    Generate Grad-CAM heatmap explanation for a prediction.
    Always returns the heatmap visualization.
    """
    try:
        image_bytes = await file.read()
        result = predictor.predict(
            image_bytes=image_bytes,
            modality=modality,
            explain=True,
            top_k=5,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


# Preload models on startup (optional — comment out for lazy loading)
@app.on_event("startup")
async def preload_models():
    """Attempt to preload available models on startup."""
    print("\n🚀 MediScan AI Inference Service starting...")
    for modality in ["xray", "brain"]:
        try:
            registry.load_model(modality)
        except FileNotFoundError:
            print(f"   ⚠️  {modality} model not found — will load on first request")
    print(f"   Device: {registry.device}")
    print(f"   Models loaded: {len(registry._loaded_models)}")
    print("   Ready to accept requests!\n")
