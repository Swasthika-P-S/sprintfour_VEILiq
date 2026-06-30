# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Setup the backend
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .

# Copy the built frontend static files
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Hugging Face Spaces requires port 7860
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["node", "server.js"]
