#!/bin/bash

mkdir -p public/flags

BASE_URL="https://flagcdn.com/w320"

codes=(
  fr gb de es it nl pt be ch at
  ba hr cz tr no se
  us ca mx br ar co cl ec py uy pa cw ht
  ma sn dz tn eg za cv ci
  au jp kr sa qa ir iq ae
)

for code in "${codes[@]}"; do
  echo "Downloading $code..."
  curl -s "$BASE_URL/$code.png" -o "public/flags/$code.png"
done

# Aliases projet
cp public/flags/hr.png public/flags/cr.png 2>/dev/null
cp public/flags/gb.png public/flags/sc.png 2>/dev/null

echo "✅ Flags downloaded into /public/flags"