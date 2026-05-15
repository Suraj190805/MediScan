"""
MediScan AI — Pydantic Schemas
Request/response models for the FastAPI inference service.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PredictionItem(BaseModel):
    """Single class prediction."""
    class_name: str = Field(alias="class")
    confidence: float = Field(ge=0, le=1)

    class Config:
        populate_by_name = True


class ModelInfo(BaseModel):
    """Model metadata."""
    architecture: str
    classes: List[str]
    val_accuracy: float


class PredictionResponse(BaseModel):
    """Response from /inference/predict endpoint."""
    prediction: str
    confidence: float
    top_predictions: List[PredictionItem]
    modality: str
    model_info: ModelInfo
    heatmap_base64: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class BatchPredictionResponse(BaseModel):
    """Response from /inference/predict/batch endpoint."""
    results: List[PredictionResponse]
    total: int
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ModelListItem(BaseModel):
    """Model list entry."""
    modality: str
    architecture: str
    description: str
    checkpoint_exists: bool
    loaded: bool
    classes: Optional[List[str]] = None
    best_val_acc: Optional[float] = None
    device: Optional[str] = None


class ModelListResponse(BaseModel):
    """Response from /inference/models endpoint."""
    models: List[ModelListItem]


class HealthResponse(BaseModel):
    """Response from /inference/health endpoint."""
    status: str
    service: str
    timestamp: str
    gpu_available: bool
    mps_available: bool
    models_loaded: int
