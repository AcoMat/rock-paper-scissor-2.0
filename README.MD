# Rock Paper Scissors 2.0
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Google Gemini](https://img.shields.io/badge/google%20gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)

Una moderna implementación multijugador en tiempo real del clásico juego Piedra, Papel o Tijera, con objetos personalizados impulsados por la IA y un escenario de batalla interactivo.

## Overview

Piedra, papel o tijera 2.0 reimagina el tradicional juego de manos con un giro digital. Los jugadores pueden elegir las opciones clásicas (piedra, papel o tijera) o crear objetos personalizados que compiten en una arena de batalla en la que los objetos se mueven, chocan y se convierten entre sí según reglas de juego generadas por la IA.

## Features

- 🎮 Jugabilidad clásica de piedra, papel o tijera con un toque especial
- 🌐 Multijugador en tiempo real a través de WebSockets
- 🧠 Integración de la IA de Google Gemini para generar lógica de juego personalizada 
- 🏆 Arena de batalla interactiva con objetos emoji en movimiento
- 🚀 Funcionalidad Boost para dar ventajas de velocidad a tus objetos
- 🎭 Crea tus propios objetos personalizados con relaciones dinámicas

## Tech Stack

### Client-side
- React.js para la UI 
- Cliente Socket.io para la comunicacion en tiempo real
- HTML5 Canvas para el escenario del juego 

### Server-side
- Node.js con Express
- Socket.io para conexiones WebSocket 
- Google Generative AI (Gemini 2.0 Flash model) para la lógica de juego personalizada 

## Installation

### Prerequisites
- Node.js (v14 o superior)
- npm o alternativas
- Google Gemini API key

### Client Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/rock-paper-scissors-2.0.git

# Navigate to client directory
cd rock-paper-scissors-2.0/client

# Install dependencies
npm install

# Start the client application
npm run dev
```

### Server Setup
```bash
# Navigate to server directory
cd rock-paper-scissors-2.0/server

# Install dependencies
npm install

# Navigate to src directory
cd /src

# Create a .env file and add your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the server
npm start server.js
```

## Environment Variables

El servidor requiere las siguientes variables de entorno:
- `GEMINI_API_KEY` - Una clave de API de Google Gemini para la generación de lógica de IA.

## Integración de IA / Objetos personalizados

Los jugadores pueden crear objetos personalizados escribiendo un nombre. El proyecto utiliza la IA Generativa de Google (modelo Gemini 2.0 Flash) para crear una lógica de juego dinámica para los objetos personalizados, creando una variante de piedra, papel o tijera dinámica y única.

La IA garantiza que
- Cada objeto tenga relaciones con todos los demás objetos
- No haya contradicciones
- Cada objeto tenga un emoji único
- Cada objeto tenga al menos una relación ganadora y una perdedora
- Además se explica la lógica de cada relación
