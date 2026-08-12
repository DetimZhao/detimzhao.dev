#!/usr/bin/env python3
"""Offline corpus generator for the Semantic Arithmetic Playground.

Generates a frozen ~3000-item AI/ML concept corpus with MiniLM-L6-v2 embeddings,
PCA-3 projection, and precomputed nearest neighbors.

Sources: HuggingFace Hub, arXiv, Wikipedia, PyTorch docs, scikit-learn docs,
         NLP/CV/RL terminology.

Usage:  python tools/generate_corpus.py --out data/
"""

import argparse
import gzip
import hashlib
import json
import logging
import re
import sys
import time
from pathlib import Path

import numpy as np
import requests
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from tqdm import tqdm

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_ID = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
BATCH_SIZE = 64
EXPECTED_TOTAL = 3000
MIN_SOURCE_FRAC = 0.5
CORPUS_VERSION = "1.0"
MAX_DESC_CHARS = 200

HUGGINGFACE_LIMIT = 1000
ARXIV_LIMIT = 500
WIKI_CATEGORIES = [
    "Machine_learning", "Deep_learning", "Natural_language_processing",
    "Computer_vision", "Reinforcement_learning",
]

PERMISSIVE_LICENSES = {
    "apache-2.0", "apache2.0", "apache2", "mit",
    "bsd", "bsd-2-clause", "bsd-3-clause", "bsd-2", "bsd-3",
    "cc-by-4.0", "cc0-1.0", "cc0",
    "openrail", "bigscience-openrail-m", "bigscience-bloom-rail-1.0",
    "creativeml-openrail-m",
}

SESSION = requests.Session()
SESSION.headers.setdefault("User-Agent",
    "semantic-arithmetic-corpus/1.0 (corpus generation tool)")
# Optional HF token for rate-limit bump
import os
HF_TOKEN = os.environ.get("HF_TOKEN")
if HF_TOKEN:
    SESSION.headers["Authorization"] = f"Bearer {HF_TOKEN}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

def slugify(name):
    """Convert a name into a stable file-/JSON-safe slug."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "unnamed"

def truncate(text, max_chars=MAX_DESC_CHARS):
    """Truncate text to max_chars, appending ellipsis if cut."""
    if not text:
        return ""
    text = " ".join(text.split())
    if len(text) <= max_chars:
        return text
    return text[:max_chars - 1].rstrip() + "…"

def fetch_url(url, timeout=30, **kwargs):
    """GET a URL with timeout and rate-limit-safe error handling."""
    try:
        resp = SESSION.get(url, timeout=timeout, **kwargs)
        resp.raise_for_status()
        return resp
    except requests.RequestException as e:
        log.warning("HTTP error fetching %s: %s", url[:120], e)
        return None

def fetch_json(url, timeout=30, **kwargs):
    """GET JSON from URL; returns dict or None on failure."""
    resp = fetch_url(url, timeout=timeout, **kwargs)
    if resp is None:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


# ---------------------------------------------------------------------------

# ============ Hardcoded corpus data ============

_PYTORCH_APIS = [
    ("torch.Tensor", "Multi-dimensional array with autograd and GPU acceleration."),
    ("torch.tensor", "Constructs a tensor with data, optionally specifying dtype and device."),
    ("torch.from_numpy", "Creates a Tensor from a numpy.ndarray sharing the underlying buffer."),
    ("torch.zeros", "Returns a tensor filled with the scalar value 0."),
    ("torch.ones", "Returns a tensor filled with the scalar value 1."),
    ("torch.rand", "Returns a tensor with random numbers from uniform [0, 1)."),
    ("torch.randn", "Returns a tensor with random numbers from standard normal distribution."),
    ("torch.randint", "Returns a tensor with random integers from a uniform distribution."),
    ("torch.randperm", "Returns a random permutation of integers from 0 to n-1."),
    ("torch.eye", "Returns a 2-D tensor with ones on the diagonal and zeros elsewhere."),
    ("torch.empty", "Returns a tensor filled with uninitialized data."),
    ("torch.full", "Creates a tensor of given size filled with a given value."),
    ("torch.arange", "Returns a 1-D tensor with evenly spaced values from start to end."),
    ("torch.linspace", "Returns a 1-D tensor of evenly spaced points between start and end."),
    ("torch.logspace", "Returns a 1-D tensor of logarithmically spaced points."),
    ("torch.cat", "Concatenates a sequence of tensors along an existing dimension."),
    ("torch.stack", "Concatenates a sequence of tensors along a new dimension."),
    ("torch.chunk", "Splits a tensor into a specific number of chunks along a dimension."),
    ("torch.split", "Splits a tensor into chunks of a specified size along a dimension."),
    ("torch.squeeze", "Removes dimensions of size 1 from the shape of a tensor."),
    ("torch.unsqueeze", "Inserts a dimension of size 1 at the specified position."),
    ("torch.reshape", "Returns a tensor with the same data but a different shape."),
    ("torch.view", "Returns a new tensor with the same data but different shape as a view."),
    ("torch.transpose", "Returns a transposed version of the input tensor."),
    ("torch.permute", "Returns a view of the tensor with its dimensions permuted."),
    ("torch.flatten", "Flattens a contiguous range of dims in a tensor."),
    ("torch.gather", "Gathers values along an axis specified by an index tensor."),
    ("torch.scatter", "Writes values into a tensor at indices along a given dimension."),
    ("torch.where", "Returns elements selected from inputs depending on a condition."),
    ("torch.clamp", "Clamps all elements in input to the range [min, max]."),
    ("torch.abs", "Computes the absolute value of each element in input."),
    ("torch.sqrt", "Returns the square-root of each element of input."),
    ("torch.exp", "Returns the exponential of each element of input."),
    ("torch.log", "Returns the natural logarithm of each element of input."),
    ("torch.pow", "Takes the power of each element in input with exponent."),
    ("torch.norm", "Returns the matrix norm or vector norm of a given tensor."),
    ("torch.sort", "Sorts the elements of the input tensor along a given dimension."),
    ("torch.argsort", "Returns the indices that sort a tensor along a given dimension."),
    ("torch.topk", "Returns the k largest elements of the input tensor along a dimension."),
    ("torch.unique", "Returns the unique elements of the input tensor."),
    ("torch.equal", "True if two tensors have the same size and elements."),
    ("torch.allclose", "True if two tensors are element-wise equal within a tolerance."),
    ("torch.matmul", "Matrix product of two tensors with broadcasting."),
    ("torch.mm", "Performs a matrix multiplication of two matrices."),
    ("torch.bmm", "Performs a batch matrix-matrix product of matrices."),
    ("torch.dot", "Computes the dot product of two 1D tensors."),
    ("torch.einsum", "Evaluates the Einstein summation convention on the operands."),
    ("torch.save", "Saves an object to a disk file using Python's pickle facility."),
    ("torch.load", "Loads an object saved with torch.save() from a file."),
    ("torch.no_grad", "Context-manager that disables gradient calculation."),
    ("torch.enable_grad", "Context-manager that enables gradient calculation."),
    ("torch.inference_mode", "Context-manager for inference mode with no autograd."),
    ("torch.autograd.grad", "Computes and returns the sum of gradients of outputs w.r.t. inputs."),
    ("torch.autograd.backward", "Computes the sum of gradients of given tensors w.r.t. graph leaves."),
    ("torch.autograd.Function", "Base class for creating custom autograd Functions."),
    ("torch.jit.script", "Scripts a function or nn.Module to produce a ScriptModule."),
    ("torch.jit.trace", "Traces a function and returns an executable ScriptFunction."),
    ("torch.nn.Module", "Base class for all neural network modules."),
    ("torch.nn.Parameter", "A Tensor automatically registered as a module parameter."),
    ("torch.nn.Sequential", "A sequential container; modules added in constructor order."),
    ("torch.nn.ModuleList", "Holds submodules in a list without automatic forward propagation."),
    ("torch.nn.ModuleDict", "Holds submodules in a dictionary keyed by string names."),
    ("torch.nn.Linear", "Applies a linear transformation: y = xA^T + b."),
    ("torch.nn.Bilinear", "Applies a bilinear transformation: y = x1^T A x2 + b."),
    ("torch.nn.Identity", "A placeholder identity operator that is argument-insensitive."),
    ("torch.nn.Conv1d", "Applies a 1D convolution over an input signal."),
    ("torch.nn.Conv2d", "Applies a 2D convolution over an input signal (image)."),
    ("torch.nn.Conv3d", "Applies a 3D convolution over an input volume."),
    ("torch.nn.ConvTranspose1d", "Applies a 1D transposed convolution operator (deconvolution)."),
    ("torch.nn.ConvTranspose2d", "Applies a 2D transposed convolution operator."),
    ("torch.nn.ConvTranspose3d", "Applies a 3D transposed convolution operator."),
    ("torch.nn.MaxPool1d", "Applies a 1D max pooling over an input signal."),
    ("torch.nn.MaxPool2d", "Applies a 2D max pooling over an input signal (image)."),
    ("torch.nn.MaxPool3d", "Applies a 3D max pooling over an input signal."),
    ("torch.nn.AvgPool1d", "Applies a 1D average pooling over an input signal."),
    ("torch.nn.AvgPool2d", "Applies a 2D average pooling over an input signal (image)."),
    ("torch.nn.AvgPool3d", "Applies a 3D average pooling over an input signal."),
    ("torch.nn.AdaptiveAvgPool2d", "Applies a 2D adaptive average pooling."),
    ("torch.nn.AdaptiveMaxPool2d", "Applies a 2D adaptive max pooling."),
    ("torch.nn.BatchNorm1d", "Applies Batch Normalization over a 2D or 3D input."),
    ("torch.nn.BatchNorm2d", "Batch Normalization over a 4D input (images)."),
    ("torch.nn.BatchNorm3d", "Batch Normalization over a 5D input (volumes)."),
    ("torch.nn.LayerNorm", "Applies Layer Normalization over a mini-batch of inputs."),
    ("torch.nn.GroupNorm", "Applies Group Normalization over a mini-batch of inputs."),
    ("torch.nn.InstanceNorm1d", "Applies Instance Normalization over a 3D input."),
    ("torch.nn.InstanceNorm2d", "Applies Instance Normalization over a 4D input."),
    ("torch.nn.InstanceNorm3d", "Applies Instance Normalization over a 5D input."),
    ("torch.nn.Dropout", "Randomly zeroes some elements with probability p during training."),
    ("torch.nn.Dropout2d", "Randomly zeroes entire channels for 2D feature maps."),
    ("torch.nn.Dropout3d", "Randomly zeroes entire channels for 3D feature maps."),
    ("torch.nn.AlphaDropout", "Dropout that maintains self-normalizing property for SELU."),
    ("torch.nn.Embedding", "Lookup table storing embeddings of a fixed dictionary and size."),
    ("torch.nn.EmbeddingBag", "Computes sums or means of embedding lookup bags."),
    ("torch.nn.RNN", "Applies a multi-layer Elman RNN with tanh or ReLU non-linearity."),
    ("torch.nn.LSTM", "Applies a multi-layer long short-term memory (LSTM) RNN."),
    ("torch.nn.GRU", "Applies a multi-layer gated recurrent unit (GRU) RNN."),
    ("torch.nn.RNNCell", "An Elman RNN cell with tanh or ReLU non-linearity."),
    ("torch.nn.LSTMCell", "A long short-term memory (LSTM) cell."),
    ("torch.nn.GRUCell", "A gated recurrent unit (GRU) cell."),
    ("torch.nn.Transformer", "A transformer model with encoder and decoder stacks."),
    ("torch.nn.TransformerEncoder", "Stack of N transformer encoder layers."),
    ("torch.nn.TransformerDecoder", "Stack of N transformer decoder layers."),
    ("torch.nn.TransformerEncoderLayer", "Single encoder layer with self-attention and feed-forward."),
    ("torch.nn.TransformerDecoderLayer", "Single decoder layer with self-attn, cross-attn, FF."),
    ("torch.nn.MultiheadAttention", "Allows joint attention from different representation subspaces."),
    ("torch.nn.ReLU", "Applies the rectified linear unit function element-wise: max(0, x)."),
    ("torch.nn.LeakyReLU", "Leaky ReLU: max(0, x) + negative_slope * min(0, x)."),
    ("torch.nn.PReLU", "Parametric ReLU: negative slope is a learnable parameter."),
    ("torch.nn.RReLU", "Randomized leaky ReLU with random negative slope during training."),
    ("torch.nn.ReLU6", "Applies clamped ReLU: min(max(0, x), 6)."),
    ("torch.nn.ELU", "Exponential Linear Unit: x if x>0 else alpha*(exp(x)-1)."),
    ("torch.nn.SELU", "Scaled ELU for self-normalizing neural networks."),
    ("torch.nn.CELU", "Continuously Differentiable Exponential Linear Unit."),
    ("torch.nn.GELU", "Gaussian Error Linear Unit, used in BERT and GPT models."),
    ("torch.nn.SiLU", "Sigmoid Linear Unit: x * sigmoid(x), also known as Swish."),
    ("torch.nn.Mish", "Mish activation: x * tanh(softplus(x))."),
    ("torch.nn.Sigmoid", "Applies the sigmoid function: 1 / (1 + exp(-x))."),
    ("torch.nn.Tanh", "Applies the hyperbolic tangent function element-wise."),
    ("torch.nn.Softmax", "Applies the Softmax function to an n-dimensional input Tensor."),
    ("torch.nn.LogSoftmax", "Applies log(Softmax(x)) for numerical stability."),
    ("torch.nn.Softplus", "Applies softplus: log(1 + exp(x))."),
    ("torch.nn.Softsign", "Applies softsign: x / (1 + |x|)."),
    ("torch.nn.Hardtanh", "Applies HardTanh element-wise: clamp to [-1, 1]."),
    ("torch.nn.Hardswish", "Applies hardswish: x * ReLU6(x+3)/6."),
    ("torch.nn.Hardsigmoid", "Applies hardsigmoid: ReLU6(x+3)/6."),
    ("torch.nn.Threshold", "Thresholds each element: y=x if x>threshold else value."),
    ("torch.nn.Tanhshrink", "Applies tanhshrink: x - tanh(x)."),
    ("torch.nn.Softshrink", "Applies the soft shrinkage function element-wise."),
    ("torch.nn.Hardshrink", "Applies the hard shrinkage function element-wise."),
    ("torch.nn.LogSigmoid", "Applies log(sigmoid(x)) element-wise."),
    ("torch.nn.CrossEntropyLoss", "Combines LogSoftmax and NLLLoss in a single class."),
    ("torch.nn.NLLLoss", "The negative log likelihood loss for classification."),
    ("torch.nn.MSELoss", "Creates a criterion that measures mean squared error."),
    ("torch.nn.L1Loss", "Creates a criterion that measures MAE (mean absolute error)."),
    ("torch.nn.SmoothL1Loss", "Huber loss: L2 if |error|<beta, else L1."),
    ("torch.nn.BCELoss", "Binary Cross Entropy loss between target and input probabilities."),
    ("torch.nn.BCEWithLogitsLoss", "Combines Sigmoid + BCELoss in one numerically stable class."),
    ("torch.nn.KLDivLoss", "Kullback-Leibler divergence loss for distribution differences."),
    ("torch.nn.MarginRankingLoss", "Loss for ranking: max(0, -y*(x1-x2) + margin)."),
    ("torch.nn.HingeEmbeddingLoss", "Measures loss given input x and label y (1 or -1)."),
    ("torch.nn.MultiMarginLoss", "Multi-class margin classification loss."),
    ("torch.nn.TripletMarginLoss", "Triplet loss: max(d(a,p)-d(a,n)+margin, 0)."),
    ("torch.nn.CosineEmbeddingLoss", "Measures loss based on cosine similarity of embeddings."),
    ("torch.nn.CTCLoss", "Connectionist Temporal Classification loss for sequences."),
    ("torch.nn.PoissonNLLLoss", "Negative log likelihood loss with Poisson target distribution."),
    ("torch.nn.HuberLoss", "Huber loss: quadratic for small errors, linear for large."),
    ("torch.nn.CosineSimilarity", "Returns cosine similarity between x1 and x2 along a dim."),
    ("torch.nn.PairwiseDistance", "Computes the pairwise distance between input vectors."),
    ("torch.nn.Flatten", "Flattens a contiguous range of dims into a tensor."),
    ("torch.nn.Unflatten", "Unflattens a tensor dim expanding it to a desired shape."),
    ("torch.nn.Upsample", "Upsamples a given multi-channel 1D/2D/3D data."),
    ("torch.nn.PixelShuffle", "Rearranges elements from spatial to depth (upscaling)."),
    ("torch.nn.PixelUnshuffle", "Rearranges elements from depth to spatial (downscaling)."),
    ("torch.nn.functional.relu", "Applies the rectified linear unit function element-wise."),
    ("torch.nn.functional.leaky_relu", "Applies leaky ReLU element-wise."),
    ("torch.nn.functional.gelu", "Applies the Gaussian Error Linear Unit function."),
    ("torch.nn.functional.silu", "Applies the Sigmoid Linear Unit (SiLU / Swish)."),
    ("torch.nn.functional.sigmoid", "Applies sigmoid function element-wise."),
    ("torch.nn.functional.tanh", "Applies hyperbolic tangent element-wise."),
    ("torch.nn.functional.softmax", "Applies a softmax function along a given dimension."),
    ("torch.nn.functional.log_softmax", "Applies log(softmax(x)) for numerical stability."),
    ("torch.nn.functional.softplus", "Applies softplus: log(1 + exp(x))."),
    ("torch.nn.functional.hardswish", "Applies the hardswish activation function."),
    ("torch.nn.functional.hardsigmoid", "Applies the hardsigmoid activation function."),
    ("torch.nn.functional.conv2d", "Applies a 2D convolution over an input image."),
    ("torch.nn.functional.max_pool2d", "Applies 2D max pooling over an input signal."),
    ("torch.nn.functional.avg_pool2d", "Applies 2D average pooling over an input signal."),
    ("torch.nn.functional.adaptive_avg_pool2d", "Applies 2D adaptive average pooling."),
    ("torch.nn.functional.batch_norm", "Applies Batch Normalization for each channel."),
    ("torch.nn.functional.layer_norm", "Applies Layer Normalization for the last dimensions."),
    ("torch.nn.functional.group_norm", "Applies Group Normalization over a mini-batch."),
    ("torch.nn.functional.dropout", "Randomly zeroes some elements with probability p during training."),
    ("torch.nn.functional.dropout2d", "Randomly zeroes entire channels in 2D feature maps."),
    ("torch.nn.functional.embedding", "Lookup table that stores embeddings of a fixed dictionary."),
    ("torch.nn.functional.linear", "Applies a linear transformation to the incoming data."),
    ("torch.nn.functional.cross_entropy", "Computes cross entropy between logits and target."),
    ("torch.nn.functional.mse_loss", "Measures the element-wise mean squared error."),
    ("torch.nn.functional.l1_loss", "Computes the mean absolute error (MAE)."),
    ("torch.nn.functional.binary_cross_entropy", "Computes binary cross entropy loss."),
    ("torch.nn.functional.binary_cross_entropy_with_logits", "BCE with sigmoid layer, numerically stable."),
    ("torch.nn.functional.kl_div", "Computes the Kullback-Leibler divergence."),
    ("torch.nn.functional.smooth_l1_loss", "Huber loss: L2 if |x-y|<beta, else L1."),
    ("torch.nn.functional.huber_loss", "Huber loss: quadratic for small errors, linear for large."),
    ("torch.nn.functional.cosine_similarity", "Returns cosine similarity between two tensors."),
    ("torch.nn.functional.pairwise_distance", "Computes the pairwise distance between vectors."),
    ("torch.nn.functional.normalize", "Performs L_p normalization of inputs over specified dimension."),
    ("torch.nn.functional.interpolate", "Down/up samples the input to the given size or scale_factor."),
    ("torch.nn.functional.grid_sample", "Spatial sampling of input using a flow-field grid."),
    ("torch.nn.functional.affine_grid", "Generates a 2D or 3D flow field given an affine batch."),
    ("torch.nn.functional.pad", "Pads tensor with a specified value."),
    ("torch.nn.functional.one_hot", "Returns one-hot encoded tensor given index values."),
    ("torch.nn.functional.fold", "Combines sliding local blocks into a large tensor."),
    ("torch.nn.functional.unfold", "Extracts sliding local blocks from a batched input tensor."),
    ("torch.nn.functional.ctc_loss", "Connectionist Temporal Classification loss."),
    ("torch.nn.functional.triplet_margin_loss", "Triplet loss for metric learning."),
    ("torch.nn.functional.local_response_norm", "Local Response Normalization across channels."),
    ("torch.nn.functional.nll_loss", "Negative log likelihood loss."),
    ("torch.nn.functional.poisson_nll_loss", "Poisson negative log likelihood loss."),
    ("torch.nn.functional.hinge_embedding_loss", "Hinge embedding loss."),
    ("torch.nn.functional.margin_ranking_loss", "Margin ranking loss for ranking tasks."),
    ("torch.nn.functional.cosine_embedding_loss", "Cosine embedding loss for learning similarity."),
    ("torch.nn.functional.multilabel_margin_loss", "Multi-label margin classification loss."),
    ("torch.nn.functional.multilabel_soft_margin_loss", "Multi-label soft margin loss with sigmoid + BCE."),
    ("torch.nn.functional.multi_margin_loss", "Multi-class margin classification loss."),
    ("torch.nn.functional.pixel_shuffle", "Rearranges elements from spatial to depth (upscaling)."),
    ("torch.nn.functional.pixel_unshuffle", "Rearranges elements from depth to spatial (downscaling)."),
    ("torch.nn.functional.elu", "Applies Exponential Linear Unit element-wise."),
    ("torch.nn.functional.selu", "Applies Scaled ELU (SELU)."),
    ("torch.nn.functional.celu", "Applies Continuously Differentiable ELU."),
    ("torch.nn.functional.rrelu", "Applies randomized leaky ReLU."),
    ("torch.nn.functional.prelu", "Applies parametric ReLU."),
    ("torch.nn.functional.relu6", "Applies ReLU6: min(max(0,x), 6)."),
    ("torch.nn.functional.logsigmoid", "Applies log(sigmoid(x)) element-wise."),
    ("torch.nn.functional.mish", "Applies Mish: x * tanh(softplus(x))."),
    ("torch.nn.functional.threshold", "Thresholds each element of the input tensor."),
    ("torch.nn.functional.hardtanh", "Applies HardTanh: clamp to [-1, 1]."),
    ("torch.nn.functional.tanhshrink", "Applies tanhshrink: x - tanh(x)."),
    ("torch.nn.functional.softshrink", "Applies the soft shrinkage function."),
    ("torch.nn.functional.hardshrink", "Applies the hard shrinkage function."),
    ("torch.nn.functional.softmin", "Applies softmin: softmax(-x)."),
    ("torch.nn.functional.softsign", "Applies softsign: x / (1 + |x|)."),
    ("torch.nn.functional.glu", "Gated Linear Unit: sigmoid gate on split input."),
    ("torch.optim.SGD", "Stochastic gradient descent with optional momentum and weight decay."),
    ("torch.optim.Adam", "Adam: adaptive moment estimation with gradient bias correction."),
    ("torch.optim.AdamW", "AdamW: Adam with decoupled weight decay."),
    ("torch.optim.RMSprop", "RMSprop: moving average of squared gradients."),
    ("torch.optim.Adagrad", "Adagrad: adaptive learning rate using sum of squared gradients."),
    ("torch.optim.Adadelta", "Adadelta: adaptive learning rate without accumulating all past gradients."),
    ("torch.optim.Adamax", "Adamax: Adam variant based on infinity norm."),
    ("torch.optim.SparseAdam", "SparseAdam: lazy Adam for sparse gradients like Embedding layers."),
    ("torch.optim.LBFGS", "L-BFGS: limited-memory quasi-Newton optimizer."),
    ("torch.optim.NAdam", "NAdam: Adam with Nesterov momentum."),
    ("torch.optim.RAdam", "RAdam (Rectified Adam): variance rectification for adaptive LR."),
    ("torch.optim.ASGD", "Averaged Stochastic Gradient Descent."),
    ("torch.optim.Rprop", "Resilient backpropagation (Rprop)."),
    ("torch.optim.lr_scheduler.StepLR", "Decays the learning rate by gamma every step_size epochs."),
    ("torch.optim.lr_scheduler.MultiStepLR", "Decays LR by gamma at specified epoch milestones."),
    ("torch.optim.lr_scheduler.ExponentialLR", "Decays LR by gamma every epoch."),
    ("torch.optim.lr_scheduler.CosineAnnealingLR", "LR schedule using a cosine annealing function."),
    ("torch.optim.lr_scheduler.ReduceLROnPlateau", "Reduces LR when a metric has stopped improving."),
    ("torch.optim.lr_scheduler.CyclicLR", "Cycles the LR between two boundaries."),
    ("torch.optim.lr_scheduler.OneCycleLR", "1cycle learning rate policy (warm-up + annealing)."),
    ("torch.optim.lr_scheduler.CosineAnnealingWarmRestarts", "Cosine annealing with warm restarts (SGDR)."),
    ("torch.optim.lr_scheduler.LinearLR", "Decays LR linearly over a total number of iterations."),
    ("torch.optim.lr_scheduler.ConstantLR", "Keeps LR constant for a number of iterations."),
    ("torch.optim.lr_scheduler.PolynomialLR", "Decays LR using a polynomial function."),
    ("torch.optim.lr_scheduler.LambdaLR", "Sets LR as initial LR times a user-provided function."),
    ("torch.utils.data.Dataset", "Abstract class representing a map-style dataset."),
    ("torch.utils.data.IterableDataset", "Abstract class for iterable-style datasets for streaming."),
    ("torch.utils.data.TensorDataset", "Dataset wrapping tensors; each sample by indexing first dim."),
    ("torch.utils.data.DataLoader", "Iterable over a dataset with batching, shuffling, multiprocessing."),
    ("torch.utils.data.random_split", "Randomly splits a dataset into given lengths."),
    ("torch.utils.data.Subset", "Subset of a dataset at specified indices."),
    ("torch.utils.data.ConcatDataset", "Dataset as a concatenation of multiple datasets."),
    ("torch.utils.data.WeightedRandomSampler", "Samples elements with given probabilities (weights)."),
    ("torch.utils.data.BatchSampler", "Wraps a sampler to yield mini-batches of indices."),
    ("torch.utils.data.SequentialSampler", "Samples elements sequentially in the same order."),
    ("torch.utils.data.RandomSampler", "Samples elements randomly without replacement."),
    ("torch.utils.data.SubsetRandomSampler", "Samples randomly from a given list of indices."),
    ("torch.distributed.init_process_group", "Initializes the default distributed process group."),
    ("torch.distributed.all_reduce", "Reduces tensors across all processes to the same result."),
    ("torch.distributed.all_gather", "Gathers tensors from the whole group in a list."),
    ("torch.distributed.broadcast", "Broadcasts a tensor from source process to all others."),
    ("torch.distributed.barrier", "Synchronizes all processes within a group."),
    ("torch.nn.parallel.DistributedDataParallel", "Distributed data parallel across multiple machines."),
    ("torch.utils.data.distributed.DistributedSampler", "Sampler restricting data per process."),
    ("torch.cuda.is_available", "Returns True if CUDA is available."),
    ("torch.cuda.device_count", "Returns the number of GPUs available."),
    ("torch.cuda.empty_cache", "Releases all unoccupied cached memory held by CUDA allocator."),
    ("torch.cuda.amp.autocast", "Context manager for automatic mixed precision."),
    ("torch.cuda.amp.GradScaler", "Gradient scaler for automatic mixed precision training."),
    ("torchvision.transforms.Compose", "Composes several transforms into a single callable."),
    ("torchvision.transforms.ToTensor", "Converts a PIL Image or ndarray to a FloatTensor."),
    ("torchvision.transforms.Normalize", "Normalizes a tensor image with mean and std."),
    ("torchvision.transforms.Resize", "Resizes the input image to the given size."),
    ("torchvision.transforms.CenterCrop", "Crops the given image at the center."),
    ("torchvision.transforms.RandomCrop", "Crops the given image at a random location."),
    ("torchvision.transforms.RandomHorizontalFlip", "Horizontally flips image randomly with given probability."),
    ("torchvision.transforms.RandomRotation", "Rotates the image by a random angle."),
    ("torchvision.transforms.ColorJitter", "Randomly changes brightness, contrast, saturation, hue."),
    ("torchvision.transforms.RandomResizedCrop", "Random crop + resize to given size."),
    ("torchvision.transforms.RandomErasing", "Randomly erases a rectangle region's pixels."),
    ("torchvision.transforms.RandomAffine", "Random affine transformation of the image."),
    ("torchvision.transforms.Grayscale", "Converts image to grayscale."),
    ("torchvision.transforms.GaussianBlur", "Blurs image with randomly chosen Gaussian kernel."),
    ("torchvision.models.resnet50", "ResNet-50: 50-layer Residual Network for image classification."),
    ("torchvision.models.vgg16", "VGG-16: 16-layer VGG network with small convolutional filters."),
    ("torchvision.models.mobilenet_v2", "MobileNetV2: efficient CNN for mobile/embedded vision."),
    ("torchvision.models.efficientnet_b0", "EfficientNet-B0: compound-scaling CNN for balanced efficiency."),
    ("torch.quantization.quantize_dynamic", "Dynamic quantization: quantizes weights, activations in float."),
    ("torch.quantization.QuantStub", "Converts float tensors to quantized tensors at runtime."),
    ("torch.quantization.DeQuantStub", "Converts quantized tensors back to float at runtime."),
    ("torch.quantization.prepare", "Prepares a model for post-training static quantization."),
    ("torch.quantization.convert", "Converts a prepared model to a quantized model."),
    ("torch.compile", "Compiles a PyTorch model into fused optimized graph (TorchDynamo)."),
    ("torch.set_grad_enabled", "Context-manager that sets gradient calculation on or off."),
    ("torch.device", "Represents the device on which a torch.Tensor is allocated."),
    ("torch.dtype", "Object representing the data type of a torch.Tensor."),
    ("torch.seed", "Sets the seed for generating random numbers."),
    ("torch.manual_seed", "Sets the seed for generating random numbers, returns a Generator."),
    ("torch.nonzero", "Returns indices of all non-zero elements of input."),
    ("torch.argmax", "Returns the indices of the maximum values across a dimension."),
    ("torch.argmin", "Returns the indices of the minimum values across a dimension."),
    ("torch.max", "Returns the maximum value of all elements in the input tensor."),
    ("torch.min", "Returns the minimum value of all elements in the input tensor."),
    ("torch.mean", "Returns the mean value of all elements in the input tensor."),
    ("torch.sum", "Returns the sum of all elements in the input tensor."),
    ("torch.std", "Computes the standard deviation of all elements in the input tensor."),
    ("torch.var", "Computes the variance of all elements in the input tensor."),
    ("torch.prod", "Returns the product of all elements in the input tensor."),
    ("torch.median", "Returns the median of the input tensor."),
    ("torch.mode", "Returns the mode (most frequent value) of the input tensor."),
    ("torch.any", "Tests if any element in input evaluates to True."),
    ("torch.all", "Tests if all elements in input evaluate to True."),
    ("torch.isnan", "Returns boolean tensor indicating NaN elements."),
    ("torch.isinf", "Returns boolean tensor indicating +/-INF elements."),
    ("torch.isfinite", "Returns boolean tensor indicating finite elements."),
    ("torch.sign", "Returns tensor with signs of each element of input."),
    ("torch.round", "Rounds each element to the closest integer."),
    ("torch.ceil", "Returns the ceil of each element of input."),
    ("torch.floor", "Returns the floor of each element of input."),
    ("torch.trunc", "Returns truncated integer values of each element."),
    ("torch.frac", "Computes the fractional portion of each element."),
    ("torch.remainder", "Python's modulus operator entrywise."),
    ("torch.fmod", "C's fmod (floating-point modulo) entrywise."),
    ("torch.cross", "Returns the cross product of vectors along a dim."),
    ("torch.outer", "Outer product of two 1-D tensors."),
    ("torch.addmm", "Matrix multiply + add: beta*input + alpha*(mat1 @ mat2)."),
    ("torch.addmv", "Matrix-vector product + add."),
    ("torch.chain_matmul", "Matrix product of N 2-D tensors with optimal parenthesization."),
    ("torch.trace", "Sum of the diagonal elements of the input 2-D matrix."),
    ("torch.diag", "Extracts diagonal or constructs a diagonal matrix."),
    ("torch.tril", "Returns the lower triangular part of a matrix."),
    ("torch.triu", "Returns the upper triangular part of a matrix."),
    ("torch.inverse", "Takes the inverse of a square matrix."),
    ("torch.linalg.det", "Computes the determinant of a square matrix."),
    ("torch.linalg.norm", "Computes a vector or matrix norm."),
    ("torch.linalg.solve", "Solves a square system of linear equations."),
    ("torch.linalg.eig", "Computes the eigenvalue decomposition of a square matrix."),
    ("torch.linalg.eigh", "Eigenvalue decomposition of a symmetric matrix."),
    ("torch.linalg.svd", "Computes the singular value decomposition (SVD) of a matrix."),
    ("torch.linalg.qr", "Computes the QR decomposition of a matrix."),
    ("torch.linalg.lstsq", "Computes the solution to the least squares problem."),
    ("torch.meshgrid", "Creates grids of coordinates from 1D tensors."),
    ("torch.cartesian_prod", "Cartesian product of given 1-D tensors."),
    ("torch.combinations", "Computes combinations of length r of the given tensor."),
    ("torch.diff", "Computes the n-th forward difference along a dimension."),
    ("torch.cumsum", "Cumulative sum of elements along a dimension."),
    ("torch.cumprod", "Cumulative product of elements along a dimension."),
    ("torch.count_nonzero", "Counts the number of non-zero values."),
    ("torch.heaviside", "Computes the Heaviside step function element-wise."),
    ("torch.logical_and", "Element-wise logical AND."),
    ("torch.logical_or", "Element-wise logical OR."),
    ("torch.logical_not", "Element-wise logical NOT."),
    ("torch.logical_xor", "Element-wise logical XOR."),
    ("torch.broadcast_tensors", "Broadcasts tensors according to broadcasting semantics."),
    ("torch.broadcast_to", "Broadcasts input to shape."),
    ("torch.clone", "Returns a copy of input."),
    ("torch.movedim", "Moves dimension(s) of input to new position(s)."),
    ("torch.repeat_interleave", "Repeats elements of a tensor."),
    ("torch.tile", "Constructs a tensor by repeating elements of input."),
    ("torch.roll", "Rolls the tensor along given dimension(s)."),
    ("torch.flip", "Reverses order of an n-D tensor along given dimension."),
    ("torch.rot90", "Rotates an n-D tensor by 90 degrees."),
    ("torch.swapaxes", "Interchanges two axes of a tensor."),
    ("torch.swapdims", "Alias for swapaxes; swaps two dimensions."),
    ("torch.t", "Transposes dimensions 0 and 1 of <= 2-D tensor."),
    ("torch.narrow", "Returns a narrowed version of input tensor."),
    ("torch.index_select", "Indexes input tensor along dimension dim."),
    ("torch.masked_select", "Indexes input tensor according to boolean mask."),
    ("torch.take", "Returns tensor with elements at given indices."),
    ("torch.take_along_dim", "Selects values at 1-D indices along the given dim."),
    ("torch.searchsorted", "Finds indices from innermost dim of sorted_sequence."),
    ("torch.bucketize", "Returns indices of buckets each value belongs to."),
]


_SKLEARN_APIS = [
    ("sklearn.linear_model.LinearRegression", "Ordinary least squares Linear Regression."),
    ("sklearn.linear_model.Ridge", "Linear least squares with L2 regularization."),
    ("sklearn.linear_model.Lasso", "Linear Model trained with L1 prior as regularizer."),
    ("sklearn.linear_model.ElasticNet", "Linear regression with combined L1 and L2 priors."),
    ("sklearn.linear_model.LogisticRegression", "Logistic Regression (logit, MaxEnt) classifier."),
    ("sklearn.linear_model.SGDClassifier", "Linear classifiers trained with SGD."),
    ("sklearn.linear_model.SGDRegressor", "Linear model minimizing regularized loss with SGD."),
    ("sklearn.linear_model.Perceptron", "Linear perceptron classifier."),
    ("sklearn.linear_model.PassiveAggressiveClassifier", "Passive Aggressive online classifier."),
    ("sklearn.linear_model.PassiveAggressiveRegressor", "Passive Aggressive online regressor."),
    ("sklearn.linear_model.RANSACRegressor", "RANSAC robust regression algorithm."),
    ("sklearn.linear_model.TheilSenRegressor", "Theil-Sen robust multivariate regression."),
    ("sklearn.linear_model.HuberRegressor", "L2-regularized linear regression robust to outliers."),
    ("sklearn.linear_model.QuantileRegressor", "Linear regression predicting conditional quantiles."),
    ("sklearn.linear_model.Lars", "Least Angle Regression model (LARS)."),
    ("sklearn.linear_model.LassoLars", "Lasso model fit with LARS algorithm."),
    ("sklearn.linear_model.OrthogonalMatchingPursuit", "Orthogonal Matching Pursuit model."),
    ("sklearn.linear_model.BayesianRidge", "Bayesian ridge regression for linear models."),
    ("sklearn.linear_model.ARDRegression", "Bayesian ARD regression."),
    ("sklearn.linear_model.RidgeCV", "Ridge regression with built-in cross-validation."),
    ("sklearn.linear_model.LassoCV", "Lasso with iterative fitting along a regularization path."),
    ("sklearn.linear_model.ElasticNetCV", "Elastic Net with iterative fitting along a regularization path."),
    ("sklearn.linear_model.LarsCV", "Cross-validated Least Angle Regression."),
    ("sklearn.linear_model.LassoLarsCV", "Cross-validated Lasso using LARS."),
    ("sklearn.linear_model.LogisticRegressionCV", "Logistic regression with built-in cross-validation."),
    ("sklearn.linear_model.MultiTaskLasso", "Multi-task Lasso with L1/L2 mixed-norm."),
    ("sklearn.linear_model.MultiTaskElasticNet", "Multi-task ElasticNet with L1/L2 mixed-norm."),
    ("sklearn.linear_model.PoissonRegressor", "GLM with a Poisson distribution."),
    ("sklearn.linear_model.GammaRegressor", "GLM with a Gamma distribution."),
    ("sklearn.linear_model.TweedieRegressor", "GLM with a Tweedie distribution."),
    ("sklearn.svm.SVC", "C-Support Vector Classification."),
    ("sklearn.svm.SVR", "Epsilon-Support Vector Regression."),
    ("sklearn.svm.NuSVC", "Nu-Support Vector Classification."),
    ("sklearn.svm.NuSVR", "Nu-Support Vector Regression."),
    ("sklearn.svm.LinearSVC", "Linear Support Vector Classification."),
    ("sklearn.svm.LinearSVR", "Linear Support Vector Regression."),
    ("sklearn.svm.OneClassSVM", "Unsupervised Outlier Detection with SVM."),
    ("sklearn.tree.DecisionTreeClassifier", "A decision tree classifier."),
    ("sklearn.tree.DecisionTreeRegressor", "A decision tree regressor."),
    ("sklearn.tree.ExtraTreeClassifier", "An extremely randomized tree classifier."),
    ("sklearn.tree.ExtraTreeRegressor", "An extremely randomized tree regressor."),
    ("sklearn.tree.export_graphviz", "Export a decision tree in DOT format."),
    ("sklearn.tree.plot_tree", "Plot a decision tree."),
    ("sklearn.ensemble.RandomForestClassifier", "A random forest classifier."),
    ("sklearn.ensemble.RandomForestRegressor", "A random forest regressor."),
    ("sklearn.ensemble.ExtraTreesClassifier", "An extra-trees classifier."),
    ("sklearn.ensemble.ExtraTreesRegressor", "An extra-trees regressor."),
    ("sklearn.ensemble.GradientBoostingClassifier", "Gradient Boosting for classification."),
    ("sklearn.ensemble.GradientBoostingRegressor", "Gradient Boosting for regression."),
    ("sklearn.ensemble.AdaBoostClassifier", "An AdaBoost classifier."),
    ("sklearn.ensemble.AdaBoostRegressor", "An AdaBoost regressor."),
    ("sklearn.ensemble.BaggingClassifier", "A Bagging classifier."),
    ("sklearn.ensemble.BaggingRegressor", "A Bagging regressor."),
    ("sklearn.ensemble.VotingClassifier", "Soft Voting / Majority Rule ensemble classifier."),
    ("sklearn.ensemble.VotingRegressor", "Prediction voting ensemble regressor."),
    ("sklearn.ensemble.StackingClassifier", "Stack of estimators with a final classifier."),
    ("sklearn.ensemble.StackingRegressor", "Stack of estimators with a final regressor."),
    ("sklearn.ensemble.HistGradientBoostingClassifier", "Histogram-based Gradient Boosting Classification Tree."),
    ("sklearn.ensemble.HistGradientBoostingRegressor", "Histogram-based Gradient Boosting Regression Tree."),
    ("sklearn.ensemble.IsolationForest", "Isolation Forest for anomaly detection."),
    ("sklearn.neighbors.KNeighborsClassifier", "Classifier implementing k-nearest neighbors vote."),
    ("sklearn.neighbors.KNeighborsRegressor", "Regression based on k-nearest neighbors."),
    ("sklearn.neighbors.RadiusNeighborsClassifier", "Vote among neighbors within a given radius."),
    ("sklearn.neighbors.RadiusNeighborsRegressor", "Regression based on neighbors within a fixed radius."),
    ("sklearn.neighbors.NearestNeighbors", "Unsupervised learner for neighbor searches."),
    ("sklearn.neighbors.KNeighborsTransformer", "Transform X into a weighted graph of k nearest neighbors."),
    ("sklearn.neighbors.LocalOutlierFactor", "Unsupervised Outlier Detection using Local Outlier Factor."),
    ("sklearn.neighbors.NeighborhoodComponentsAnalysis", "NCA for supervised metric learning."),
    ("sklearn.naive_bayes.GaussianNB", "Gaussian Naive Bayes classifier."),
    ("sklearn.naive_bayes.MultinomialNB", "Naive Bayes classifier for multinomial models."),
    ("sklearn.naive_bayes.ComplementNB", "The Complement Naive Bayes classifier."),
    ("sklearn.naive_bayes.BernoulliNB", "Naive Bayes classifier for Bernoulli models."),
    ("sklearn.naive_bayes.CategoricalNB", "Naive Bayes classifier for categorical features."),
    ("sklearn.neural_network.MLPClassifier", "Multi-layer Perceptron classifier."),
    ("sklearn.neural_network.MLPRegressor", "Multi-layer Perceptron regressor."),
    ("sklearn.neural_network.BernoulliRBM", "Bernoulli Restricted Boltzmann Machine."),
    ("sklearn.cluster.KMeans", "K-Means clustering."),
    ("sklearn.cluster.MiniBatchKMeans", "Mini-Batch K-Means clustering."),
    ("sklearn.cluster.AffinityPropagation", "Affinity Propagation Clustering."),
    ("sklearn.cluster.MeanShift", "Mean shift clustering using a flat kernel."),
    ("sklearn.cluster.SpectralClustering", "Spectral clustering on normalized Laplacian projection."),
    ("sklearn.cluster.AgglomerativeClustering", "Agglomerative hierarchical clustering."),
    ("sklearn.cluster.DBSCAN", "DBSCAN clustering from vector array or distance matrix."),
    ("sklearn.cluster.HDBSCAN", "Hierarchical Density-Based Spatial Clustering."),
    ("sklearn.cluster.OPTICS", "Ordering Points To Identify the Clustering Structure."),
    ("sklearn.cluster.Birch", "BIRCH balanced iterative clustering using hierarchies."),
    ("sklearn.decomposition.PCA", "Principal component analysis."),
    ("sklearn.decomposition.IncrementalPCA", "Incremental principal components analysis."),
    ("sklearn.decomposition.KernelPCA", "Kernel Principal component analysis."),
    ("sklearn.decomposition.SparsePCA", "Sparse Principal Components Analysis."),
    ("sklearn.decomposition.MiniBatchSparsePCA", "Mini-batch Sparse PCA."),
    ("sklearn.decomposition.TruncatedSVD", "Dimensionality reduction using truncated SVD (LSA)."),
    ("sklearn.decomposition.FactorAnalysis", "Factor Analysis."),
    ("sklearn.decomposition.FastICA", "Fast algorithm for Independent Component Analysis."),
    ("sklearn.decomposition.NMF", "Non-Negative Matrix Factorization."),
    ("sklearn.decomposition.MiniBatchNMF", "Mini-Batch Non-Negative Matrix Factorization."),
    ("sklearn.decomposition.LatentDirichletAllocation", "LDA with online variational Bayes."),
    ("sklearn.decomposition.DictionaryLearning", "Dictionary learning."),
    ("sklearn.decomposition.MiniBatchDictionaryLearning", "Mini-batch dictionary learning."),
    ("sklearn.decomposition.SparseCoder", "Sparse coding."),
    ("sklearn.manifold.TSNE", "T-distributed Stochastic Neighbor Embedding."),
    ("sklearn.manifold.Isomap", "Isomap Embedding."),
    ("sklearn.manifold.LocallyLinearEmbedding", "Locally Linear Embedding."),
    ("sklearn.manifold.MDS", "Multidimensional scaling."),
    ("sklearn.manifold.SpectralEmbedding", "Spectral embedding for non-linear dimensionality reduction."),
    ("sklearn.feature_extraction.text.CountVectorizer", "Convert text to a matrix of token counts."),
    ("sklearn.feature_extraction.text.TfidfVectorizer", "Convert documents to TF-IDF feature matrix."),
    ("sklearn.feature_extraction.text.HashingVectorizer", "Convert text to token occurrence matrix via hashing."),
    ("sklearn.feature_extraction.text.TfidfTransformer", "Transform count matrix to tf-idf representation."),
    ("sklearn.feature_extraction.DictVectorizer", "Transform feature-value mappings to vectors."),
    ("sklearn.feature_extraction.image.PatchExtractor", "Extracts patches from a collection of images."),
    ("sklearn.feature_selection.SelectKBest", "Select features according to k highest scores."),
    ("sklearn.feature_selection.SelectPercentile", "Select features by percentile of highest scores."),
    ("sklearn.feature_selection.RFE", "Feature ranking with recursive feature elimination."),
    ("sklearn.feature_selection.RFECV", "Recursive feature elimination with cross-validation."),
    ("sklearn.feature_selection.SelectFromModel", "Select features from a fitted estimator."),
    ("sklearn.feature_selection.SequentialFeatureSelector", "Transformer for Sequential Feature Selection."),
    ("sklearn.feature_selection.VarianceThreshold", "Feature selector removing low-variance features."),
    ("sklearn.feature_selection.chi2", "Chi-squared stats between non-negative feature and class."),
    ("sklearn.feature_selection.f_classif", "ANOVA F-value for the provided sample."),
    ("sklearn.feature_selection.mutual_info_classif", "Mutual information for discrete target variable."),
    ("sklearn.feature_selection.f_regression", "Univariate linear regression F-statistic and p-values."),
    ("sklearn.feature_selection.mutual_info_regression", "Mutual information for continuous target variable."),
    ("sklearn.preprocessing.StandardScaler", "Standardize features: remove mean, scale to unit variance."),
    ("sklearn.preprocessing.MinMaxScaler", "Scale each feature to a given range."),
    ("sklearn.preprocessing.MaxAbsScaler", "Scale each feature by its maximum absolute value."),
    ("sklearn.preprocessing.RobustScaler", "Scale features using robust-to-outlier statistics."),
    ("sklearn.preprocessing.Normalizer", "Normalize samples individually to unit norm."),
    ("sklearn.preprocessing.Binarizer", "Binarize data to 0 or 1 according to a threshold."),
    ("sklearn.preprocessing.PowerTransformer", "Power transform for Gaussian-like data."),
    ("sklearn.preprocessing.QuantileTransformer", "Transform features using quantiles information."),
    ("sklearn.preprocessing.KBinsDiscretizer", "Bin continuous data into intervals."),
    ("sklearn.preprocessing.OneHotEncoder", "Encode categorical features as one-hot array."),
    ("sklearn.preprocessing.OrdinalEncoder", "Encode categorical features as integer array."),
    ("sklearn.preprocessing.LabelEncoder", "Encode target labels from 0 to n_classes-1."),
    ("sklearn.preprocessing.LabelBinarizer", "Binarize labels in a one-vs-all fashion."),
    ("sklearn.preprocessing.MultiLabelBinarizer", "Transform iterables to multilabel binary format."),
    ("sklearn.preprocessing.PolynomialFeatures", "Generate polynomial and interaction features."),
    ("sklearn.preprocessing.SplineTransformer", "Generate univariate B-spline bases for features."),
    ("sklearn.preprocessing.FunctionTransformer", "Transformer from an arbitrary callable."),
    ("sklearn.preprocessing.TargetEncoder", "Target Encoder for regression and classification targets."),
    ("sklearn.impute.SimpleImputer", "Imputation for missing values with simple strategies."),
    ("sklearn.impute.IterativeImputer", "Multivariate imputer estimating each feature from others."),
    ("sklearn.impute.KNNImputer", "Imputation for missing values using k-Nearest Neighbors."),
    ("sklearn.impute.MissingIndicator", "Binary indicators for missing values."),
    ("sklearn.pipeline.Pipeline", "Pipeline of transforms with a final estimator."),
    ("sklearn.pipeline.FeatureUnion", "Concatenates results of multiple transformer objects."),
    ("sklearn.pipeline.make_pipeline", "Construct a Pipeline from the given estimators."),
    ("sklearn.pipeline.make_union", "Construct a FeatureUnion from the given transformers."),
    ("sklearn.compose.ColumnTransformer", "Apply transformers to columns of an array or DataFrame."),
    ("sklearn.compose.make_column_transformer", "Construct a ColumnTransformer from given transformers."),
    ("sklearn.compose.make_column_selector", "Create callable to select columns for ColumnTransformer."),
    ("sklearn.compose.TransformedTargetRegressor", "Meta-estimator to regress on a transformed target."),
    ("sklearn.model_selection.train_test_split", "Split arrays into random train and test subsets."),
    ("sklearn.model_selection.cross_val_score", "Evaluate a score by cross-validation."),
    ("sklearn.model_selection.cross_validate", "Evaluate metrics by cross-validation."),
    ("sklearn.model_selection.cross_val_predict", "Generate cross-validated estimates for each data point."),
    ("sklearn.model_selection.KFold", "K-Folds cross-validator."),
    ("sklearn.model_selection.StratifiedKFold", "Stratified K-Folds cross-validator."),
    ("sklearn.model_selection.GroupKFold", "K-fold variant with non-overlapping groups."),
    ("sklearn.model_selection.TimeSeriesSplit", "Time Series cross-validator."),
    ("sklearn.model_selection.ShuffleSplit", "Random permutation cross-validator."),
    ("sklearn.model_selection.LeaveOneOut", "Leave-One-Out cross-validator."),
    ("sklearn.model_selection.LeavePOut", "Leave-P-Out cross-validator."),
    ("sklearn.model_selection.LeaveOneGroupOut", "Leave One Group Out cross-validator."),
    ("sklearn.model_selection.RepeatedKFold", "Repeated K-Fold cross validator."),
    ("sklearn.model_selection.RepeatedStratifiedKFold", "Repeated Stratified K-Fold cross validator."),
    ("sklearn.model_selection.GridSearchCV", "Exhaustive search over specified parameter values."),
    ("sklearn.model_selection.RandomizedSearchCV", "Randomized search on hyper parameters."),
    ("sklearn.model_selection.HalvingGridSearchCV", "Successive halving grid search."),
    ("sklearn.model_selection.HalvingRandomSearchCV", "Successive halving random search."),
    ("sklearn.model_selection.ParameterGrid", "Grid of parameters with discrete values."),
    ("sklearn.model_selection.ParameterSampler", "Generator on parameters sampled from distributions."),
    ("sklearn.model_selection.learning_curve", "Varying training sizes, evaluate train/test scores."),
    ("sklearn.model_selection.validation_curve", "Single hyperparameter sweep, evaluate train/test scores."),
    ("sklearn.model_selection.permutation_test_score", "Evaluate cross-validated score significance."),
    ("sklearn.metrics.accuracy_score", "Accuracy classification score."),
    ("sklearn.metrics.precision_score", "Compute the precision."),
    ("sklearn.metrics.recall_score", "Compute the recall."),
    ("sklearn.metrics.f1_score", "Compute the F1 score (balanced F-score)."),
    ("sklearn.metrics.fbeta_score", "Compute the F-beta score."),
    ("sklearn.metrics.classification_report", "Text report showing main classification metrics."),
    ("sklearn.metrics.confusion_matrix", "Compute confusion matrix for classification evaluation."),
    ("sklearn.metrics.roc_auc_score", "Area Under the ROC Curve."),
    ("sklearn.metrics.roc_curve", "Compute Receiver operating characteristic (ROC)."),
    ("sklearn.metrics.auc", "Area Under the Curve using trapezoidal rule."),
    ("sklearn.metrics.precision_recall_curve", "Precision-recall pairs for different thresholds."),
    ("sklearn.metrics.average_precision_score", "Average precision (AP) from prediction scores."),
    ("sklearn.metrics.log_loss", "Log loss, aka logistic loss or cross-entropy loss."),
    ("sklearn.metrics.brier_score_loss", "Compute the Brier score loss."),
    ("sklearn.metrics.matthews_corrcoef", "Matthews correlation coefficient (MCC)."),
    ("sklearn.metrics.cohen_kappa_score", "Cohen's kappa: inter-annotator agreement statistic."),
    ("sklearn.metrics.hamming_loss", "Average Hamming loss."),
    ("sklearn.metrics.jaccard_score", "Jaccard similarity coefficient score."),
    ("sklearn.metrics.hinge_loss", "Average hinge loss (non-regularized)."),
    ("sklearn.metrics.zero_one_loss", "Zero-one classification loss."),
    ("sklearn.metrics.r2_score", "R^2 (coefficient of determination) regression score."),
    ("sklearn.metrics.mean_absolute_error", "Mean absolute error regression loss (MAE)."),
    ("sklearn.metrics.mean_squared_error", "Mean squared error regression loss (MSE)."),
    ("sklearn.metrics.root_mean_squared_error", "Root mean squared error (RMSE)."),
    ("sklearn.metrics.mean_absolute_percentage_error", "Mean absolute percentage error (MAPE)."),
    ("sklearn.metrics.mean_squared_log_error", "Mean squared logarithmic error regression loss."),
    ("sklearn.metrics.median_absolute_error", "Median absolute error regression loss (robust)."),
    ("sklearn.metrics.explained_variance_score", "Explained variance regression score."),
    ("sklearn.metrics.max_error", "Maximum residual error."),
    ("sklearn.metrics.mean_tweedie_deviance", "Mean Tweedie deviance regression loss."),
    ("sklearn.metrics.mean_pinball_loss", "Pinball loss for quantile regression."),
    ("sklearn.metrics.d2_absolute_error_score", "D^2 regression score (absolute error)."),
    ("sklearn.metrics.d2_pinball_score", "D^2 regression score (pinball loss)."),
    ("sklearn.metrics.d2_tweedie_score", "D^2 regression score (Tweedie deviance)."),
    ("sklearn.metrics.silhouette_score", "Mean Silhouette Coefficient of all samples."),
    ("sklearn.metrics.calinski_harabasz_score", "Calinski and Harabasz score (Variance Ratio)."),
    ("sklearn.metrics.davies_bouldin_score", "Davies-Bouldin score for clustering evaluation."),
    ("sklearn.metrics.adjusted_rand_score", "Rand index adjusted for chance."),
    ("sklearn.metrics.adjusted_mutual_info_score", "Adjusted Mutual Information between clusterings."),
    ("sklearn.metrics.normalized_mutual_info_score", "Normalized Mutual Information between clusterings."),
    ("sklearn.metrics.homogeneity_score", "Homogeneity metric of a cluster labeling."),
    ("sklearn.metrics.completeness_score", "Completeness metric of a cluster labeling."),
    ("sklearn.metrics.v_measure_score", "V-measure of cluster labeling given ground truth."),
    ("sklearn.metrics.fowlkes_mallows_score", "Similarity of two clusterings."),
    ("sklearn.metrics.ConfusionMatrixDisplay", "Confusion Matrix visualization."),
    ("sklearn.metrics.PrecisionRecallDisplay", "Precision Recall visualization."),
    ("sklearn.metrics.RocCurveDisplay", "ROC Curve visualization."),
    ("sklearn.metrics.DetCurveDisplay", "DET curve visualization."),
    ("sklearn.metrics.PredictionErrorDisplay", "Prediction error visualization."),
    ("sklearn.metrics.LearningCurveDisplay", "Learning Curve visualization."),
    ("sklearn.metrics.ValidationCurveDisplay", "Validation Curve visualization."),
    ("sklearn.metrics.CalibrationDisplay", "Calibration curve visualization."),
    ("sklearn.calibration.CalibratedClassifierCV", "Probability calibration with isotonic/logistic regression."),
    ("sklearn.calibration.calibration_curve", "Compute true and predicted probabilities."),
    ("sklearn.covariance.EmpiricalCovariance", "Maximum likelihood covariance estimator."),
    ("sklearn.covariance.EllipticEnvelope", "Outlier detection in Gaussian dataset."),
    ("sklearn.covariance.MinCovDet", "Minimum Covariance Determinant robust estimator."),
    ("sklearn.covariance.ShrunkCovariance", "Covariance estimator with shrinkage."),
    ("sklearn.covariance.LedoitWolf", "Ledoit-Wolf optimal shrinkage estimator."),
    ("sklearn.covariance.OAS", "Oracle Approximating Shrinkage estimator."),
    ("sklearn.covariance.GraphicalLasso", "Sparse inverse covariance with l1 penalty."),
    ("sklearn.covariance.GraphicalLassoCV", "Sparse inverse covariance with cross-validated alpha."),
    ("sklearn.cross_decomposition.PLSRegression", "Partial Least Squares regression."),
    ("sklearn.cross_decomposition.PLSCanonical", "Partial Least Squares transformer and regressor."),
    ("sklearn.cross_decomposition.CCA", "Canonical Correlation Analysis."),
    ("sklearn.cross_decomposition.PLSSVD", "Partial Least Square SVD."),
    ("sklearn.discriminant_analysis.LinearDiscriminantAnalysis", "Linear Discriminant Analysis (LDA)."),
    ("sklearn.discriminant_analysis.QuadraticDiscriminantAnalysis", "Quadratic Discriminant Analysis (QDA)."),
    ("sklearn.dummy.DummyClassifier", "Classifier using simple prediction rules."),
    ("sklearn.dummy.DummyRegressor", "Regressor using simple prediction rules."),
    ("sklearn.gaussian_process.GaussianProcessClassifier", "Gaussian process classification (GPC)."),
    ("sklearn.gaussian_process.GaussianProcessRegressor", "Gaussian process regression (GPR)."),
    ("sklearn.gaussian_process.kernels.RBF", "Radial basis function (squared-exponential) kernel."),
    ("sklearn.gaussian_process.kernels.Matern", "Matern kernel with smoothness parameter."),
    ("sklearn.gaussian_process.kernels.RationalQuadratic", "Rational Quadratic kernel (RBF mixture)."),
    ("sklearn.gaussian_process.kernels.WhiteKernel", "White kernel adding noise."),
    ("sklearn.gaussian_process.kernels.DotProduct", "Dot-Product kernel from linear regression."),
    ("sklearn.gaussian_process.kernels.ConstantKernel", "Constant kernel for all data points."),
    ("sklearn.isotonic.IsotonicRegression", "Isotonic regression for monotonic fitting."),
    ("sklearn.kernel_approximation.RBFSampler", "RBF kernel map by Monte Carlo approximation."),
    ("sklearn.kernel_approximation.Nystroem", "Approximate kernel map using Nystroem method."),
    ("sklearn.kernel_approximation.AdditiveChi2Sampler", "Feature map for additive chi2 kernel."),
    ("sklearn.kernel_approximation.SkewedChi2Sampler", "Feature map for skewed chi-squared kernel."),
    ("sklearn.kernel_approximation.PolynomialCountSketch", "Polynomial kernel via Tensor Sketch."),
    ("sklearn.kernel_ridge.KernelRidge", "Kernel ridge regression."),
    ("sklearn.mixture.GaussianMixture", "Gaussian Mixture Model."),
    ("sklearn.mixture.BayesianGaussianMixture", "Variational Bayesian Gaussian mixture."),
    ("sklearn.multioutput.MultiOutputClassifier", "Multi target classification."),
    ("sklearn.multioutput.MultiOutputRegressor", "Multi target regression."),
    ("sklearn.multioutput.ClassifierChain", "Binary classifier chain for multi-label."),
    ("sklearn.multioutput.RegressorChain", "Regression chain for multi-label."),
    ("sklearn.multiclass.OneVsRestClassifier", "One-vs-the-rest multiclass strategy."),
    ("sklearn.multiclass.OneVsOneClassifier", "One-vs-one multiclass strategy."),
    ("sklearn.multiclass.OutputCodeClassifier", "Error-Correcting Output Codes strategy."),
    ("sklearn.semi_supervised.SelfTrainingClassifier", "Self-training semi-supervised classifier."),
    ("sklearn.semi_supervised.LabelPropagation", "Label Propagation classifier."),
    ("sklearn.semi_supervised.LabelSpreading", "Label Spreading semi-supervised classifier."),
    ("sklearn.inspection.partial_dependence", "Partial dependence of features."),
    ("sklearn.inspection.PartialDependenceDisplay", "Partial Dependence Plot visualization."),
    ("sklearn.inspection.permutation_importance", "Permutation importance for feature evaluation."),
    ("sklearn.inspection.DecisionBoundaryDisplay", "Decision boundary visualization."),
    ("sklearn.random_projection.GaussianRandomProjection", "Dimensionality reduction via Gaussian projection."),
    ("sklearn.random_projection.SparseRandomProjection", "Dimensionality reduction via sparse projection."),
    ("sklearn.datasets.make_classification", "Generate a random n-class classification problem."),
    ("sklearn.datasets.make_regression", "Generate a random regression problem."),
    ("sklearn.datasets.make_blobs", "Generate isotropic Gaussian blobs for clustering."),
    ("sklearn.datasets.make_moons", "Make two interleaving half circles."),
    ("sklearn.datasets.make_circles", "Make large circle containing smaller circle in 2D."),
    ("sklearn.datasets.make_swiss_roll", "Generate a Swiss roll dataset."),
    ("sklearn.datasets.make_s_curve", "Generate an S curve dataset."),
    ("sklearn.datasets.fetch_openml", "Fetch dataset from OpenML by name or id."),
    ("sklearn.datasets.load_iris", "Load the iris dataset (classification)."),
    ("sklearn.datasets.load_digits", "Load the digits dataset (classification)."),
    ("sklearn.datasets.load_diabetes", "Load the diabetes dataset (regression)."),
    ("sklearn.datasets.load_breast_cancer", "Load breast cancer dataset (classification)."),
    ("sklearn.datasets.load_wine", "Load the wine dataset (classification)."),
    ("sklearn.datasets.load_linnerud", "Load the Linnerud exercise dataset."),
    ("sklearn.datasets.fetch_california_housing", "Load California housing dataset (regression)."),
    ("sklearn.datasets.fetch_20newsgroups", "Load the 20 newsgroups dataset."),
    ("sklearn.datasets.fetch_lfw_people", "Load LFW people dataset."),
    ("sklearn.datasets.fetch_olivetti_faces", "Load Olivetti faces dataset."),
    ("sklearn.datasets.fetch_covtype", "Load covertype forest dataset."),
    ("sklearn.datasets.fetch_rcv1", "Load RCV1 multilabel dataset."),
    ("sklearn.datasets.fetch_kddcup99", "Load kddcup99 intrusion detection dataset."),
    ("sklearn.utils.Bunch", "Container object exposing keys as attributes."),
    ("sklearn.utils.resample", "Resample arrays or sparse matrices consistently."),
    ("sklearn.utils.shuffle", "Shuffle arrays or sparse matrices consistently."),
    ("sklearn.set_config", "Set global scikit-learn configuration."),
    ("sklearn.get_config", "Retrieve current global scikit-learn configuration."),
    ("sklearn.config_context", "Context manager for global scikit-learn configuration."),
    ("sklearn.clone", "Construct a new unfitted estimator with same parameters."),
]


_TERMINOLOGY = [
    ("attention", "Mechanism letting a model focus on relevant input parts when producing output, core to Transformers."),
    ("attention head", "One of multiple parallel attention computations, each learning different relationship patterns."),
    ("attention mask", "Binary mask preventing attention to padding tokens or future tokens during training."),
    ("autoregressive", "Model predicting the next token based on previous tokens, generating output step by step."),
    ("backpropagation", "Algorithm computing loss gradients w.r.t. parameters by applying chain rule backward through the computation graph."),
    ("backpropagation through time", "Backpropagation extended for RNNs, unrolling the network through time steps."),
    ("bag of words", "Text representation counting word occurrences, ignoring grammar and word order."),
    ("batch normalization", "Normalizes layer inputs across a mini-batch to stabilize and accelerate training."),
    ("beam search", "Decoding algorithm maintaining a fixed beam of highest-scoring partial sequences during generation."),
    ("bert", "Bidirectional Encoder Representations from Transformers: pre-trained LM reading text bidirectionally via masked language modeling."),
    ("bidirectional lstm", "LSTM processing a sequence in both forward and backward directions."),
    ("bleu score", "Metric measuring n-gram overlap between machine translation output and reference translations."),
    ("bpe", "Byte Pair Encoding: subword tokenization iteratively merging most frequent character pairs."),
    ("causal language modeling", "Training objective predicting the next token given all previous left-to-right tokens."),
    ("cnn", "Convolutional Neural Network: learns filters extracting local spatial features from grid data."),
    ("contextualized word embedding", "Word representation changing with surrounding context, unlike static embeddings."),
    ("conversational ai", "AI systems designed to engage in natural, human-like multi-turn dialogue."),
    ("coreference resolution", "Task of identifying all expressions referring to the same real-world entity in text."),
    ("cosine similarity", "Measure of similarity between two vectors, computed as cosine of the angle between them."),
    ("cross-attention", "Attention between two different sequences; decoder attends to encoder outputs."),
    ("cross-entropy", "Loss function measuring difference between two probability distributions for classification."),
    ("data augmentation", "Artificially increasing training data diversity via transformations like rotation or synonym replacement."),
    ("decoder", "Component generating output sequences from encoded representations, often autoregressively."),
    ("decoder-only", "Architecture using only decoder stack of Transformer (e.g., GPT) for text generation."),
    ("denoising autoencoder", "Autoencoder reconstructing clean input from corrupted version, learning robust features."),
    ("dependency parsing", "Analyzing grammatical structure of a sentence to identify dependency word relationships."),
    ("diffusion model", "Generative model learning to denoise data by reversing a gradual noising process."),
    ("distilbert", "Distilled BERT retaining 97% performance while 40% smaller and 60% faster."),
    ("dropout", "Regularization randomly dropping units during training to prevent co-adaptation."),
    ("early stopping", "Regularization halting training when validation performance stops improving."),
    ("electra", "Efficiently Learning an Encoder that Classifies Token Replacements Accurately."),
    ("elmo", "Embeddings from Language Models: deep contextualized word representations using bidirectional LSTMs."),
    ("embedding", "Dense vector representation of discrete items like words, capturing semantic relationships."),
    ("encoder", "Component transforming input into a fixed-length representation capturing essential information."),
    ("encoder-decoder", "Architecture with encoder creating context and decoder generating output."),
    ("epoch", "One complete pass through the entire training dataset."),
    ("fasttext", "Library for efficient text classification and word representation using subword n-grams."),
    ("feature extraction", "Process of transforming raw data into numerical features for machine learning."),
    ("few-shot learning", "Learning from only a few labeled examples per class, leveraging pre-trained knowledge."),
    ("fine-tuning", "Adapting a pre-trained model to a specific downstream task by additional training."),
    ("gan", "Generative Adversarial Network: two networks contesting, generator vs discriminator."),
    ("gpt", "Generative Pre-trained Transformer: autoregressive language model using decoder-only architecture."),
    ("gradient clipping", "Capping gradients to a maximum norm to prevent exploding gradients."),
    ("gradient descent", "Iterative optimization algorithm updating parameters in direction of negative gradient."),
    ("gru", "Gated Recurrent Unit: simpler gating mechanism than LSTM for controlling information flow."),
    ("hallucination", "When an LLM generates fluent text that is factually incorrect or unsupported."),
    ("hidden state", "Internal representation of an RNN at a specific time step, capturing sequence history."),
    ("hyperparameter", "Parameter whose value is set before training begins (learning rate, batch size, layers)."),
    ("inference", "Using a trained model to make predictions on new, unseen data."),
    ("instruction tuning", "Fine-tuning an LLM on instruction-response pairs to improve following of user directives."),
    ("language model", "Probability distribution over sequences of words predicting next token given context."),
    ("llama", "Meta open-weight LLM family using decoder-only Transformer architecture."),
    ("llm", "Large Language Model: Transformer-based model with billions of parameters trained on vast corpora."),
    ("lstm", "Long Short-Term Memory: RNN variant with gates controlling information flow for long-range dependencies."),
    ("masked language modeling", "Pre-training task predicting randomly masked tokens from their bidirectional context."),
    ("minibatch", "Small subset of training data used to compute gradient updates."),
    ("mistral", "Open-weight LLM family known for strong performance with efficient architecture."),
    ("multi-head attention", "Running multiple attention operations in parallel with different learned projection matrices."),
    ("named entity recognition", "Identifying and classifying named entities (persons, orgs, locations) in text."),
    ("n-gram", "Contiguous sequence of n items from a text sample, used in language modeling."),
    ("objective function", "Function to minimize or maximize during training, typically a loss function."),
    ("optimizer", "Algorithm adjusting model parameters to minimize the loss function (Adam, SGD, RMSprop)."),
    ("overfitting", "Model memorizing training data instead of learning generalizable features."),
    ("perplexity", "Metric measuring how well a probability model predicts a sample; lower is better."),
    ("positional encoding", "Adding position information to token embeddings so Transformers know token order."),
    ("pre-training", "Initial training phase on large general corpus before task-specific fine-tuning."),
    ("prompt", "Input text given to an LLM to elicit a specific type of response or behavior."),
    ("prompt engineering", "Crafting effective prompts to guide LLM output toward desired results."),
    ("rag", "Retrieval-Augmented Generation: augmenting LLM responses with retrieved external documents."),
    ("regularization", "Techniques preventing overfitting (L1/L2 penalty, dropout, early stopping)."),
    ("reinforcement learning from human feedback", "Fine-tuning LLMs using human preference comparisons as reward signal."),
    ("rnn", "Recurrent Neural Network: processes sequences by maintaining a hidden state passed between time steps."),
    ("self-attention", "Computing attention weights over all positions of the same sequence for internal dependencies."),
    ("sequence-to-sequence", "Model mapping an input sequence to an output sequence for translation and summarization."),
    ("softmax", "Function converting raw scores to probability distribution summing to 1."),
    ("subword tokenization", "Tokenizing text into subword units (BPE, WordPiece) balancing vocabulary and coverage."),
    ("temperature", "Parameter controlling randomness of LLM output: lower = more deterministic, higher = more creative."),
    ("token", "Basic unit of text processed by a language model: word, subword, or character."),
    ("tokenization", "Process of splitting text into discrete tokens for model input."),
    ("top-k sampling", "Decoding strategy sampling from k most likely next tokens, balancing quality and diversity."),
    ("top-p sampling", "Nucleus sampling: selecting from minimal token set exceeding cumulative probability p."),
    ("transfer learning", "Applying knowledge from one task to improve performance on a related downstream task."),
    ("transformer", "Attention-based architecture replacing recurrence, enabling parallel processing of sequences."),
    ("underfitting", "Model too simple to capture underlying data patterns, poor training and test performance."),
    ("vae", "Variational Autoencoder: generative model with probabilistic encoder learning latent representations."),
    ("vanishing gradient", "Gradients becoming extremely small in deep networks, preventing weight updates."),
    ("vector database", "Database optimized for storing and querying high-dimensional embedding vectors by similarity."),
    ("weight decay", "Regularization adding penalty proportional to squared parameter magnitude."),
    ("word embedding", "Dense vector representation of a word in continuous space capturing semantic meaning."),
    ("zero-shot learning", "Classifying instances of unseen classes without any training examples for those classes."),
    ("alexnet", "Pioneering deep CNN architecture that won ImageNet 2012, sparking the deep learning revolution."),
    ("anchor box", "Predefined bounding box shapes used in object detection to predict object locations."),
    ("augmentation", "Applying random transformations to images to increase training data diversity."),
    ("autoencoder", "Neural network learning to reconstruct its input through a bottleneck."),
    ("backbone", "Feature extraction network forming the base of detection/segmentation architectures."),
    ("bounding box", "Rectangle defining object location in an image for object detection tasks."),
    ("channel", "One slice of a feature map depth dimension, e.g., RGB has 3 channels."),
    ("classification", "Task of assigning a single label to an entire image (cat vs dog)."),
    ("convolution", "Operation sliding a filter over input, computing element-wise products for feature maps."),
    ("convolutional layer", "Layer applying learned filters to extract spatial features from input data."),
    ("densenet", "CNN where each layer connects to all subsequent layers for feature reuse."),
    ("detection", "Task of locating and classifying multiple objects within an image."),
    ("dilated convolution", "Convolution with gaps between kernel elements, increasing receptive field."),
    ("efficientdet", "Efficient object detection combining EfficientNet backbone with BiFPN."),
    ("efficientnet", "CNN family using compound scaling to uniformly scale depth, width, and resolution."),
    ("faster r-cnn", "Two-stage object detector with Region Proposal Network for candidate generation."),
    ("feature map", "Output of a convolutional layer: 3D tensor of learned features (H x W x C)."),
    ("feature pyramid network", "Architecture building multi-scale feature pyramids for multi-scale detection."),
    ("filter", "Small weight matrix convolved across input to detect specific patterns like edges."),
    ("focal loss", "Loss function down-weighting easy examples, focusing on hard negatives in detection."),
    ("fully convolutional network", "CNN using only conv layers, enabling arbitrary input sizes."),
    ("global average pooling", "Averaging each feature map to one value, reducing parameters."),
    ("googlenet", "CNN using Inception modules with parallel convolutions at multiple scales."),
    ("image segmentation", "Partitioning an image into multiple segments for object boundary identification."),
    ("imagenet", "Large-scale image dataset with 14M+ labeled images across 20K+ categories."),
    ("inception", "CNN module computing multiple conv sizes in parallel then concatenating results."),
    ("instance segmentation", "Detecting and segmenting each individual object instance (Mask R-CNN)."),
    ("intersection over union", "IoU: metric measuring overlap between predicted and ground-truth bounding boxes."),
    ("mask r-cnn", "Extension of Faster R-CNN adding branch for predicting object segmentation masks."),
    ("mobilenet", "Efficient CNN using depthwise separable convolutions for mobile vision."),
    ("non-maximum suppression", "Algorithm removing redundant overlapping bounding boxes, keeping highest-confidence ones."),
    ("object detection", "Task of locating and classifying objects in an image with bounding boxes."),
    ("optical flow", "Pattern of apparent motion of objects between consecutive video frames."),
    ("padding", "Adding border pixels around input to control output spatial dimensions."),
    ("panoptic segmentation", "Unified segmentation combining semantic and instance segmentation."),
    ("pooling", "Downsampling operation reducing spatial dimensions by summarizing regions (max or average)."),
    ("receptive field", "Region of the input image affecting a particular neuron activation."),
    ("resnet", "Residual Network introducing skip connections, enabling very deep network training."),
    ("segmentation", "Task of partitioning an image into semantically meaningful regions or objects."),
    ("semantic segmentation", "Classifying each pixel into a predefined category without distinguishing instances."),
    ("skip connection", "Direct connection from earlier to later layers, easing gradient flow."),
    ("ssd", "Single Shot Detector: one-stage object detection in a single forward pass."),
    ("stride", "Step size of convolution filter when sliding over the input."),
    ("style transfer", "Combining content of one image with artistic style of another using neural networks."),
    ("u-net", "Encoder-decoder architecture with skip connections for biomedical segmentation."),
    ("vgg", "Deep CNN using small 3x3 filters and uniform architecture, influential in transfer learning."),
    ("vision transformer", "Applying the Transformer architecture directly to image patches for classification."),
    ("visual question answering", "Task of answering natural language questions about image content."),
    ("yolo", "You Only Look Once: real-time one-stage object detection system."),
    ("action space", "Set of all possible actions an agent can take in an environment."),
    ("actor-critic", "RL architecture combining policy (actor) and value (critic) networks for stable learning."),
    ("agent", "Entity making decisions and taking actions within an environment to maximize cumulative reward."),
    ("bellman equation", "Fundamental equation relating state value to future expected rewards in RL."),
    ("deep q-network", "Neural network approximating Q-values for reinforcement learning, pioneered by DeepMind."),
    ("discount factor", "Gamma parameter determining present value of future rewards; between 0 and 1."),
    ("environment", "World the agent interacts with, providing states and rewards in response to actions."),
    ("episode", "Complete sequence of agent-environment interactions from start to terminal state."),
    ("experience replay", "Storing agent experiences in a buffer and sampling randomly for training."),
    ("exploration vs exploitation", "Trade-off between trying new actions and using known good actions."),
    ("markov decision process", "MDP: framework for modeling decision-making with states, actions, rewards, transitions."),
    ("model-free", "RL approach learning directly from experience without building an environment model."),
    ("model-based", "RL approach building an internal model of environment dynamics for planning."),
    ("monte carlo tree search", "Search algorithm using random sampling to evaluate moves, used in AlphaGo."),
    ("multi-armed bandit", "Simplified RL problem: choosing between options with unknown rewards."),
    ("off-policy", "Learning from data generated by a different behavior policy than being optimized."),
    ("on-policy", "Learning from data generated by the policy currently being optimized."),
    ("policy", "Strategy mapping states to actions; the agent decision-making function."),
    ("policy gradient", "Method directly optimizing policy parameters by estimating expected reward gradient."),
    ("ppo", "Proximal Policy Optimization: popular policy gradient method with clipped objective."),
    ("q-learning", "Value-based RL algorithm learning optimal action-value function Q(s,a)."),
    ("reward", "Scalar feedback signal indicating how well the agent performed an action in a state."),
    ("reward shaping", "Adding intermediate rewards to guide the agent toward desired behaviors faster."),
    ("state", "Complete description of the environment at a given time step."),
    ("temporal difference learning", "TD learning: combining Monte Carlo and dynamic programming using bootstrapping."),
    ("thompson sampling", "Bayesian approach selecting actions proportional to probability of being optimal."),
    ("value function", "Expected cumulative future reward starting from a state and following a policy."),
    ("ablation study", "Systematically removing components to measure their impact on model performance."),
    ("accuracy", "Fraction of correct predictions among total predictions for classification."),
    ("activation function", "Non-linear function applied to neuron outputs, enabling learning of complex patterns."),
    ("adversarial example", "Input intentionally perturbed to cause incorrect model predictions."),
    ("anomaly detection", "Identifying rare items differing significantly from the majority."),
    ("auc", "Area Under the ROC Curve: metric summarizing classifier performance across all thresholds."),
    ("baseline", "Simple model or heuristic used as a reference for evaluating complex approaches."),
    ("batch", "Subset of training data processed together in one forward/backward pass."),
    ("batch size", "Number of training examples in one batch; larger = more stable gradients, higher memory."),
    ("bias", "Learnable parameter added to weighted sum in a neuron; also: systematic model error."),
    ("bias-variance tradeoff", "Balance between underfitting (high bias) and overfitting (high variance)."),
    ("categorical cross-entropy", "Loss function for multi-class classification comparing predicted vs true probabilities."),
    ("checkpoint", "Saved snapshot of model parameters and optimizer state during training."),
    ("clustering", "Unsupervised learning task grouping similar data points without label guidance."),
    ("coefficient of determination", "R-squared: proportion of variance in dependent variable explained by the model."),
    ("confusion matrix", "Table showing true vs predicted classifications with false positives/negatives."),
    ("convergence", "Point where model parameters stabilize and loss stops decreasing during training."),
    ("cost function", "Function measuring model error; training aims to minimize it."),
    ("cross-validation", "Technique evaluating model generalization by training/testing on different data splits."),
    ("curse of dimensionality", "Phenomenon where data becomes sparse in high dimensions, making analysis harder."),
    ("dataset", "Collection of examples used for training, validation, or testing ML models."),
    ("decision boundary", "Surface separating different classes in feature space learned by a classifier."),
    ("dimensionality reduction", "Techniques reducing number of features while preserving structure (PCA, t-SNE)."),
    ("end-to-end learning", "Training a system to directly map raw input to output without hand-crafted steps."),
    ("ensemble", "Combining predictions from multiple models to improve performance and robustness."),
    ("exploding gradient", "Gradients growing exponentially in deep networks, causing unstable updates."),
    ("f1 score", "Harmonic mean of precision and recall, balancing both metrics."),
    ("false negative", "Instance incorrectly predicted as negative when actually positive."),
    ("false positive", "Instance incorrectly predicted as positive when actually negative."),
    ("feature", "Individual measurable property of data used as input to a model."),
    ("feature engineering", "Creating informative input features from raw data using domain knowledge."),
    ("feedforward", "Neural network where information flows from input to output without cycles."),
    ("generalization", "Model ability to perform well on unseen data, not just memorized training examples."),
    ("gpu", "Graphics Processing Unit: hardware accelerating parallel matrix operations for deep learning."),
    ("gradient", "Vector of partial derivatives of loss w.r.t. each parameter."),
    ("ground truth", "The correct, verified labels or values for evaluation data."),
    ("hyperparameter tuning", "Process of finding optimal hyperparameter values for model performance."),
    ("imbalanced dataset", "Dataset where some classes have significantly more examples than others."),
    ("inductive bias", "Assumptions a learning algorithm makes to generalize beyond training data."),
    ("initialization", "Setting initial parameter values before training, affecting convergence."),
    ("instance", "Single data point or example in a dataset (a row)."),
    ("k-fold cross-validation", "Splitting data into k folds, training on k-1 and testing on the held-out fold."),
    ("label", "The target output value assigned to a training example (ground truth)."),
    ("layer", "Group of neurons performing the same operation on their inputs in a network."),
    ("learning rate", "Step size controlling how much to update model weights each iteration."),
    ("learning rate decay", "Gradually reducing learning rate during training for precise convergence."),
    ("loss function", "Function quantifying difference between predicted and true values; training minimizes it."),
    ("loss landscape", "Topology of the loss function over parameter space, visualizing optima."),
    ("meta-learning", "Learning to learn: training algorithms that rapidly adapt to new tasks with few examples."),
    ("metric", "Quantitative measure evaluating model performance (accuracy, F1, RMSE)."),
    ("model", "Mathematical function mapping inputs to outputs, learned from data."),
    ("momentum", "Optimization technique accumulating past gradients to accelerate training."),
    ("multi-task learning", "Training a single model on multiple related tasks simultaneously."),
    ("negative sampling", "Training using small set of negative examples for efficiency."),
    ("neural network", "Computing system of interconnected nodes learning patterns through weighted connections."),
    ("neuron", "Basic unit of a neural network computing weighted sum plus bias, through activation."),
    ("normalization", "Scaling features to a standard range to improve training stability and convergence."),
    ("one-hot encoding", "Representing categorical values as binary vectors with single 1 and rest 0s."),
    ("online learning", "Training on a continuous data stream, updating the model incrementally."),
    ("outlier", "Data point significantly different from other observations, potentially error or anomaly."),
    ("parameter", "Learnable weight or bias value adjusted during training to minimize loss."),
    ("pca", "Principal Component Analysis: linear dimensionality reduction finding maximum variance directions."),
    ("precision", "Fraction of true positive predictions among all positive predictions."),
    ("recall", "Fraction of actual positive instances correctly identified by the model."),
    ("regression", "Supervised learning task predicting continuous numerical values from input features."),
    ("relu", "Rectified Linear Unit: activation function outputting max(0, x), addressing vanishing gradients."),
    ("roc curve", "Receiver Operating Characteristic curve: true positive rate vs false positive rate."),
    ("semi-supervised learning", "Learning from mix of labeled and unlabeled data, leveraging unlabeled for better representations."),
    ("sigmoid", "S-shaped activation function outputting values between 0 and 1."),
    ("stochastic gradient descent", "SGD: optimization using random mini-batches to estimate gradient."),
    ("supervised learning", "Learning from labeled examples, mapping inputs to known correct outputs."),
    ("support vector machine", "SVM: classifier finding maximum-margin hyperplane separating classes."),
    ("tanh", "Hyperbolic tangent activation outputting values between -1 and 1."),
    ("test set", "Held-out data used only for final evaluation, never seen during training."),
    ("training", "Process of adjusting model parameters to minimize loss on training dataset."),
    ("training set", "Data used to fit the model; model learns patterns from this subset."),
    ("tsne", "t-distributed Stochastic Neighbor Embedding: visualizing high-dimensional data."),
    ("umap", "Uniform Manifold Approximation and Projection: fast non-linear dimensionality reduction."),
    ("unsupervised learning", "Learning patterns from unlabeled data, discovering hidden structure without guidance."),
    ("validation set", "Data used to tune hyperparameters and monitor training, separate from test set."),
    ("weight", "Learnable multiplicative parameter applied to input signal in a neural network connection."),
    ("weight initialization", "Strategy for setting initial weight values affecting convergence speed."),
    ("xavier initialization", "Weight initialization scaling by fan-in/fan-out (Glorot init)."),
    ("zero-shot learning", "Classifying instances of unseen classes without any training examples."),
]


# Source: HuggingFace Hub  (~1000 items)
# ---------------------------------------------------------------------------

def _license_is_permissive(license_str):
    if not license_str:
        return False
    clean = license_str.lower().strip().replace("license:", "").replace("license-", "")
    return any(perm in clean for perm in PERMISSIVE_LICENSES)

def _hf_extract_license(info):
    """Try multiple fields where HF stores license info."""
    for field in ["cardData", "model-index"]:
        cd = info.get(field)
        if isinstance(cd, dict):
            lic = cd.get("license", "")
            if lic:
                return lic
    tags = info.get("tags", []) or []
    for t in tags:
        if t.lower().startswith("license"):
            return t
    return ""

def fetch_huggingface(limit=HUGGINGFACE_LIMIT):
    """Fetch most-downloaded model cards from HuggingFace Hub."""
    log.info("Fetching HuggingFace model cards (limit=%d)…", limit)
    items = []
    url = f"https://huggingface.co/api/models?sort=downloads&direction=-1&limit={min(limit, 100)}"
    seen = set()

    while url and len(items) < limit:
        resp = fetch_json(url, timeout=60)
        if resp is None:
            break
        if isinstance(resp, dict):
            resp = [resp]

        for model in resp:
            if not isinstance(model, dict):
                continue
            model_id = model.get("modelId") or model.get("id", "")
            if not model_id or model_id in seen:
                continue
            seen.add(model_id)

            # License filter
            lic = _hf_extract_license(model)
            if lic and not _license_is_permissive(lic):
                continue

            desc = (
                model.get("description", "")
                or model.get("cardData", {}).get("description", "")
                or ""
            )
            if not desc or len(desc.strip()) < 20:
                tag_str = ", ".join(t for t in (model.get("tags") or [])[:5]
                                    if not t.startswith("license"))
                pipeline = model.get("pipeline_tag", "")
                parts = []
                if pipeline:
                    parts.append(pipeline)
                if tag_str:
                    parts.append(tag_str)
                desc = "; ".join(parts) or model_id

            name = model_id.lower().split("/")[-1]
            items.append({
                "id": f"huggingface-{slugify(model_id)}",
                "name": name,
                "source": "huggingface",
                "source_url": f"https://huggingface.co/{model_id}",
                "description": truncate(desc),
            })
            if len(items) >= limit:
                break

        if len(items) < limit:
            time.sleep(0.5)
            next_idx = len(seen)
            url = f"https://huggingface.co/api/models?sort=downloads&direction=-1&limit=100&start={next_idx}"

    log.info("HuggingFace: %d items (license-filtered)", len(items))
    return items


# ---------------------------------------------------------------------------
# Source: arXiv  (~500 items)
# ---------------------------------------------------------------------------

def fetch_arxiv(limit=ARXIV_LIMIT):
    """Fetch cs.CL + cs.LG paper abstracts from arXiv API."""
    log.info("Fetching arXiv abstracts (limit=%d)…", limit)
    items = []
    start = 0
    batch_size = min(limit, 100)

    while len(items) < limit:
        query = "cat:cs.CL+OR+cat:cs.LG"
        url = (f"http://export.arxiv.org/api/query?"
               f"search_query={query}&sortBy=relevance"
               f"&start={start}&max_results={batch_size}")
        resp = fetch_url(url, timeout=60)
        if resp is None:
            break
        text = resp.text

        # Simple XML parsing (avoid extra dep)
        entries = re.findall(r"<entry>(.*?)</entry>", text, re.DOTALL)
        if not entries:
            break

        for entry in entries:
            arxiv_id = _re_first(r"<id>.*?/([^/<]+)(?:v\d+)?</id>", entry)
            title = _re_first(r"<title>(.*?)</title>", entry)
            summary = _re_first(r"<summary>(.*?)</summary>", entry)

            if not arxiv_id or not title:
                continue

            title = _clean_xml(title)
            summary = _clean_xml(summary) if summary else ""
            name = title.lower()
            # Strip leading article words for nicer names
            for prefix in ["the ", "a ", "an "]:
                if name.startswith(prefix):
                    name = name[len(prefix):]
            name = re.sub(r"[^a-z0-9\s]", "", name)
            name = " ".join(name.split()[:8])  # first ~8 words

            items.append({
                "id": f"arxiv-{slugify(arxiv_id)}",
                "name": name,
                "source": "arxiv",
                "source_url": f"https://arxiv.org/abs/{arxiv_id}",
                "description": truncate(summary),
            })

        start += len(entries)
        if len(entries) < batch_size:
            break
        time.sleep(3)  # arXiv rate limit: 1 req / 3 sec

    log.info("arXiv: %d items", len(items))
    return items[:limit]

def _re_first(pattern, text):
    m = re.search(pattern, text)
    return m.group(1).strip() if m else ""

def _clean_xml(s):
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    s = s.replace("&quot;", "\"").replace("&#39;", "'")
    return s


# ---------------------------------------------------------------------------
# Source: Wikipedia  (~500 items)
# ---------------------------------------------------------------------------

DISAMBIG_RE = re.compile(r"may refer to:|may also refer to:",
                          re.IGNORECASE)

def _wiki_page_exists(title):
    """Quick existence check via pageprops."""
    url = ("https://en.wikipedia.org/w/api.php?"
           f"action=query&titles={title}&prop=pageprops&format=json")
    data = fetch_json(url, timeout=15)
    if not data:
        return False
    pages = data.get("query", {}).get("pages", {})
    for pid, info in pages.items():
        if pid == "-1":
            return False
        if info.get("pageprops", {}).get("disambiguation") is not None:
            return False
        return True
    return False

def _wiki_extract(title):
    """Fetch first paragraph of a Wikipedia page."""
    url = ("https://en.wikipedia.org/w/api.php?"
           f"action=query&titles={title}&prop=extracts"
           "&exintro=1&explaintext=1&format=json")
    data = fetch_json(url, timeout=15)
    if not data:
        return "", False
    pages = data.get("query", {}).get("pages", {})
    for pid, info in pages.items():
        extract = (info.get("extract") or "").strip()
        if DISAMBIG_RE.search(extract):
            return "", True
        return extract, False
    return "", False

def fetch_wikipedia():
    """Fetch ML/DL/NLP/CV/RL article pages from Wikipedia."""
    log.info("Fetching Wikipedia articles…")
    items = []
    seen_urls = set()

    for cat in WIKI_CATEGORIES:
        cmcontinue = None
        cat_items = 0
        while True:
            url = ("https://en.wikipedia.org/w/api.php?"
                   "action=query&list=categorymembers"
                   f"&cmtitle=Category:{cat}&cmtype=page"
                   "&cmlimit=100&format=json")
            if cmcontinue:
                url += f"&cmcontinue={cmcontinue}"
            data = fetch_json(url, timeout=15)
            if not data:
                break

            members = (data.get("query", {}).get("categorymembers") or [])
            for m in members:
                title = m.get("title", "")
                if not title or title in seen_urls:
                    continue
                # Skip category/index pages
                if title.startswith("Category:") or title.startswith("Template:"):
                    continue
                seen_urls.add(title)

                extract, is_disambig = _wiki_extract(title)
                if is_disambig:
                    continue
                if not extract:
                    continue

                name = title.lower()
                items.append({
                    "id": f"wikipedia-{slugify(title)}",
                    "name": name,
                    "source": "wikipedia",
                    "source_url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                    "description": truncate(extract),
                })
                cat_items += 1

            cont = (data.get("continue") or {})
            cmcontinue = cont.get("cmcontinue")
            if not cmcontinue or cat_items >= 100:
                break
            time.sleep(1)

        log.info("  Category %s: %d items", cat, cat_items)

    log.info("Wikipedia: %d total items", len(items))
    return items


# ---------------------------------------------------------------------------
# Source: PyTorch docs  (~300 items) — hardcoded
# ---------------------------------------------------------------------------

def _pytorch_url(name):
    """Build PyTorch docs URL for an API name."""
    base = "https://pytorch.org/docs/stable"
    special = {
        "torch.Tensor": f"{base}/tensors.html",
        "torch.nn": f"{base}/nn.html",
        "torch.nn.functional": f"{base}/nn.functional.html",
        "torch.optim": f"{base}/optim.html",
        "torch.utils.data": f"{base}/data.html",
        "torch.distributed": f"{base}/distributed.html",
        "torch.cuda": f"{base}/cuda.html",
        "torch.quantization": f"{base}/quantization.html",
        "torch.autograd": f"{base}/autograd.html",
        "torch.jit": f"{base}/jit.html",
        "torch.linalg": f"{base}/linalg.html",
        "torchvision": "https://pytorch.org/vision/stable/index.html",
    }
    for prefix, url in special.items():
        if name == prefix or name.startswith(prefix + ".") and prefix in special:
            if name in special:
                return url
    return f"{base}/generated/{name}.html"

def build_pytorch_items():
    """Build items from hardcoded PyTorch API reference."""
    return [
        dict(
            id=f"pytorch-{slugify(name)}",
            name=name.lower(),
            source="pytorch",
            source_url=_pytorch_url(name),
            description=truncate(desc),
        )
        for name, desc in _PYTORCH_APIS
    ]


# ---------------------------------------------------------------------------
# Source: scikit-learn docs  (~300 items) — hardcoded
# ---------------------------------------------------------------------------

def _sklearn_url(name):
    """Build scikit-learn docs URL for an API name."""
    base = "https://scikit-learn.org/stable/modules/generated"
    return f"{base}/{name}.html"

def build_sklearn_items():
    """Build items from hardcoded scikit-learn API reference."""
    return [
        dict(
            id=f"sklearn-{slugify(name)}",
            name=name.lower(),
            source="sklearn",
            source_url=_sklearn_url(name),
            description=truncate(desc),
        )
        for name, desc in _SKLEARN_APIS
    ]


# ---------------------------------------------------------------------------
# Source: Terminology  (~400 items) — hardcoded
# ---------------------------------------------------------------------------

def build_terminology_items():
    """Build items from hardcoded NLP/CV/RL glossary."""
    return [
        dict(
            id=f"terminology-{slugify(name)}",
            name=name.lower(),
            source="terminology",
            source_url=None,
            description=truncate(desc),
        )
        for name, desc in _TERMINOLOGY
    ]


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def deduplicate(all_items):
    """Deduplicate by name: keep first occurrence."""
    seen = {}
    result = []
    for item in all_items:
        name = item["name"]
        if name not in seen:
            seen[name] = True
            result.append(item)
        else:
            log.debug("Duplicate name skipped: %s", name)
    dupes = len(all_items) - len(result)
    if dupes:
        log.info("Deduplicated: %d name collisions resolved", dupes)
    return result

def build_embedding_text(item):
    """Construct the text string to embed for a corpus item."""
    desc = item.get("description") or ""
    return f"[{item['name']}] {desc}"

def embed_items(items, model):
    """Batch-embed all items with sentence-transformers. Returns N×384 float64."""
    log.info("Embedding %d items with %s…", len(items), MODEL_ID)
    texts = [build_embedding_text(it) for it in items]
    vectors = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False,
    )
    log.info("Embeddings: %s", vectors.shape)
    return vectors  # (N, 384) float32

def fit_pca(vectors):
    """Fit PCA-3 and return (mean, components, variance_explained, projected)."""
    log.info("Fitting PCA-3 on %d vectors…", vectors.shape[0])
    pca = PCA(n_components=3, random_state=42)
    projected = pca.fit_transform(vectors)
    log.info("PCA variance explained: %.4f, %.4f, %.4f",
             *pca.explained_variance_ratio_)
    return (
        pca.mean_.tolist(),          # (384,)
        pca.components_.tolist(),    # (3, 384)
        pca.explained_variance_ratio_.tolist(),
        projected.astype(np.float32),
    )

def normalize_positions(positions):
    """Scale PCA-3 positions to fit within a ±10 cube."""
    max_abs = np.max(np.abs(positions))
    if max_abs == 0:
        return positions
    scale = 10.0 / max_abs
    log.info("Position scaling: max_abs=%.3f → scale=%.3f", max_abs, scale)
    return (positions * scale).astype(np.float32)

def build_output(items, positions, nn_list, pca_mean, pca_components,
                  variance_explained, vec_data):
    """Assemble final corpus dictionary for corpus.json.gz."""
    for item, pos, nns in zip(items, positions, nn_list):
        item["pos"] = [float(x) for x in pos]
        # nn names resolved from indices (done in main)
        item["nn"] = nns

    vec_sha256 = hashlib.sha256(vec_data).hexdigest()

    return {
        "items": items,
        "pca": {
            "mean": pca_mean,
            "components": pca_components,
        },
        "model": {
            "id": MODEL_ID,
            "corpus_version": CORPUS_VERSION,
            "corpus_size": len(items),
            "variance_explained": variance_explained,
            "vec_sha256": vec_sha256,
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    setup_logging()
    parser = argparse.ArgumentParser(
        description="Generate the Semantic Arithmetic Playground corpus.")
    parser.add_argument("--out", default="data/", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Fetch all sources
    log.info("=" * 50)
    log.info("Phase 1: Fetching sources")
    log.info("=" * 50)

    sources = {
        "huggingface": fetch_huggingface,
        "arxiv": fetch_arxiv,
        "wikipedia": fetch_wikipedia,
        "pytorch": build_pytorch_items,
        "sklearn": build_sklearn_items,
        "terminology": build_terminology_items,
    }
    expected_map = {
        "huggingface": 1000, "arxiv": 500, "wikipedia": 500,
        "pytorch": 300, "sklearn": 300, "terminology": 400,
    }

    all_items = []
    for source_name, fetcher in sources.items():
        try:
            items = fetcher()
        except Exception:
            log.exception("Failed to fetch source: %s", source_name)
            items = []
        all_items.extend(items)
        expected = expected_map[source_name]
        actual = len(items)
        if actual < expected * MIN_SOURCE_FRAC:
            log.warning(
                "%s yielded %d items (< %d%% of expected %d) — continuing",
                source_name, actual, int(MIN_SOURCE_FRAC * 100), expected)

    log.info("Total items across sources: %d", len(all_items))
    if len(all_items) < EXPECTED_TOTAL * MIN_SOURCE_FRAC:
        log.warning("Total items %d < %d%% of expected %d",
                     len(all_items), int(MIN_SOURCE_FRAC * 100), EXPECTED_TOTAL)

    # 2. Deduplicate
    items = deduplicate(all_items)
    log.info("After dedup: %d items", len(items))

    # 3. Load embedding model
    log.info("=" * 50)
    log.info("Phase 2: Embedding")
    log.info("=" * 50)
    model = SentenceTransformer(MODEL_ID)

    # 4. Embed
    vectors = embed_items(items, model)

    # 5. PCA-3
    log.info("=" * 50)
    log.info("Phase 3: PCA and positions")
    log.info("=" * 50)
    pca_mean, pca_components, variance_explained, projected = fit_pca(vectors)
    positions = normalize_positions(projected)

    # 6. Nearest neighbors
    log.info("=" * 50)
    log.info("Phase 4: Nearest neighbors")
    log.info("=" * 50)
    from sklearn.preprocessing import normalize as sk_normalize
    normed = sk_normalize(vectors, norm="l2")
    sim = normed @ normed.T
    np.fill_diagonal(sim, -1.0)

    name_lookup = [it["name"] for it in items]
    nn_list = []
    for i in tqdm(range(len(items)), desc="NN search"):
        top_indices = np.argsort(-sim[i])[:10]
        nn_list.append([
            {"name": name_lookup[idx], "score": float(sim[i][idx])}
            for idx in top_indices
        ])

    # 7. Write output
    log.info("=" * 50)
    log.info("Phase 5: Writing output")
    log.info("=" * 50)

    vec_data = vectors.astype(np.float32).tobytes()
    corpus = build_output(items, positions, nn_list, pca_mean,
                          pca_components, variance_explained, vec_data)

    json_path = out_dir / "corpus.json.gz"
    log.info("Writing %s...", json_path)
    json_bytes = json.dumps(corpus, ensure_ascii=False).encode("utf-8")
    with gzip.open(json_path, "wb", compresslevel=9) as f:
        f.write(json_bytes)

    vec_path = out_dir / "corpus.vec.f32"
    log.info("Writing %s (%d bytes)...", vec_path, len(vec_data))
    with open(vec_path, "wb") as f:
        f.write(vec_data)

    log.info("=" * 50)
    log.info("Done!")
    log.info("  Items:         %d", len(items))
    log.info("  Corpus JSON:   %s (%.1f KB)", json_path,
             json_path.stat().st_size / 1024)
    log.info("  Vectors:       %s (%.1f KB)", vec_path,
             vec_path.stat().st_size / 1024)
    log.info("  PCA variance:  %.2f%% / %.2f%% / %.2f%%  (total %.2f%%)",
             variance_explained[0] * 100, variance_explained[1] * 100,
             variance_explained[2] * 100, sum(variance_explained) * 100)
    log.info("  vec_sha256:    %s", corpus["model"]["vec_sha256"])
    log.info("=" * 50)


if __name__ == "__main__":
    main()
