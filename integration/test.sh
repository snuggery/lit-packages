#!/usr/bin/env bash

# Fail if a command fails
set -e

cd "$(dirname "$0")"
TEST_DIR="$(mktemp -d)"

# Test extract-i18n

echo "Testing extract-i18n..." >&2
echo >&2

sn extract-i18n --output-path "$TEST_DIR"
diff messages.xlf "$TEST_DIR/messages.xlf"

# Test generation of components

echo "Testing generation of components..." >&2
echo >&2

cp -a src/generated-components "$TEST_DIR"
sn run schematic @ngx-lit/build-angular/dist:elements-to-components
yarn run -TB prettier --write src/generated-components
diff --recursive "$TEST_DIR/generated-components" src/generated-components

# Test build

echo >&2
echo "Testing build..." >&2
echo >&2

sn build --configuration development,translated --output-path "$TEST_DIR"

function expect_translation {
	if ! grep -q "$2" "$TEST_DIR/$1/main.js"; then
		echo "Expected \"$2\" for translation $1" >&2;
		exit 1
	fi
}
function expect_not_translation {
	if grep -q "$2" "$TEST_DIR/$1/main.js"; then
		echo "Didn't expect \"$2\" for translation $1" >&2;
		exit 1
	fi
}

expect_translation en 'This is a translated text for '
expect_translation en 'This is a translated template for '
expect_not_translation en 'Dit is een vertaalde tekst voor '
expect_not_translation en 'Dit is een vertaald sjabloon voor '

expect_not_translation nl 'This is a translated text for '
expect_not_translation nl 'This is a translated template for '
expect_translation nl 'Dit is een vertaalde tekst voor '
expect_translation nl 'Dit is een vertaald sjabloon voor '

# Test serve

echo >&2
echo "Testing serve..." >&2
echo >&2

sn e2e
