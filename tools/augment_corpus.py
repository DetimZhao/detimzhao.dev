#!/usr/bin/env python3
"""Augment the existing corpus with common ML/AI terminology terms.

Loads the existing corpus, adds terminology items with fresh embeddings
(same model: all-MiniLM-L6-v2), refits PCA-3, recomputes nearest neighbors,
and writes the augmented corpus files.
"""

import argparse
import gzip
import hashlib
import json
import logging
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from tqdm import tqdm

log = logging.getLogger(__name__)

MODEL_ID = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

TERMINOLOGY = [
    # --- Model architectures ---
    ("CNN", "Convolutional Neural Network for grid-structured data like images."),
    ("RNN", "Recurrent Neural Network for sequential data processing."),
    ("LSTM", "Long Short-Term Memory network, a gated RNN variant."),
    ("GRU", "Gated Recurrent Unit, a lighter RNN variant with reset and update gates."),
    ("GAN", "Generative Adversarial Network: a generator and discriminator trained adversarially."),
    ("VAE", "Variational Autoencoder: a generative model with a probabilistic latent space."),
    ("U-Net", "U-shaped convolutional architecture for image segmentation."),
    ("ResNet", "Residual Network with skip connections for very deep architectures."),
    ("ViT", "Vision Transformer: applying transformer architecture to image patches."),
    ("Stable Diffusion", "Latent diffusion model for text-to-image generation."),
    ("Diffusion", "Diffusion models: generative models that reverse a noise process."),
    ("GPT", "Generative Pre-trained Transformer for autoregressive language modeling."),
    ("BERT", "Bidirectional Encoder Representations from Transformers by Google."),
    ("RoBERTa", "Robustly optimized BERT pretraining approach by Meta."),
    ("T5", "Text-to-Text Transfer Transformer: unified text-to-text framework."),
    ("BART", "Bidirectional and Auto-Regressive Transformer for sequence-to-sequence tasks."),
    ("CLIP", "Contrastive Language-Image Pre-training connecting vision and language."),
    ("DALL-E", "Text-to-image generation model by OpenAI."),
    ("Llama", "Meta's open-weight large language model family."),
    ("Mistral", "Mistral AI's efficient open-weight language models."),
    ("DistilBERT", "Distilled version of BERT: 40% smaller, 60% faster, 97% performance."),
    ("ALBERT", "A Lite BERT for self-supervised learning with parameter sharing."),
    ("XLNet", "Generalized autoregressive pretraining combining AR and AE objectives."),
    ("ELECTRA", "Efficiently Learning an Encoder that Classifies Token Replacements Accurately."),
    ("DeBERTa", "Decoding-enhanced BERT with disentangled attention."),
    ("GPT-2", "OpenAI's 1.5B parameter transformer language model."),
    ("GPT-3", "OpenAI's 175B parameter few-shot language model."),
    ("GPT-4", "OpenAI's multimodal large language model."),
    ("Gemma", "Google's lightweight open model family."),
    ("Gemini", "Google's multimodal large language model."),
    ("Claude", "Anthropic's constitutional AI assistant model."),
    ("Whisper", "OpenAI's general-purpose speech recognition model."),
    ("YOLO", "You Only Look Once: real-time object detection system."),
    ("SAM", "Segment Anything Model by Meta for promptable image segmentation."),
    ("DiT", "Diffusion Transformer: transformer-based diffusion models for images."),
    ("MoE", "Mixture of Experts: routing inputs to specialized model sub-networks."),
    ("Mamba", "Selective state space model for efficient sequence modeling."),

    # --- Techniques & concepts ---
    ("transfer learning", "Applying knowledge from one task to improve learning on another task."),
    ("fine-tuning", "Adapting a pretrained model to a downstream task with additional training."),
    ("zero-shot", "Zero-shot learning: performing tasks without task-specific training examples."),
    ("few-shot", "Few-shot learning: performing tasks given only a few training examples."),
    ("RAG", "Retrieval-Augmented Generation: grounding LLM outputs in retrieved documents."),
    ("RLHF", "Reinforcement Learning from Human Feedback to align models with preferences."),
    ("LoRA", "Low-Rank Adaptation: efficient fine-tuning via low-rank weight matrices."),
    ("QLoRA", "Quantized LoRA: 4-bit quantized low-rank adaptation for memory efficiency."),
    ("quantization", "Reducing model precision from FP32 to INT8/4 for efficiency."),
    ("pruning", "Removing unnecessary weights or neurons to reduce model size."),
    ("distillation", "Knowledge distillation: training a small model to mimic a larger one."),
    ("attention mechanism", "Mechanism allowing models to focus on relevant parts of input."),
    ("self-attention", "Attention where query, key, and value come from the same sequence."),
    ("cross-attention", "Attention where query and key/value come from different sequences."),
    ("multi-head attention", "Multiple parallel attention heads capturing different representation subspaces."),
    ("positional encoding", "Encodings added to token embeddings to represent sequence position."),
    ("tokenization", "Splitting text into tokens for model input (BPE, WordPiece, SentencePiece)."),
    ("tokenizer", "The tokenization component that converts text into model-readable tokens."),
    ("gradient descent", "Iterative optimization algorithm moving in direction of steepest descent."),
    ("backpropagation", "Algorithm for computing gradients through neural networks via chain rule."),
    ("Adam", "Adaptive Moment Estimation optimizer combining momentum and RMSprop."),
    ("AdamW", "Adam with decoupled weight decay for better generalization."),
    ("dropout", "Regularization technique randomly dropping units during training."),
    ("batch normalization", "Normalizing layer inputs per mini-batch for faster stable training."),
    ("layer normalization", "Normalizing inputs across features independently per sample."),
    ("data augmentation", "Artificially expanding training data via transformations."),
    ("weight decay", "L2 regularization penalty added to loss to prevent overfitting."),
    ("learning rate schedule", "Strategy for adjusting learning rate during training."),
    ("warmup", "Gradually increasing learning rate at training start for stability."),
    ("cosine annealing", "Learning rate schedule following a cosine curve."),
    ("early stopping", "Stopping training when validation performance stops improving."),
    ("cross-validation", "Evaluating model by partitioning data into train/validation folds."),
    ("hyperparameter tuning", "Optimizing model configuration settings for best performance."),
    ("overfitting", "Model memorizing training data instead of learning generalizable patterns."),
    ("underfitting", "Model failing to capture underlying patterns in the data."),
    ("loss function", "Objective function measuring model prediction error to minimize."),
    ("cross-entropy", "Loss function measuring difference between predicted and true distributions."),
    ("MSE", "Mean Squared Error: average squared difference between predictions and targets."),
    ("MAE", "Mean Absolute Error: average absolute difference between predictions and targets."),
    ("cosine similarity", "Measure of similarity between two vectors based on angle cosine."),
    ("KL divergence", "Kullback-Leibler divergence measuring distribution difference."),
    ("perplexity", "Metric for language model quality: exponential of average negative log-likelihood."),
    ("BLEU", "Bilingual Evaluation Understudy: metric for machine translation quality."),
    ("ROUGE", "Recall-Oriented Understudy for Gisting Evaluation: summarization metric."),
    ("F1 score", "Harmonic mean of precision and recall for classification evaluation."),
    ("accuracy", "Fraction of correct predictions among total predictions."),
    ("precision", "Fraction of true positives among all positive predictions."),
    ("recall", "Fraction of true positives among all actual positive instances."),
    ("AUC", "Area Under the ROC Curve: aggregate classification performance measure."),
    ("ROC", "Receiver Operating Characteristic curve plotting TPR vs FPR."),

    # --- Domains ---
    ("NLP", "Natural Language Processing: computational processing of human language."),
    ("computer vision", "Field of AI enabling machines to interpret visual information."),
    ("reinforcement learning", "Learning through interaction with an environment to maximize reward."),
    ("deep learning", "Neural networks with multiple layers for hierarchical feature learning."),
    ("machine learning", "Algorithms that improve through experience without explicit programming."),
    ("artificial intelligence", "Simulation of human intelligence processes by machines."),
    ("supervised learning", "Learning from labeled training data mapping inputs to outputs."),
    ("unsupervised learning", "Finding patterns in unlabeled data without explicit supervision."),
    ("semi-supervised learning", "Learning from a mix of a small labeled and large unlabeled dataset."),
    ("self-supervised learning", "Learning representations from unlabeled data via pretext tasks."),
    ("transformers", "Attention-based neural network architecture dominant in NLP and beyond."),
    ("neural network", "Computing system inspired by biological neurons arranged in layers."),
    ("large language model", "Large-scale transformer models trained on vast text corpora."),
    ("LLM", "Large Language Model: transformer models at billion-parameter scale."),
    ("language model", "Probability distribution over sequences of words."),
    ("chatbot", "Conversational AI system interacting through natural language dialogue."),
    ("embeddings", "Dense vector representations of words, sentences, or concepts."),
    ("vector database", "Database optimized for storing and querying vector embeddings."),
    ("GPU", "Graphics Processing Unit used for parallel neural network computation."),
    ("TPU", "Tensor Processing Unit: Google's custom ASIC for machine learning workloads."),
    ("CUDA", "NVIDIA's parallel computing platform for GPU-accelerated deep learning."),
    ("PyTorch", "Open-source deep learning framework by Meta with dynamic computation graphs."),
    ("TensorFlow", "Google's open-source framework for machine learning and neural networks."),
    ("JAX", "High-performance numerical computing library with automatic differentiation."),
    ("ONNX", "Open Neural Network Exchange: interoperable model format across frameworks."),
    ("HuggingFace", "Platform and library hub for pretrained models, datasets, and spaces."),
    ("scikit-learn", "Python machine learning library built on NumPy and SciPy."),
    ("NumPy", "Fundamental Python package for numerical and array computing."),

    # --- Famous benchmarks & datasets ---
    ("ImageNet", "Large-scale image dataset with 14M+ labeled images across 20K categories."),
    ("MNIST", "Dataset of 70,000 handwritten digit images for benchmarking classification."),
    ("CIFAR-10", "60,000 32x32 color images in 10 classes for image classification."),
    ("COCO", "Common Objects in Context: large-scale object detection and segmentation dataset."),
    ("GLUE", "General Language Understanding Evaluation benchmark for NLP models."),
    ("SuperGLUE", "More challenging successor to GLUE for evaluating language understanding."),
    ("MMLU", "Massive Multitask Language Understanding: 57-subject benchmark."),
    ("SQuAD", "Stanford Question Answering Dataset for reading comprehension."),
    ("HumanEval", "Code generation benchmark of 164 programming problems."),

    # --- Key concepts ---
    ("latent space", "Compressed representation space learned by an autoencoder or generative model."),
    ("attention", "Neural mechanism for selectively focusing on relevant input parts."),
    ("transformer", "Attention-based neural architecture that revolutionized NLP and vision."),
    ("pretraining", "Initial model training on large general corpora before task-specific tuning."),
    ("inference", "Using a trained model to make predictions on new input data."),
    ("training", "Process of optimizing model parameters to minimize loss on data."),
    ("generation", "Producing new content (text, images) from learned distributions."),
    ("classification", "Assigning input to one of several predefined categories."),
    ("regression", "Predicting a continuous numerical value from input features."),
    ("segmentation", "Partitioning an image into meaningful regions at the pixel level."),
    ("object detection", "Locating and classifying objects within images."),
    ("sentiment analysis", "Determining the emotional tone or opinion expressed in text."),
    ("named entity recognition", "Identifying and classifying named entities in text."),
    ("question answering", "Automatically answering questions posed in natural language."),
    ("summarization", "Generating a concise version of a longer text preserving key information."),
    ("translation", "Converting text from one language to another via machine translation."),
    ("text generation", "Automatically producing coherent natural language text."),
    ("code generation", "Automatically generating programming code from natural language prompts."),
    ("image generation", "Creating new images from text descriptions or latent representations."),
    ("speech recognition", "Converting spoken language audio to text."),
    ("anomaly detection", "Identifying rare items or outliers that differ from the majority."),
    ("clustering", "Grouping similar data points without predefined labels."),
    ("dimensionality reduction", "Reducing the number of features while preserving data structure."),
    ("PCA", "Principal Component Analysis: linear dimensionality reduction technique."),
    ("t-SNE", "t-distributed Stochastic Neighbor Embedding for high-dimensional visualization."),
    ("UMAP", "Uniform Manifold Approximation and Projection for dimensionality reduction."),
    ("autoencoder", "Neural network learning to reconstruct its input through a bottleneck."),
    ("encoder", "Neural component that maps input to a latent representation."),
    ("decoder", "Neural component that maps a latent representation back to output space."),
    ("seq2seq", "Sequence-to-sequence model mapping variable-length input to variable-length output."),
    ("beam search", "Search algorithm maintaining k best candidate sequences during decoding."),
    ("greedy decoding", "Selecting the most likely token at each generation step."),
    ("temperature", "Parameter controlling randomness in sampling from model output distribution."),
    ("top-k sampling", "Sampling from the k most likely tokens during text generation."),
    ("top-p sampling", "Nucleus sampling: sampling from the smallest token set with cumulative probability p."),
    ("chatGPT", "OpenAI's conversational large language model."),
    ("prompt engineering", "Crafting input prompts to elicit desired outputs from language models."),
    ("hallucination", "Language model generating plausible-sounding but factually incorrect content."),
    ("alignment", "Ensuring model behavior matches human values and intentions."),
    ("constitutional AI", "Training AI systems using a set of rules or principles for alignment."),
    ("scaling laws", "Empirical relationships between model size, data, compute, and performance."),
    ("mixture of experts", "Neural architecture routing different inputs to specialized sub-models."),
    ("flash attention", "Memory-efficient exact attention algorithm for faster transformer training."),
    ("speculative decoding", "Using a draft model to accelerate large model inference."),
    ("KV cache", "Caching key-value pairs in transformer decoder to avoid recomputation."),
    ("computational graph", "Directed graph representing mathematical operations for automatic differentiation."),
    ("autograd", "Automatic differentiation system for computing gradients in neural networks."),
]


def load_corpus(corpus_path):
    with gzip.open(corpus_path, "rt", encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items", [])
    pca_meta = data.get("pca", {})
    model_meta = data.get("model", {})
    return items, pca_meta, model_meta


def build_embedding_input(name, desc):
    return f"{name}: {desc}".strip()


def cosine_sim(a, b):
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a_norm, b_norm))


def compute_nn(vectors, corpus_names, k=10):
    n = len(vectors)
    nn = []
    for i in tqdm(range(n), desc="Computing nearest neighbors"):
        scores = []
        for j in range(n):
            if i == j:
                continue
            scores.append((corpus_names[j], cosine_sim(vectors[i], vectors[j])))
        scores.sort(key=lambda x: x[1], reverse=True)
        nn.append(scores[:k])
    return nn


def main():
    parser = argparse.ArgumentParser(description="Augment corpus with ML terminology")
    parser.add_argument("--out", default="data/", help="Output directory")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

    out_dir = Path(args.out)
    corpus_path = out_dir / "corpus.json.gz"
    vec_path = out_dir / "corpus.vec.f32"

    log.info("Loading existing corpus from %s", corpus_path)
    items, pca_meta, model_meta = load_corpus(corpus_path)
    old_count = len(items)
    old_names = {item["name"] for item in items}
    log.info("Loaded %d existing items", old_count)

    # Filter out terms already in corpus
    new_terms = [(name, desc) for name, desc in TERMINOLOGY if name.lower() not in old_names]
    log.info("Adding %d new terminology items (%d already present, skipped %d)",
             len(new_terms),
             len(TERMINOLOGY) - len(new_terms),
             len(TERMINOLOGY) - len(new_terms))

    if not new_terms:
        log.info("No new terms to add; corpus is already complete.")
        return

    # Load existing vectors
    log.info("Loading existing vectors from %s", vec_path)
    existing_vectors = np.fromfile(vec_path, dtype=np.float32).reshape(old_count, EMBEDDING_DIM)

    # Embed new terms
    log.info("Loading embedding model %s", MODEL_ID)
    model = SentenceTransformer(MODEL_ID)

    texts = [build_embedding_input(name, desc) for name, desc in new_terms]
    log.info("Embedding %d new terms", len(texts))
    new_vectors = model.encode(texts, batch_size=64, show_progress_bar=True)

    # Build new items
    new_items = []
    for (name, desc), vec in zip(new_terms, new_vectors):
        new_items.append({
            "id": f"term-{name.lower().replace(' ', '-').replace('.', '')}",
            "name": name.lower(),
            "source": "ml-terminology",
            "source_url": "",
            "description": desc,
            "pos": None,  # filled after PCA
            "nn": [],     # filled after NN
        })

    all_items = items + new_items
    all_vectors = np.vstack([existing_vectors, np.array(new_vectors, dtype=np.float32)])
    total = len(all_items)
    log.info("Combined corpus: %d items (%d existing + %d new)", total, old_count, len(new_items))

    # Re-fit PCA-3
    log.info("Fitting PCA-3 on %d vectors ...", total)
    pca = PCA(n_components=3)
    projections = pca.fit_transform(all_vectors)
    log.info("PCA variance explained: %.2f%%", sum(pca.explained_variance_ratio_) * 100)

    # Min-max normalize to ~±10 (capture bounds first so the frontend can
    # project new result vectors into the same space)
    pos_min = projections.min(axis=0).tolist()
    pos_max = projections.max(axis=0).tolist()
    projections -= pos_min
    projections /= (np.asarray(pos_max) - np.asarray(pos_min))
    projections = (projections - 0.5) * 20

    # Update positions
    for i, item in enumerate(all_items):
        item["pos"] = [float(v) for v in projections[i]]

    # Recompute nearest neighbors
    log.info("Computing nearest neighbors for %d items", total)
    all_names = [item["name"] for item in all_items]
    nn_results = compute_nn(all_vectors, all_names)
    for i, item in enumerate(all_items):
        item["nn"] = [{"name": name, "score": round(score, 4)} for name, score in nn_results[i]]

    # Update model metadata
    model_meta["corpus_count"] = total
    model_meta["terminology_added"] = len(new_items)

    # Compute vector-file integrity hash before writing metadata
    vec_bytes = all_vectors.astype(np.float32).tobytes()
    model_meta["vec_sha256"] = hashlib.sha256(vec_bytes).hexdigest()

    # Write output
    output = {
        "items": all_items,
        "pca": {
            "mean": pca.mean_.tolist(),
            "components": pca.components_.tolist(),
            "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
            "pos_min": pos_min,
            "pos_max": pos_max,
        },
        "model": model_meta,
    }

    log.info("Writing corpus.json.gz ...")
    with gzip.open(corpus_path, "wt", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    log.info("Writing corpus.vec.f32 (%d × %d) ...", total, EMBEDDING_DIM)
    with open(vec_path, "wb") as f:
        f.write(vec_bytes)

    size_mb = corpus_path.stat().st_size / (1024 * 1024)
    log.info("Done. %d items, corpus.json.gz: %.1f MB", total, size_mb)


if __name__ == "__main__":
    main()
