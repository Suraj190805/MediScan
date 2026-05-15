#!/usr/bin/env python3
"""
MediScan AI — COVID-19 CT Scan Classification Training
DenseNet-121 transfer learning: COVID vs Non-COVID
Dataset: SARS-CoV-2 CT Scan Dataset (2,481 images)
"""

import os, ssl, time, random
ssl._create_default_https_context = ssl._create_unverified_context

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import models, transforms
from sklearn.metrics import classification_report, confusion_matrix
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "covid_ct")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CLASSES = ["COVID", "non-COVID"]
BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4
IMG_SIZE = 224


class CTDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def get_transforms(train=True):
    if train:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
            transforms.RandomCrop(IMG_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.15, contrast=0.15),
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
    print("🦠 MediScan AI — COVID-19 CT Scan Detection Training")
    print("=" * 60)

    device = torch.device("mps" if torch.backends.mps.is_available()
                          else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"📱 Device: {device}")

    # Build sample list
    samples = []
    exts = {'.png', '.jpg', '.jpeg'}
    for label_idx, cls in enumerate(CLASSES):
        cls_dir = os.path.join(DATA_DIR, cls)
        for f in os.listdir(cls_dir):
            if os.path.splitext(f)[1].lower() in exts:
                samples.append((os.path.join(cls_dir, f), label_idx))

    random.seed(42)
    random.shuffle(samples)

    # Split: 80% train, 10% val, 10% test
    n = len(samples)
    n_train = int(0.8 * n)
    n_val = int(0.1 * n)
    train_samples = samples[:n_train]
    val_samples = samples[n_train:n_train + n_val]
    test_samples = samples[n_train + n_val:]

    print(f"\n📂 Dataset: {DATA_DIR}")
    print(f"   Classes: {CLASSES}")
    print(f"   Total: {n} | Train: {len(train_samples)} | Val: {len(val_samples)} | Test: {len(test_samples)}")

    train_ds = CTDataset(train_samples, get_transforms(True))
    val_ds = CTDataset(val_samples, get_transforms(False))
    test_ds = CTDataset(test_samples, get_transforms(False))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Model
    print(f"\n🧠 Building DenseNet-121...")
    model = models.densenet121(weights="IMAGENET1K_V1")
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(model.classifier.in_features, len(CLASSES)),
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
        correct, total = 0, 0
        for i, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()
            correct += out.argmax(1).eq(labels).sum().item()
            total += labels.size(0)
            if (i + 1) % 20 == 0:
                print(f"  Epoch {epoch+1} [{i+1}/{len(train_loader)}] "
                      f"Loss: {loss.item():.4f} Acc: {correct/total*100:.1f}%")
        train_acc = correct / total

        # Validate
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                out = model(imgs)
                val_correct += out.argmax(1).eq(labels).sum().item()
                val_total += labels.size(0)
        val_acc = val_correct / val_total
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
                    "num_classes": len(CLASSES),
                    "classes": CLASSES,
                    "img_size": IMG_SIZE,
                    "modality": "covid",
                },
                "classes": CLASSES,
                "best_val_acc": best_val_acc,
                "epoch": epoch + 1,
            }, os.path.join(MODEL_DIR, "covid_ct_densenet121.pth"))
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
    ckpt = torch.load(os.path.join(MODEL_DIR, "covid_ct_densenet121.pth"), map_location=device)
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
    print(f"\n🏆 Best model: covid_ct_densenet121.pth (val: {best_val_acc*100:.2f}%)")
    print(f"✅ Done!")


if __name__ == "__main__":
    main()
