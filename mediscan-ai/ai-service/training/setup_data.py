#!/usr/bin/env python3
"""
MediScan AI — Quick Dataset Setup
Interactive script to configure Kaggle credentials and download datasets.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from getpass import getpass

KAGGLE_DIR = Path.home() / ".kaggle"
KAGGLE_JSON = KAGGLE_DIR / "kaggle.json"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def setup_kaggle_credentials():
    """Set up Kaggle API credentials interactively."""
    if KAGGLE_JSON.exists():
        print("✅ Kaggle credentials found")
        return True

    print("\n" + "=" * 60)
    print("  Kaggle API Setup")
    print("=" * 60)
    print()
    print("  To get your API key:")
    print("  1. Go to https://www.kaggle.com/settings")
    print("  2. Scroll to 'API' section")
    print("  3. Click 'Create New Token'")
    print()

    username = input("  Kaggle username: ").strip()
    if not username:
        print("❌ Username required")
        return False

    api_key = getpass("  Kaggle API key: ").strip()
    if not api_key:
        print("❌ API key required")
        return False

    # Save credentials
    KAGGLE_DIR.mkdir(parents=True, exist_ok=True)
    creds = {"username": username, "key": api_key}
    KAGGLE_JSON.write_text(json.dumps(creds))
    os.chmod(str(KAGGLE_JSON), 0o600)
    print("✅ Credentials saved to ~/.kaggle/kaggle.json\n")
    return True


def download_dataset(slug: str, name: str):
    """Download a Kaggle dataset."""
    print(f"\n📥 Downloading {name}...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        ["kaggle", "datasets", "download", "-d", slug, "-p", str(DATA_DIR), "--unzip"],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        print(f"✅ {name} downloaded successfully")
        return True
    else:
        print(f"❌ Download failed: {result.stderr}")
        return False


def count_images(directory: Path) -> dict:
    """Count images in directory structure."""
    stats = {}
    img_exts = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
    for split_dir in sorted(directory.iterdir()):
        if not split_dir.is_dir():
            continue
        classes = {}
        for class_dir in sorted(split_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            count = sum(1 for f in class_dir.iterdir() if f.suffix.lower() in img_exts)
            classes[class_dir.name] = count
        if classes:
            stats[split_dir.name] = classes
    return stats


def main():
    print("\n" + "=" * 60)
    print("  MediScan AI — Dataset Setup")
    print("=" * 60)

    # Step 1: Kaggle credentials
    if not setup_kaggle_credentials():
        sys.exit(1)

    # Step 2: Download datasets
    datasets = [
        ("paultimothymooney/chest-xray-pneumonia", "Chest X-Ray Pneumonia"),
        ("masoudnickparvar/brain-tumor-mri-dataset", "Brain Tumor MRI"),
    ]

    for slug, name in datasets:
        download_dataset(slug, name)

    # Step 3: Validate
    print("\n" + "=" * 60)
    print("  Dataset Validation")
    print("=" * 60)

    # Check chest_xray
    xray_dir = DATA_DIR / "chest_xray"
    if not xray_dir.exists():
        # Check alternate names
        for alt in ["chest-xray-pneumonia"]:
            alt_path = DATA_DIR / alt
            if alt_path.exists():
                # Find the actual data subdir
                for child in alt_path.iterdir():
                    if child.is_dir() and (child / "train").exists():
                        child.rename(xray_dir)
                        break
                else:
                    alt_path.rename(xray_dir)
                break

    if xray_dir.exists():
        stats = count_images(xray_dir)
        total = sum(c for split in stats.values() for c in split.values())
        print(f"\n📊 Chest X-Ray: {total} images")
        for split, classes in stats.items():
            print(f"   {split}: {dict(classes)}")
    else:
        print(f"\n⚠️  Chest X-Ray data not found at {xray_dir}")

    # Check brain_tumor
    brain_dir = DATA_DIR / "brain_tumor"
    if not brain_dir.exists():
        for alt in ["brain-tumor-mri-dataset"]:
            alt_path = DATA_DIR / alt
            if alt_path.exists():
                alt_path.rename(brain_dir)
                break

    if brain_dir.exists():
        stats = count_images(brain_dir)
        total = sum(c for split in stats.values() for c in split.values())
        print(f"\n📊 Brain Tumor MRI: {total} images")
        for split, classes in stats.items():
            print(f"   {split}: {dict(classes)}")
    else:
        print(f"\n⚠️  Brain Tumor data not found at {brain_dir}")

    print("\n✅ Dataset setup complete!")
    print("   Now run the training scripts:")
    print("   python training/train_xray.py")
    print("   python training/train_brain.py")


if __name__ == "__main__":
    main()
