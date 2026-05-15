"""
MediScan AI — Dataset Download Utility
Downloads medical imaging datasets from Kaggle or direct URLs.
"""

import os
import sys
import zipfile
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

DATASETS = {
    "chest_xray": {
        "kaggle": "paultimothymooney/chest-xray-pneumonia",
        "name": "Chest X-Ray Images (Pneumonia)",
        "extract_to": "chest_xray",
    },
    "brain_tumor": {
        "kaggle": "masoudnickparvar/brain-tumor-mri-dataset",
        "name": "Brain Tumor MRI Dataset",
        "extract_to": "brain_tumor",
    },
}


def download_kaggle(dataset_key: str):
    """Download dataset using Kaggle API."""
    info = DATASETS[dataset_key]
    dest = DATA_DIR / info["extract_to"]

    if dest.exists() and any(dest.iterdir()):
        print(f"✅ {info['name']} already exists at {dest}")
        return dest

    print(f"📥 Downloading {info['name']} via Kaggle API...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        api.dataset_download_files(
            info["kaggle"],
            path=str(DATA_DIR),
            unzip=True,
        )
        # Kaggle may extract into a subdirectory — rename if needed
        _fix_directory_structure(dataset_key)
        print(f"✅ Downloaded to {dest}")
        return dest
    except ImportError:
        print("❌ Kaggle API not installed. Install with: pip install kaggle")
        print("   Then set up your API key: https://www.kaggle.com/docs/api")
        print(f"\n   Or manually download from: https://www.kaggle.com/datasets/{info['kaggle']}")
        print(f"   Extract to: {dest}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Kaggle download failed: {e}")
        print(f"   Manually download from: https://www.kaggle.com/datasets/{info['kaggle']}")
        print(f"   Extract to: {dest}")
        sys.exit(1)


def download_from_zip(url: str, dataset_key: str):
    """Download dataset from a direct ZIP URL."""
    info = DATASETS[dataset_key]
    dest = DATA_DIR / info["extract_to"]

    if dest.exists() and any(dest.iterdir()):
        print(f"✅ {info['name']} already exists at {dest}")
        return dest

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / f"{dataset_key}.zip"

    print(f"📥 Downloading {info['name']}...")
    urllib.request.urlretrieve(url, str(zip_path))

    print(f"📦 Extracting...")
    with zipfile.ZipFile(str(zip_path), 'r') as z:
        z.extractall(str(DATA_DIR))

    zip_path.unlink()
    _fix_directory_structure(dataset_key)
    print(f"✅ Dataset ready at {dest}")
    return dest


def _fix_directory_structure(dataset_key: str):
    """Fix directory naming after extraction."""
    info = DATASETS[dataset_key]
    dest = DATA_DIR / info["extract_to"]

    if dataset_key == "chest_xray":
        # Kaggle extracts to 'chest_xray' directly
        alt = DATA_DIR / "chest_xray"
        if not dest.exists() and alt.exists():
            alt.rename(dest)
    elif dataset_key == "brain_tumor":
        # May extract to different names
        for alt_name in ["brain-tumor-mri-dataset", "Brain Tumor MRI Dataset"]:
            alt = DATA_DIR / alt_name
            if alt.exists() and not dest.exists():
                alt.rename(dest)


def validate_dataset(dataset_key: str) -> dict:
    """Validate downloaded dataset structure and count images."""
    info = DATASETS[dataset_key]
    dest = DATA_DIR / info["extract_to"]

    if not dest.exists():
        return {"valid": False, "error": f"Directory not found: {dest}"}

    stats = {"valid": True, "path": str(dest), "splits": {}}
    img_exts = {".jpg", ".jpeg", ".png", ".tiff", ".bmp"}

    for split_dir in sorted(dest.iterdir()):
        if not split_dir.is_dir():
            continue
        split_name = split_dir.name
        classes = {}
        for class_dir in sorted(split_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            count = sum(1 for f in class_dir.iterdir() if f.suffix.lower() in img_exts)
            classes[class_dir.name] = count
        if classes:
            stats["splits"][split_name] = classes

    total = sum(c for split in stats["splits"].values() for c in split.values())
    stats["total_images"] = total
    return stats


def setup_manual_dataset(dataset_key: str):
    """Print instructions for manual dataset setup."""
    info = DATASETS[dataset_key]
    dest = DATA_DIR / info["extract_to"]
    print(f"\n{'='*60}")
    print(f"  {info['name']}")
    print(f"{'='*60}")
    print(f"  1. Go to: https://www.kaggle.com/datasets/{info['kaggle']}")
    print(f"  2. Click 'Download' (you need a free Kaggle account)")
    print(f"  3. Extract the ZIP to: {dest}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download MediScan AI datasets")
    parser.add_argument("--dataset", choices=["chest_xray", "brain_tumor", "all"], default="all")
    parser.add_argument("--method", choices=["kaggle", "manual"], default="kaggle")
    args = parser.parse_args()

    targets = list(DATASETS.keys()) if args.dataset == "all" else [args.dataset]

    for key in targets:
        if args.method == "manual":
            setup_manual_dataset(key)
        else:
            download_kaggle(key)
            stats = validate_dataset(key)
            if stats["valid"]:
                print(f"\n📊 {DATASETS[key]['name']}:")
                print(f"   Total images: {stats['total_images']}")
                for split, classes in stats["splits"].items():
                    print(f"   {split}: {dict(classes)}")
