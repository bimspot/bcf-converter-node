#!/bin/bash

BCF_PATH=$1
JSON_PATH=$2

echo "BCF converter started"
echo "BCF Path: $BCF_PATH"
echo "Output JSON: $JSON_PATH"

mkdir -p $(dirname "$JSON_PATH")

# Converting BCF to JSON
echo "Converting BCF to JSON"
bcf-converter $BCF_PATH $JSON_PATH