#!/usr/bin/env python3
"""
MediScan AI — Bone Fracture X-Ray Classification Training (v2)
DenseNet-121 transfer learning: Fractured vs Not Fractured
Dataset: Bone Fracture Multi-Region X-ray Data (10,580 images)
"""

import os, ssl, json, time
ssl._create_default_https_context = ssl._create_unverified_context

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models, transforms, datasets
from sklearn.metrics import classification_report, confusion_matrix
from PIL import ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "fracture_cls",
    "Bone_Fracture_Binary_Classification", "Bone_Fracture_Binary_Classification")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

BATCH_SIZE = 32
EPOCHS = 12
LR = 1e-4
IMG_SIZE = 224


def get_transforms(train=True):
    if train:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
            transforms.RandomCrop(IMG_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
        transforms.CenterCrop(IMG_SIZE),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def main():
    print("=" * 60)
    print("🦴 MediScan AI — Bone Fracture Detection Training v2")
    print("=" * 60)

    device = torch.device("mps" if torch.backends.mps.is_available()
                          else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"📱 Device: {device}")

    # Load datasets using ImageFolder (reads class names from folder names)
    train_ds = datasets.ImageFolder(os.path.join(DATA_DIR, "train"), get_transforms(True))
    val_ds = datasets.ImageFolder(os.path.join(DATA_DIR, "val"), get_transforms(False))
    test_ds = datasets.ImageFolder(os.path.join(DATA_DIR, "test"), get_transforms(False))

    CLASSES = train_ds.classes  # ['fractured', 'not fractured']
    NUM_CLASSES = len(CLASSES)

    print(f"\n📂 Dataset: {DATA_DIR}")
    print(f"   Classes: {CLASSES}")
    print(f"   Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Model
    print(f"\n🧠 Building DenseNet-121 ({NUM_CLASSES}-class)...")
    model = models.densenet121(weights="IMAGENET1K_V1")
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(model.classifier.in_features, NUM_CLASSES),
    )
    model = model.to(device)
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    best_val_acc = 0.0
    best_epoch = 0
    patience_counter = 0

    print(f"\n🚀 Training for {EPOCHS} epochs...")
    print("-" * 60)

    for epoch in range(EPOCHS):
        t0 = time.time()

        # Train
        model.train()
        train_loss, correct, total = 0, 0, 0
        for i, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * imgs.size(0)
            correct += out.argmax(1).eq(labels).sum().item()
            total += labels.size(0)
            if (i + 1) % 40 == 0:
                print(f"  Epoch {epoch+1} [{i+1}/{len(train_loader)}] "
                      f"Loss: {loss.item():.4f} Acc: {correct/total*100:.1f}%")
        train_acc = correct / total
        train_loss /= total

        # Validate
        model.eval()
        val_loss, val_correct, val_total = 0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                out = model(imgs)
                loss = criterion(out, labels)
                val_loss += loss.item() * imgs.size(0)
                val_correct += out.argmax(1).eq(labels).sum().item()
                val_total += labels.size(0)
        val_acc = val_correct / val_total
        val_loss /= val_total
        scheduler.step()

        marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch + 1
            patience_counter = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "config": {
                    "architecture": "DenseNet-121",
                    "num_classes": NUM_CLASSES,
                    "classes": CLASSES,
                    "img_size": IMG_SIZE,
                    "modality": "fracture",
                },
                "classes": CLASSES,
                "best_val_acc": best_val_acc,
                "epoch": epoch + 1,
            }, os.path.join(MODEL_DIR, "fracture_xray_densenet121.pth"))
            marker = " ★ BEST"
        else:
            patience_counter += 1

        print(f"Epoch {epoch+1}/{EPOCHS} ({time.time()-t0:.0f}s) | "
              f"Train: {train_acc*100:.1f}% | Val: {val_acc*100:.1f}%{marker}")

        if patience_counter >= 5:
            print(f"\n⏹ Early stopping at epoch {epoch+1}")
            break

    # Final evaluation
    print(f"\n{'='*60}\n📊 Final Test Evaluation\n{'='*60}")
    ckpt = torch.load(os.path.join(MODEL_DIR, "fracture_xray_densenet121.pth"), map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    preds, labels_all = [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            out = model(imgs.to(device))
            preds.extend(out.argmax(1).cpu().numpy())
            labels_all.extend(labels.numpy())

    preds, labels_all = np.array(preds), np.array(labels_all)
    print(f"\n✅ Test Accuracy: {(preds==labels_all).mean()*100:.2f}%")
    print(f"\n{classification_report(labels_all, preds, target_names=CLASSES)}")
    print(f"Confusion Matrix:\n{confusion_matrix(labels_all, preds)}")
    print(f"\n🏆 Best model: fracture_xray_densenet121.pth (val: {best_val_acc*100:.2f}%)")
    print(f"✅ Done!")


if __name__ == "__main__":
    main()
