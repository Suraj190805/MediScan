"""
MediScan AI — Medical Image Dataset & Augmentations
PyTorch Dataset with CLAHE preprocessing and medical-specific augmentations.
"""

import cv2
import numpy as np
from pathlib import Path
from PIL import Image
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
import torch


class MedicalImageDataset(Dataset):
    """
    PyTorch Dataset for medical images organized in ImageFolder structure:
      root/class_a/img001.jpg
      root/class_b/img002.jpg
    """

    def __init__(self, root_dir: str, transform=None, apply_clahe: bool = True):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.apply_clahe = apply_clahe

        # Scan directory
        self.classes = sorted([
            d.name for d in self.root_dir.iterdir()
            if d.is_dir() and not d.name.startswith('.')
        ])
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}

        self.samples = []
        img_exts = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'}
        for cls_name in self.classes:
            cls_dir = self.root_dir / cls_name
            for img_path in sorted(cls_dir.iterdir()):
                if img_path.suffix.lower() in img_exts:
                    self.samples.append((str(img_path), self.class_to_idx[cls_name]))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]

        # Load image
        image = cv2.imread(img_path)
        if image is None:
            # Fallback to PIL
            image = np.array(Image.open(img_path).convert('RGB'))
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        if self.apply_clahe:
            image = self._apply_clahe(image)

        # Convert BGR → RGB for PIL/torchvision
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(image)

        if self.transform:
            image = self.transform(image)

        return image, label

    def _apply_clahe(self, image):
        """Apply CLAHE to enhance contrast — critical for medical images."""
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            image = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            image = clahe.apply(image)
        return image

    def get_class_weights(self) -> torch.Tensor:
        """Compute inverse frequency weights for imbalanced classes."""
        class_counts = [0] * len(self.classes)
        for _, label in self.samples:
            class_counts[label] += 1

        total = sum(class_counts)
        weights = [total / (len(self.classes) * c) for c in class_counts]
        return torch.FloatTensor(weights)

    def get_sampler(self) -> WeightedRandomSampler:
        """Create weighted random sampler for balanced training."""
        class_counts = [0] * len(self.classes)
        for _, label in self.samples:
            class_counts[label] += 1

        sample_weights = []
        for _, label in self.samples:
            sample_weights.append(1.0 / class_counts[label])

        return WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(sample_weights),
            replacement=True,
        )


def get_train_transforms(img_size: int = 224):
    """Training transforms with medical-specific augmentations."""
    return transforms.Compose([
        transforms.Resize((img_size + 32, img_size + 32)),
        transforms.RandomCrop(img_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05), scale=(0.95, 1.05)),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],  # ImageNet stats
            std=[0.229, 0.224, 0.225],
        ),
    ])


def get_val_transforms(img_size: int = 224):
    """Validation/test transforms — deterministic, no augmentation."""
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def create_dataloaders(
    train_dir: str,
    val_dir: str,
    test_dir: str = None,
    img_size: int = 224,
    batch_size: int = 32,
    num_workers: int = 4,
    use_weighted_sampler: bool = True,
):
    """Create train/val/test DataLoaders with proper augmentations."""
    train_dataset = MedicalImageDataset(train_dir, transform=get_train_transforms(img_size))
    val_dataset = MedicalImageDataset(val_dir, transform=get_val_transforms(img_size))

    train_sampler = train_dataset.get_sampler() if use_weighted_sampler else None

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        sampler=train_sampler,
        shuffle=(train_sampler is None),
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    loaders = {"train": train_loader, "val": val_loader}

    if test_dir:
        test_dataset = MedicalImageDataset(test_dir, transform=get_val_transforms(img_size))
        loaders["test"] = DataLoader(
            test_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=num_workers,
            pin_memory=True,
        )

    return loaders, train_dataset.classes, train_dataset.get_class_weights()
