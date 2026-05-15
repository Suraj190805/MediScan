"""
MediScan AI — Chest X-Ray Training Script
Fine-tunes DenseNet-121 for pneumonia detection.
Uses MPS (Apple Silicon) acceleration.
"""

import os
import sys
import ssl
import json
import time

# Fix SSL for macOS
ssl._create_default_https_context = ssl._create_unverified_context
from pathlib import Path
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from torchvision import models
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    accuracy_score, f1_score
)
import numpy as np
from tqdm import tqdm

# Add parent to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.dataset import create_dataloaders

# ── Configuration ──────────────────────────────────
CONFIG = {
    "model_name": "xray_densenet121",
    "architecture": "DenseNet-121",
    "task": "Chest X-Ray Pneumonia Detection",
    "num_classes": 2,
    "class_names": ["NORMAL", "PNEUMONIA"],
    "img_size": 224,
    "batch_size": 32,
    "epochs": 15,
    "lr": 1e-4,
    "weight_decay": 1e-5,
    "patience": 5,  # early stopping
}

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "chest_xray"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def get_device():
    """Get best available device."""
    if torch.backends.mps.is_available():
        print("🍎 Using Apple MPS (Metal) acceleration")
        return torch.device("mps")
    elif torch.cuda.is_available():
        print(f"🎮 Using CUDA: {torch.cuda.get_device_name(0)}")
        return torch.device("cuda")
    else:
        print("💻 Using CPU")
        return torch.device("cpu")


def build_model(num_classes: int, device: torch.device) -> nn.Module:
    """Build DenseNet-121 with custom classifier head."""
    print("🧠 Loading DenseNet-121 (ImageNet pretrained)...")
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)

    # Freeze early layers (features.denseblock1 and denseblock2)
    for name, param in model.named_parameters():
        if "denseblock1" in name or "denseblock2" in name:
            param.requires_grad = False

    # Replace classifier
    in_features = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 512),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes),
    )

    model = model.to(device)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"   Parameters: {total:,} total, {trainable:,} trainable")
    return model


def train_one_epoch(model, loader, criterion, optimizer, device, epoch, total_epochs):
    """Train for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(loader, desc=f"Epoch {epoch+1}/{total_epochs} [Train]", leave=False)
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

        pbar.set_postfix(loss=f"{loss.item():.4f}", acc=f"{correct/total:.4f}")

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


@torch.no_grad()
def evaluate(model, loader, criterion, device, desc="Val"):
    """Evaluate model on validation/test set."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    all_probs = []

    pbar = tqdm(loader, desc=f"  [{desc}]", leave=False)
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        probs = torch.softmax(outputs, dim=1)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_probs.extend(probs.cpu().numpy())

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc, np.array(all_preds), np.array(all_labels), np.array(all_probs)


def train():
    """Main training loop."""
    print("=" * 60)
    print("  MediScan AI — Chest X-Ray Model Training")
    print("=" * 60)

    # Check data
    train_dir = DATA_DIR / "train"
    val_dir = DATA_DIR / "val"
    test_dir = DATA_DIR / "test"

    if not train_dir.exists():
        print(f"❌ Training data not found at {train_dir}")
        print("   Run: python training/download_data.py --dataset chest_xray")
        sys.exit(1)

    device = get_device()

    # Create dataloaders
    print(f"\n📂 Loading data from {DATA_DIR}...")
    loaders, classes, class_weights = create_dataloaders(
        train_dir=str(train_dir),
        val_dir=str(val_dir),
        test_dir=str(test_dir),
        img_size=CONFIG["img_size"],
        batch_size=CONFIG["batch_size"],
        num_workers=0 if device.type == "mps" else 4,  # MPS works best with 0 workers
    )

    print(f"   Classes: {classes}")
    print(f"   Class weights: {class_weights.tolist()}")
    print(f"   Train: {len(loaders['train'].dataset)} images")
    print(f"   Val: {len(loaders['val'].dataset)} images")
    if "test" in loaders:
        print(f"   Test: {len(loaders['test'].dataset)} images")

    # Build model
    model = build_model(CONFIG["num_classes"], device)

    # Loss & optimizer
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=CONFIG["lr"],
        weight_decay=CONFIG["weight_decay"],
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=CONFIG["epochs"], eta_min=1e-6)

    # Training loop
    best_val_acc = 0.0
    patience_counter = 0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    print(f"\n🏋️ Training for {CONFIG['epochs']} epochs...")
    start_time = time.time()

    for epoch in range(CONFIG["epochs"]):
        # Train
        train_loss, train_acc = train_one_epoch(
            model, loaders["train"], criterion, optimizer, device, epoch, CONFIG["epochs"]
        )

        # Validate
        val_loss, val_acc, _, _, _ = evaluate(model, loaders["val"], criterion, device)

        scheduler.step()

        # Log
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(f"  Epoch {epoch+1:2d}/{CONFIG['epochs']} │ "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.4f} │ "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.4f} │ "
              f"LR: {scheduler.get_last_lr()[0]:.2e}")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "config": CONFIG,
                "classes": classes,
                "best_val_acc": best_val_acc,
                "epoch": epoch + 1,
                "timestamp": datetime.now().isoformat(),
            }
            save_path = MODEL_DIR / f"{CONFIG['model_name']}.pt"
            torch.save(checkpoint, str(save_path))
            print(f"  💾 Saved best model (val_acc={best_val_acc:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= CONFIG["patience"]:
                print(f"\n⏹️ Early stopping at epoch {epoch+1}")
                break

    elapsed = time.time() - start_time
    print(f"\n⏱️ Training complete in {elapsed/60:.1f} minutes")
    print(f"🏆 Best validation accuracy: {best_val_acc:.4f}")

    # ── Test Evaluation ──────────────────────────
    if "test" in loaders:
        print("\n" + "=" * 60)
        print("  Test Set Evaluation")
        print("=" * 60)

        # Load best model
        checkpoint = torch.load(str(MODEL_DIR / f"{CONFIG['model_name']}.pt"), map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])

        test_loss, test_acc, preds, labels, probs = evaluate(
            model, loaders["test"], criterion, device, desc="Test"
        )

        print(f"\n  Test Accuracy: {test_acc:.4f}")
        print(f"  Test Loss: {test_loss:.4f}")

        # Classification report
        print(f"\n{classification_report(labels, preds, target_names=classes)}")

        # AUC
        if CONFIG["num_classes"] == 2:
            auc = roc_auc_score(labels, probs[:, 1])
            print(f"  AUC-ROC: {auc:.4f}")

        # Confusion matrix
        cm = confusion_matrix(labels, preds)
        print(f"  Confusion Matrix:\n{cm}")

        # Save metrics
        metrics = {
            "test_accuracy": float(test_acc),
            "test_loss": float(test_loss),
            "auc_roc": float(auc) if CONFIG["num_classes"] == 2 else None,
            "f1_score": float(f1_score(labels, preds, average="weighted")),
            "confusion_matrix": cm.tolist(),
            "training_time_minutes": elapsed / 60,
            "best_epoch": int(checkpoint["epoch"]),
            "history": history,
        }

        metrics_path = MODEL_DIR / f"{CONFIG['model_name']}_metrics.json"
        with open(str(metrics_path), "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\n📊 Metrics saved to {metrics_path}")

    print("\n✅ X-Ray model training complete!")
    print(f"   Model saved: {MODEL_DIR / CONFIG['model_name']}.pt")


if __name__ == "__main__":
    train()
