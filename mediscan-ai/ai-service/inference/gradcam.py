"""
MediScan AI — Grad-CAM Heatmap Generator
Generates visual explanations for DenseNet-121 predictions.
"""

import numpy as np
import cv2
import torch
import torch.nn.functional as F
from PIL import Image
import base64
import io


class GradCAM:
    """
    Gradient-weighted Class Activation Mapping.
    Generates heatmaps showing which regions of an image
    the model focused on for its prediction.

    Uses a hook-free approach to avoid PyTorch autograd
    view+inplace conflicts with DenseNet BatchNorm layers.
    """

    def __init__(self, model, target_layer_name=None):
        self.model = model

    def generate(self, input_tensor, target_class=None):
        """
        Generate Grad-CAM heatmap using manual feature extraction.

        Args:
            input_tensor: Preprocessed image tensor [1, 3, H, W]
            target_class: Class index to explain. If None, uses predicted class.

        Returns:
            heatmap: numpy array [H, W] with values 0-1
            predicted_class: int
            confidence: float
        """
        self.model.eval()

        # We need gradients for this pass
        input_tensor = input_tensor.clone().requires_grad_(True)

        # ── Manual forward through DenseNet ──
        # Extract features up to the last conv layer
        features = self.model.features(input_tensor)
        # DenseNet applies ReLU after features before pooling
        features_relu = F.relu(features, inplace=False)

        # Store activations (detached copy)
        activations = features_relu.detach()

        # Continue forward: adaptive avg pool → flatten → classifier
        pooled = F.adaptive_avg_pool2d(features_relu, (1, 1))
        flat = torch.flatten(pooled, 1)
        output = self.model.classifier(flat)
        probs = F.softmax(output, dim=1)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        confidence = probs[0, target_class].item()

        # Get gradients w.r.t. the feature maps using autograd.grad
        self.model.zero_grad()
        target_score = output[0, target_class]

        grad_output = torch.autograd.grad(
            outputs=target_score,
            inputs=features_relu,
            retain_graph=False,
            create_graph=False,
        )[0]

        gradients = grad_output[0]  # [C, H, W]
        acts = activations[0]  # [C, H, W]

        # Global average pooling of gradients → channel weights
        weights = gradients.mean(dim=(1, 2))  # [C]

        # Weighted combination of activations
        heatmap = (weights[:, None, None] * acts).sum(dim=0)

        # ReLU — keep only positive contributions
        heatmap = F.relu(heatmap)

        # Normalize to [0, 1]
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()

        heatmap = heatmap.cpu().numpy()
        return heatmap, target_class, confidence

    def overlay_heatmap(self, original_image, heatmap, alpha=0.4, colormap=cv2.COLORMAP_JET):
        """Overlay heatmap on original image."""
        if isinstance(original_image, Image.Image):
            original_image = np.array(original_image)

        h, w = original_image.shape[:2]

        # Resize heatmap to match original image
        heatmap_resized = cv2.resize(heatmap, (w, h))

        # Apply colormap
        heatmap_colored = cv2.applyColorMap(
            np.uint8(255 * heatmap_resized), colormap
        )
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Overlay
        overlaid = np.float32(original_image) * (1 - alpha) + np.float32(heatmap_colored) * alpha
        overlaid = np.clip(overlaid, 0, 255).astype(np.uint8)

        return overlaid

    def to_base64(self, image_array, format="PNG"):
        """Convert numpy image to base64 string for API response."""
        pil_img = Image.fromarray(image_array)
        buffer = io.BytesIO()
        pil_img.save(buffer, format=format)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
