#!/bin/bash
# Quick fix for query param types across all controllers

# Add helper function to each controller
find src/controllers -name "*.controller.ts" -exec sed -i.bak '1s/^/\/\/ Helper to handle query params\nconst getQueryParam = (param: string | string[] | undefined): string | undefined => Array.isArray(param) ? param[0] : param;\n\n/' {} \;

echo "Type fixes applied"
