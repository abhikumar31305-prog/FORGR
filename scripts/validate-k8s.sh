#!/usr/bin/env bash
# validate-k8s.sh — Validate Kubernetes manifests using kubeconform
# Usage: ./scripts/validate-k8s.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"

echo "═══════════════════════════════════════════════════"
echo "  FORGR K8s Manifest Validation"
echo "═══════════════════════════════════════════════════"

# Check if kubeconform is installed
if command -v kubeconform &> /dev/null; then
    echo "Using kubeconform..."
    kubeconform -summary -strict -ignore-missing-schemas "$K8S_DIR"/*.yaml
    echo ""
    echo "✅ All K8s manifests are valid."
elif command -v kubeval &> /dev/null; then
    echo "Using kubeval..."
    kubeval --strict "$K8S_DIR"/*.yaml
    echo ""
    echo "✅ All K8s manifests are valid."
else
    echo "⚠️  Neither kubeconform nor kubeval found."
    echo "   Install kubeconform: https://github.com/yannh/kubeconform"
    echo ""
    echo "   Falling back to basic YAML syntax check..."
    for f in "$K8S_DIR"/*.yaml; do
        python3 -c "import yaml; yaml.safe_load_all(open('$f'))" && echo "  ✓ $(basename $f)" || echo "  ✗ $(basename $f)"
    done
fi
