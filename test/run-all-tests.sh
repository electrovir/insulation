#!/usr/bin/env bash

EXIT_STATUS=0
# run all tests but note if any of them fail for later
# --silent to prevent multiple `npm err` messages.
npm run --silent test:api || EXIT_STATUS=$?
npm run --silent test:cli || EXIT_STATUS=$?
exit $EXIT_STATUS