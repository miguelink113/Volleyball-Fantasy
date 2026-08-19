#!/bin/bash
# Script para generar tipos TypeScript desde Supabase
# Uso: npm run generate-types

# Reemplaza YOUR_PROJECT_ID con tu ID de proyecto
# Puedes encontrarlo en https://app.supabase.com/project/YOUR_PROJECT_ID/settings/general

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Por favor proporciona el ID del proyecto Supabase"
  echo "Uso: npm run generate-types YOUR_PROJECT_ID"
  exit 1
fi

echo "Generando tipos TypeScript para el proyecto: $PROJECT_ID"
npx supabase gen types typescript --project-id $PROJECT_ID --schema public > lib/database.types.ts
echo "✓ Tipos generados en lib/database.types.ts"
