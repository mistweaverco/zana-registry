#!/usr/bin/env bash


RELEASE_ACTION="create"
GH_TAG=$(date +%Y-%m)

create_registry() {
  (bun . && zip -r registry.json.zip registry.json && zip -r zana-registry.json.zip zana-registry.json) || exit 1
  sha256sum zana-registry.json zana-registry.json.zip > zana-checksums.txt || exit 1
  sha256sum registry.json registry.json.zip > checksums.txt || exit 1
}

set_release_action() {
  if gh release view "$GH_TAG" --json id --jq .id > /dev/null 2>&1; then
    echo "Release $GH_TAG already exists, updating it"
    RELEASE_ACTION="edit"
  else
    echo "Release $GH_TAG does not exist, creating it"
    RELEASE_ACTION="create"
  fi
}

do_gh_release() {
  if [ "$RELEASE_ACTION" == "edit" ]; then
    echo "Overwriting existing release $GH_TAG"
    gh release upload --clobber "$GH_TAG" zana-registry.json.zip zana-checksums.txt registry.json.zip checksums.txt
  else
    echo "Creating new release $GH_TAG"
    gh release create --generate-notes "$GH_TAG" zana-registry.json.zip zana-checksums.txt registry.json.zip checksums.txt
  fi
}

release() {
  create_registry
  set_release_action
  do_gh_release
}

release
