#!/usr/bin/env bash

# Fail if a command fails
set -e

cd "$(dirname "$0")"
TEST_DIR="$(mktemp -d)"

if ! [ -d ../packages/build-lit/dist ]; then
	echo "Build '@snuggery/build-lit' first" >&2
	exit 1
fi

# Test extract-i18n

echo "Testing extract-i18n..." >&2
echo >&2

sn extract-i18n
run -TB prettier --write locale/*.xlf
# --exit-code makes git diff fail if there are differences
git diff --exit-code locale

build-lit extract-i18n
run -TB prettier --write locale/*.xlf
# --exit-code makes git diff fail if there are differences
git diff --exit-code locale

# Test build

echo >&2
echo "Testing build..." >&2
echo >&2

sn build --configuration translated --outdir "$TEST_DIR"

function expect_translation {
	if ! grep -q "$2" "$TEST_DIR/lorem/ipsum/$1/index.js"; then
		echo "Expected \"$2\" for translation $1" >&2;
		exit 1
	fi
}
function expect_not_translation {
	if grep -q "$2" "$TEST_DIR/lorem/ipsum/$1/index.js"; then
		echo "Didn't expect \"$2\" for translation $1" >&2;
		exit 1
	fi
}

expect_translation en 'Help me, '
expect_not_translation en 'Help mij, '

expect_not_translation nl 'Help me, '
expect_translation nl 'Help mij, '

rm -rf "$TEST_DIR"
build-lit build -c translated --outdir "$TEST_DIR"

expect_translation en 'Help me, '
expect_not_translation en 'Help mij, '

expect_not_translation nl 'Help me, '
expect_translation nl 'Help mij, '

# Test serve

echo >&2
echo "Testing serve..." >&2
echo >&2

sn e2e
