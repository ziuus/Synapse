"""
Synapse Switcher Benchmark
Tests switcher accuracy against labeled queries.
Run: python tools/benchmark.py
"""

import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from core.classifier import TFIDFClassifier
from core.context import ContextTracker

BENCHMARK_QUERIES = [
    ("hello, how are you doing today?", "chat"),
    ("what is the speed of light?", "chat"),
    ("who wrote hamlet?", "chat"),
    ("write a binary search in python", "code"),
    ("fix this javascript null error", "code"),
    ("create a SQL JOIN query", "code"),
    ("solve x squared minus 9 equals 0", "math"),
    ("what is the derivative of e to the x", "math"),
    ("calculate compound interest at 5 percent", "math"),
    ("what is in this image?", "vision"),
    ("describe this photo please", "vision"),
    ("summarize this article for me", "summarize"),
    ("give me the key points", "summarize"),
    ("implement quicksort algorithm", "code"),
    ("find the eigenvalues of this matrix", "math"),
    ("good morning!", "chat"),
    ("debug my react component", "code"),
    ("integrate sin x from 0 to pi", "math"),
    ("translate this to french", "chat"),
    ("what does this picture show", "vision"),
]

GREEN = "\033[92m"
RED   = "\033[91m"
CYAN  = "\033[96m"
BOLD  = "\033[1m"
RESET = "\033[0m"
DIM   = "\033[2m"


def run_benchmark():
    print(f"\n{CYAN}{BOLD}⚡ Synapse Switcher Benchmark{RESET}")
    print(f"{DIM}Testing classifier accuracy on {len(BENCHMARK_QUERIES)} queries{RESET}\n")

    clf = TFIDFClassifier()
    if not clf.is_available:
        print(f"{RED}✗ sklearn not installed. Run: pip install scikit-learn{RESET}")
        return

    correct = 0
    results = []

    for query, expected in BENCHMARK_QUERIES:
        predicted, confidence = clf.predict(query)
        ok = predicted == expected
        if ok:
            correct += 1
        results.append((query, expected, predicted, confidence, ok))

    # Print results
    print(f"{'Query':<45} {'Expected':<12} {'Got':<12} {'Conf':>6}  {'':>4}")
    print("─" * 85)
    for query, expected, predicted, conf, ok in results:
        status = f"{GREEN}✓{RESET}" if ok else f"{RED}✗{RESET}"
        q = query[:43] + ".." if len(query) > 45 else query
        exp_color = CYAN if ok else DIM
        pred_color = GREEN if ok else RED
        print(f"{q:<45} {exp_color}{expected:<12}{RESET} {pred_color}{predicted:<12}{RESET} {conf:>6.1%}  {status}")

    accuracy = correct / len(BENCHMARK_QUERIES) * 100
    print("─" * 85)
    grade = GREEN if accuracy >= 80 else (CYAN if accuracy >= 60 else RED)
    print(f"\n{BOLD}Accuracy: {grade}{accuracy:.1f}%{RESET} ({correct}/{len(BENCHMARK_QUERIES)} correct)\n")

    if accuracy < 60:
        print(f"{RED}⚠ Low accuracy — consider adding more training data to classifier.py{RESET}")
    elif accuracy < 80:
        print(f"{CYAN}◎ Decent accuracy — add more examples for weak categories{RESET}")
    else:
        print(f"{GREEN}✓ Good accuracy!{RESET}")
    print()


if __name__ == "__main__":
    run_benchmark()
