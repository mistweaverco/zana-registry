#!/usr/bin/env bash

set -eo pipefail

HAS_ERRORS=false
ERRORS_FOUND=()

# Check YAML files
if ! command -v yamllint &> /dev/null; then
    echo "yamllint is not installed. Please install it to check YAML files."
    exit 1
fi
yamllint . || HAS_ERRORS=true && ERRORS_FOUND+=("YAML linting failed. Please fix the issues and try again.")

# Root node scripts
bun install --frozen-lockfile || HAS_ERRORS=true && ERRORS_FOUND+=("Dependency installation in root failed. Please check your package.json and try again.")
bun run lint scripts || HAS_ERRORS=true && ERRORS_FOUND+=("Linting scripts failed. Please fix the issues and try again.")

# Web node files/scripts
cd web || (echo "Web directory not found. Please ensure you are in the correct directory and try again." && exit 1)
bun install --frozen-lockfile || HAS_ERRORS=true && ERRORS_FOUND+=("Dependency installation in web failed. Please check your package.json and try again.")
bun run lint || HAS_ERRORS=true && ERRORS_FOUND+=("Linting web failed. Please fix the issues and try again.")

# Check if any errors were found
if [ "$HAS_ERRORS" = true ]; then
    echo "Linting completed with errors:"
    for error in "${ERRORS_FOUND[@]}"; do
        echo "- $error"
      done
    exit 1
  else
    echo "Linting completed successfully. No issues found."
    exit 0
fi
