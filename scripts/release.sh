#!/usr/bin/env bash


RELEASE_ACTION="create"
GH_TAG=$(date +%Y-%m)

create_registry() {
  bun .
  zip -r registry.json.zip registry.json
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
    gh release upload --clobber "$GH_TAG" registry.json.zip
  else
    echo "Creating new release $GH_TAG"
    gh release create --generate-notes "$GH_TAG" registry.json.zip
  fi
}

release() {
  create_registry
  set_release_action
  do_gh_release
}

release
