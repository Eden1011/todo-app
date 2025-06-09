#!/bin/bash
set -e

echo "🔧 Fixing Docker images for minikube..."

# Configure Docker to use minikube
eval $(minikube docker-env)

# Build all service images
echo "🔨 Building auth-service..."
cd services/auth-service && docker build -t auth-service:latest .

echo "🔨 Building db-service..."
cd ../db-service && docker build -t db-service:latest .

echo "🔨 Building chat-service..."
cd ../chat-service && docker build -t chat-service:latest .

echo "🔨 Building frontend-service..."
cd ../frontend-service && docker build -t frontend-service:latest .

cd ../..

echo "✅ Verifying images..."
docker images | grep -E "(auth-service|db-service|chat-service|frontend-service)"

echo "🚀 Redeploying application..."
kubectl delete -f k8s/todo-app-k8s.yaml
sleep 5
kubectl apply -f k8s/todo-app-k8s.yaml

echo "⏳ Waiting for pods..."
kubectl get pods -w
