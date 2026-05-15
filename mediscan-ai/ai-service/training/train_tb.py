#!/usr/bin/env python3
"""
MediScan AI — Tuberculosis (TB) Chest X-Ray Training
DenseNet-121 transfer learning for TB vs Normal classification.
Dataset: Tawsifur Rahman TB Chest X-ray Database (3500 Normal + 700 TB)
"""

import os
import sys
import ssl
import json
import time

# Fix SSL for macOS
ssl._create_default_https_context = ssl._create_unverified_context

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import models, transforms
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from PIL import Image

# ── Paths ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "tb_xray", "TB_Chest_Radiography_Database")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CLASSES = ["Normal", "Tuberculosis"]
NUM_CLASSES = 2
BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4
IMG_SIZE = 224


# ── Dataset ────────────────────────────────────────────
class TBDataset(torch.utils.data.Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        img_path = self.file_paths[idx]
        label = self.labels[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


def build_file_list():
    """Build file paths and labels from folder structure."""
    paths, labels = [], []
    for cls_idx, cls_name in enumerate(CLASSES):
        cls_dir = os.path.join(DATA_DIR, cls_name)
        if not os.path.exists(cls_dir):
            print(f"⚠️ Class directory not found: {cls_dir}")
            continue
        for fname in os.listdir(cls_dir):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                paths.append(os.path.join(cls_dir, fname))
                labels.append(cls_idx)
    return paths, labels


def get_transforms(train=True):
    if train:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
            transforms.RandomCrop(IMG_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def main():
    print("=" * 60)
    print("🫁 MediScan AI — Tuberculosis Detection Training")
    print("=" * 60)

    # Device
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print(f"🍎 Using Apple MPS acceleration")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"🔥 Using CUDA GPU")
    else:
        device = torch.device("cpu")
        print(f"💻 Using CPU")

    # Build dataset
    print(f"\n📂 Loading data from: {DATA_DIR}")
    all_paths, all_labels = build_file_list()
    print(f"   Total images: {len(all_paths)}")
    for i, cls in enumerate(CLASSES):
        count = all_labels.count(i)
        print(f"   {cls}: {count}")

    # Split: 80% train, 10% val, 10% test (stratified)
    train_paths, test_paths, train_labels, test_labels = train_test_split(
        all_paths, all_labels, test_size=0.2, stratify=all_labels, random_state=42
    )
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        train_paths, train_labels, test_size=0.125, stratify=train_labels, random_state=42
    )

    print(f"\n📊 Split: Train={len(train_paths)}, Val={len(val_paths)}, Test={len(test_paths)}")

    # Weighted sampler for imbalanced classes (5:1 ratio)
    class_counts = np.bincount(train_labels)
    class_weights = 1.0 / class_counts
    sample_weights = [class_weights[label] for label in train_labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    # DataLoaders
    train_ds = TBDataset(train_paths, train_labels, get_transforms(train=True))
    val_ds = TBDataset(val_paths, val_labels, get_transforms(train=False))
    test_ds = TBDataset(test_paths, test_labels, get_transforms(train=False))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    print(f"   Batches: Train={len(train_loader)}, Val={len(val_loader)}, Test={len(test_loader)}")

    # ── Model ──────────────────────────────────────────
    print(f"\n🧠 Building DenseNet-121...")
    model = models.densenet121(weights="IMAGENET1K_V1")
    num_features = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_features, NUM_CLASSES),
    )
    model = model.to(device)

    total_params = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"   Parameters: {total_params:,} total, {trainable:,} trainable")

    # ── Training ───────────────────────────────────────
    # Use weighted loss to handle class imbalance
    weight_tensor = torch.tensor([1.0, 5.0]).to(device)  # 5x weight for TB (minority)
    criterion = nn.CrossEntropyLoss(weight=weight_tensor)
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    best_val_acc = 0.0
    best_epoch = 0
    patience = 5
    patience_counter = 0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    print(f"\n🚀 Training for {EPOCHS} epochs...")
    print("-" * 60)

    for epoch in range(EPOCHS):
        epoch_start = time.time()

        # Train
        model.train()
        train_loss, train_correct, train_total = 0, 0, 0

        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            train_correct += preds.eq(labels).sum().item()
            train_total += labels.size(0)

            if (batch_idx + 1) % 20 == 0:
                print(f"  Epoch {epoch+1} [{batch_idx+1}/{len(train_loader)}] "
                      f"Loss: {loss.item():.4f} Acc: {train_correct/train_total*100:.1f}%")

        train_loss /= train_total
        train_acc = train_correct / train_total

        # Validate
        model.eval()
        val_loss, val_correct, val_total = 0, 0, 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                val_total += labels.size(0)

        val_loss /= val_total
        val_acc = val_correct / val_total

        scheduler.step()
        elapsed = time.time() - epoch_start

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch + 1
            patience_counter = 0
            # Save best model
            torch.save({
                "model_state_dict": model.state_dict(),
                "config": {
                    "architecture": "DenseNet-121",
                    "num_classes": NUM_CLASSES,
                    "classes": CLASSES,
                    "img_size": IMG_SIZE,
                    "modality": "tb",
                },
                "best_val_acc": best_val_acc,
                "epoch": epoch + 1,
            }, os.path.join(MODEL_DIR, "tb_xray_densenet121.pth"))
            marker = " ★ BEST"
        else:
            patience_counter += 1

        print(f"Epoch {epoch+1}/{EPOCHS} ({elapsed:.0f}s) | "
              f"Train: {train_acc*100:.1f}% loss={train_loss:.4f} | "
              f"Val: {val_acc*100:.1f}% loss={val_loss:.4f}{marker}")

        if patience_counter >= patience:
            print(f"\n⏹ Early stopping at epoch {epoch+1} (best: epoch {best_epoch})")
            break

    # ── Evaluation ─────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"📊 Final Evaluation on Test Set")
    print(f"{'=' * 60}")

    # Load best model
    checkpoint = torch.load(os.path.join(MODEL_DIR, "tb_xray_densenet121.pth"), map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_preds, all_labels_list, all_probs = [], [], []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = outputs.max(1)

            all_preds.extend(preds.cpu().numpy())
            all_labels_list.extend(labels.numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # TB probability

    all_preds = np.array(all_preds)
    all_labels_arr = np.array(all_labels_list)
    all_probs = np.array(all_probs)

    # Metrics
    test_acc = (all_preds == all_labels_arr).mean()
    auc_roc = roc_auc_score(all_labels_arr, all_probs)

    print(f"\n✅ Test Accuracy: {test_acc*100:.2f}%")
    print(f"✅ AUC-ROC: {auc_roc:.4f}")
    print(f"\n{classification_report(all_labels_arr, all_preds, target_names=CLASSES)}")
    print(f"Confusion Matrix:\n{confusion_matrix(all_labels_arr, all_preds)}")
    print(f"\n🏆 Best model saved to: models/tb_xray_densenet121.pth")
    print(f"   Best val accuracy: {best_val_acc*100:.2f}% (epoch {best_epoch})")

    # Save training history
    with open(os.path.join(MODEL_DIR, "tb_training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    print(f"\n✅ TB model training complete!")


if __name__ == "__main__":
    main()
