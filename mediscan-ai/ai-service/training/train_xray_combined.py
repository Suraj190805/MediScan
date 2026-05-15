#!/usr/bin/env python3
"""
MediScan AI — Combined Chest X-Ray Classification Training
DenseNet-121: Normal vs Pneumonia vs Tuberculosis (3-class)
Merges chest_xray and tb_xray datasets into one unified model.
"""

import os, ssl, time, random
ssl._create_default_https_context = ssl._create_unverified_context

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from sklearn.metrics import classification_report, confusion_matrix
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XRAY_DIR = os.path.join(BASE_DIR, "data", "chest_xray")
TB_DIR = os.path.join(BASE_DIR, "data", "tb_xray", "TB_Chest_Radiography_Database")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CLASSES = ["Normal", "Pneumonia", "Tuberculosis"]
BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4
IMG_SIZE = 224


class CombinedXrayDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples  # [(path, label_idx), ...]
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def collect_files(directory, exts={'.png', '.jpg', '.jpeg'}):
    """Collect all image files from a directory."""
    files = []
    for f in os.listdir(directory):
        if os.path.splitext(f)[1].lower() in exts:
            files.append(os.path.join(directory, f))
    return files


def build_samples():
    """Merge chest_xray and tb_xray datasets into 3-class samples."""
    # --- From chest_xray dataset ---
    # Train split
    xray_train_normal = [(f, 0) for f in collect_files(os.path.join(XRAY_DIR, "train", "NORMAL"))]
    xray_train_pneum = [(f, 1) for f in collect_files(os.path.join(XRAY_DIR, "train", "PNEUMONIA"))]
    xray_test_normal = [(f, 0) for f in collect_files(os.path.join(XRAY_DIR, "test", "NORMAL"))]
    xray_test_pneum = [(f, 1) for f in collect_files(os.path.join(XRAY_DIR, "test", "PNEUMONIA"))]
    xray_val_normal = [(f, 0) for f in collect_files(os.path.join(XRAY_DIR, "val", "NORMAL"))]
    xray_val_pneum = [(f, 1) for f in collect_files(os.path.join(XRAY_DIR, "val", "PNEUMONIA"))]

    # --- From tb_xray dataset (no predefined split, so we split 80/10/10) ---
    tb_normal_all = collect_files(os.path.join(TB_DIR, "Normal"))
    tb_positive_all = collect_files(os.path.join(TB_DIR, "Tuberculosis"))

    random.seed(42)
    random.shuffle(tb_normal_all)
    random.shuffle(tb_positive_all)

    # Use TB normal to supplement (cap to avoid overwhelming pneumonia class)
    # Take 1500 TB normals for training balance
    tb_n = len(tb_normal_all)
    tb_train_n = int(0.8 * tb_n)
    tb_val_n = int(0.1 * tb_n)
    tb_train_normal = [(f, 0) for f in tb_normal_all[:tb_train_n]]
    tb_val_normal = [(f, 0) for f in tb_normal_all[tb_train_n:tb_train_n + tb_val_n]]
    tb_test_normal = [(f, 0) for f in tb_normal_all[tb_train_n + tb_val_n:]]

    tb_p = len(tb_positive_all)
    tb_train_p = int(0.8 * tb_p)
    tb_val_p = int(0.1 * tb_p)
    tb_train_tb = [(f, 2) for f in tb_positive_all[:tb_train_p]]
    tb_val_tb = [(f, 2) for f in tb_positive_all[tb_train_p:tb_train_p + tb_val_p]]
    tb_test_tb = [(f, 2) for f in tb_positive_all[tb_train_p + tb_val_p:]]

    # Combine
    train = xray_train_normal + xray_train_pneum + tb_train_normal + tb_train_tb
    val = xray_val_normal + xray_val_pneum + tb_val_normal + tb_val_tb
    test = xray_test_normal + xray_test_pneum + tb_test_normal + tb_test_tb

    random.shuffle(train)
    random.shuffle(val)
    random.shuffle(test)

    return train, val, test


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
    print("🫁 MediScan AI — Combined X-Ray Model Training")
    print("   Normal vs Pneumonia vs Tuberculosis")
    print("=" * 60)

    device = torch.device("mps" if torch.backends.mps.is_available()
                          else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"📱 Device: {device}")

    train_samples, val_samples, test_samples = build_samples()

    # Class distribution
    for split_name, samples in [("Train", train_samples), ("Val", val_samples), ("Test", test_samples)]:
        counts = [0] * len(CLASSES)
        for _, lbl in samples:
            counts[lbl] += 1
        dist = ", ".join(f"{CLASSES[i]}={counts[i]}" for i in range(len(CLASSES)))
        print(f"   {split_name}: {len(samples)} ({dist})")

    train_ds = CombinedXrayDataset(train_samples, get_transforms(True))
    val_ds = CombinedXrayDataset(val_samples, get_transforms(False))
    test_ds = CombinedXrayDataset(test_samples, get_transforms(False))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Class weights for imbalance
    train_labels = [s[1] for s in train_samples]
    class_counts = np.bincount(train_labels, minlength=len(CLASSES)).astype(float)
    weights = 1.0 / class_counts
    weights = weights / weights.sum() * len(CLASSES)
    class_weights = torch.tensor(weights, dtype=torch.float32).to(device)
    print(f"   Class weights: {[f'{w:.2f}' for w in weights]}")

    # Model
    print(f"\n🧠 Building DenseNet-121 (3-class)...")
    model = models.densenet121(weights="IMAGENET1K_V1")
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(model.classifier.in_features, len(CLASSES)),
    )
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    best_val_acc = 0.0
    best_epoch = 0
    patience_counter = 0

    print(f"\n🚀 Training for {EPOCHS} epochs...")
    print("-" * 60)

    for epoch in range(EPOCHS):
        t0 = time.time()

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
            if (i + 1) % 40 == 0:
                print(f"  Epoch {epoch+1} [{i+1}/{len(train_loader)}] "
                      f"Loss: {loss.item():.4f} Acc: {correct/total*100:.1f}%")
        train_acc = correct / total

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
                    "modality": "xray",
                },
                "classes": CLASSES,
                "best_val_acc": best_val_acc,
                "epoch": epoch + 1,
            }, os.path.join(MODEL_DIR, "xray_combined_densenet121.pth"))
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
    ckpt = torch.load(os.path.join(MODEL_DIR, "xray_combined_densenet121.pth"), map_location=device)
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
    print(f"\n🏆 Best model: xray_combined_densenet121.pth (val: {best_val_acc*100:.2f}%)")
    print(f"✅ Done!")


if __name__ == "__main__":
    main()
