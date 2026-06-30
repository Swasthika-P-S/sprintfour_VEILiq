---
title: VEILiq
emoji: 🛡️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---
# VEILiq – Intelligent Redaction Review System

> A full-stack application that detects, reviews, and corrects sensitive information (PII) before documents are shared with AI models.
## Project Demo

 **Watch the Demo:**  
[VEILiq - Project Demonstration](https://drive.google.com/file/d/10CjRAHnKg2AebX5wCx9qMEZ5JUXOtYGj/view?usp=sharing)

PII Guardian solves the problem of security and privacy leakage by allowing users to scan text, visually review and audit detected entities (Indian Mobile Numbers, Emails, PAN Cards, Aadhaar Cards, IFSC, DOB, Names, and Addresses), customize redactions, and export secure text.

---

## Tech Stack & Architecture

- **Frontend**: React (JS), Axios, Vanilla CSS (custom design system)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Local instance)
- **AI/NER Service**: Google Gemini API (1.5 Flash) + Regex Pattern Matching Hybrid Pipeline

---

## Key Features

1. **Sage-Green Premium UI**: Clean, minimal, modern aesthetic using CSS variables, micro-animations, and responsive cards.
2. **Hybrid Detection Engine**: Combines the absolute precision of regexes (for standard formats like PAN, Aadhaar, Emails, Phone) with the semantic power of Google Gemini AI (for Names, Addresses, and Organizations).
3. **Interactive Review Panel**: Full control to **Accept**, **Reject**, or **Edit** the replacement token for every single flagged item.
4. **Ad-Hoc Custom PII Additions**: Select or type any missing information, choose its category, and add it immediately with one click.
5. **Real-Time Confidence Metrics**: Visual status bars showing detection confidence percentages.
6. **"Why was this detected?" Explanation**: Click on any detected item to see a clear, developer-friendly explanation of why the engine flagged it.
7. **Interactive Dashboard Statistics**: Real-time counter cards showing documents loaded, total items found, accepted, and rejected.
8. **Document History Database**: Full persistence in MongoDB to review previous redaction runs.

---

##  Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/pii-guardian
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`.

---
