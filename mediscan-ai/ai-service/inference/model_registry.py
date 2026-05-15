"""
MediScan AI — Model Registry
Loads and manages trained model checkpoints.
"""

import torch
from torchvision import models
import torch.nn as nn
from pathlib import Path
from typing import Dict, Optional


class ModelRegistry:
    """
    Manages trained model checkpoints.
    Supports lazy loading — models are only loaded into memory when first requested.
    """

    MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

    # Registry of available model configs
    AVAILABLE_MODELS = {
        "xray": {
            "checkpoint": "xray_combined_densenet121.pth",
            "architecture": "DenseNet-121",
            "default_classes": ["Normal", "Pneumonia", "Tuberculosis"],
            "description": "Chest X-Ray Analysis (Pneumonia + TB)",
            "classifier_type": "simple",
        },
        "brain": {
            "checkpoint": "brain_densenet121.pt",
            "architecture": "DenseNet-121",
            "default_classes": ["glioma", "meningioma", "notumor", "pituitary"],
            "description": "Brain Tumor MRI Classification",
            "classifier_type": "simple",
        },
        "fracture": {
            "checkpoint": "fracture_xray_densenet121.pth",
            "architecture": "DenseNet-121",
            "default_classes": ["fractured", "not fractured"],
            "description": "Bone Fracture X-Ray Detection",
            "classifier_type": "simple",
        },
        "covid": {
            "checkpoint": "covid_ct_densenet121.pth",
            "architecture": "DenseNet-121",
            "default_classes": ["COVID", "non-COVID"],
            "description": "COVID-19 CT Scan Detection",
            "classifier_type": "simple",
        },
    }

    def __init__(self, device: Optional[torch.device] = None):
        if device is None:
            import os
            force_cpu = os.environ.get("MEDISCAN_FORCE_CPU", "0") == "1"
            if not force_cpu and torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif not force_cpu and torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = device

        self._loaded_models: Dict[str, dict] = {}

    def _build_densenet121(self, num_classes: int, classifier_type: str = "complex") -> nn.Module:
        """Build DenseNet-121 architecture matching training config."""
        model = models.densenet121(weights=None)  # Don't load ImageNet weights
        in_features = model.classifier.in_features
        if classifier_type == "simple":
            # Simple head: used by TB model
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.3),
                nn.Linear(in_features, num_classes),
            )
        else:
            # Complex head: used by X-ray and brain models
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.3),
                nn.Linear(in_features, 512),
                nn.ReLU(inplace=True),
                nn.BatchNorm1d(512),
                nn.Dropout(p=0.2),
                nn.Linear(512, num_classes),
            )
        return model

    def load_model(self, modality: str) -> dict:
        """
        Load a model by modality.
        Returns dict with: model, classes, config, metadata.
        """
        if modality in self._loaded_models:
            return self._loaded_models[modality]

        if modality not in self.AVAILABLE_MODELS:
            raise ValueError(f"Unknown modality: {modality}. Available: {list(self.AVAILABLE_MODELS.keys())}")

        model_info = self.AVAILABLE_MODELS[modality]
        checkpoint_path = self.MODEL_DIR / model_info["checkpoint"]

        if not checkpoint_path.exists():
            raise FileNotFoundError(
                f"Model checkpoint not found: {checkpoint_path}\n"
                f"Train the model first with: python training/train_{'xray' if modality == 'xray' else 'brain'}.py"
            )

        print(f"📦 Loading {model_info['description']} model...")
        checkpoint = torch.load(str(checkpoint_path), map_location=self.device, weights_only=False)

        classes = checkpoint.get("classes", model_info["default_classes"])
        num_classes = len(classes)

        classifier_type = model_info.get("classifier_type", "complex")
        model = self._build_densenet121(num_classes, classifier_type)
        model.load_state_dict(checkpoint["model_state_dict"])
        model = model.to(self.device)
        model.eval()

        entry = {
            "model": model,
            "classes": classes,
            "config": checkpoint.get("config", {}),
            "best_val_acc": checkpoint.get("best_val_acc", 0),
            "epoch": checkpoint.get("epoch", 0),
            "timestamp": checkpoint.get("timestamp", "unknown"),
            "device": self.device,
        }

        self._loaded_models[modality] = entry
        print(f"   ✅ Loaded ({num_classes} classes, val_acc={entry['best_val_acc']:.4f})")
        return entry

    def get_model(self, modality: str):
        """Get or load a model."""
        return self.load_model(modality)

    def list_models(self) -> list:
        """List all available models and their status."""
        result = []
        for modality, info in self.AVAILABLE_MODELS.items():
            checkpoint_path = self.MODEL_DIR / info["checkpoint"]
            entry = {
                "modality": modality,
                "architecture": info["architecture"],
                "description": info["description"],
                "checkpoint_exists": checkpoint_path.exists(),
                "loaded": modality in self._loaded_models,
            }

            if modality in self._loaded_models:
                loaded = self._loaded_models[modality]
                entry["classes"] = loaded["classes"]
                entry["best_val_acc"] = loaded["best_val_acc"]
                entry["device"] = str(loaded["device"])

            result.append(entry)
        return result

    def unload_model(self, modality: str):
        """Unload model from memory."""
        if modality in self._loaded_models:
            del self._loaded_models[modality]
            torch.mps.empty_cache() if self.device.type == "mps" else None
            print(f"🗑️ Unloaded {modality} model")
