# SafeBhoomi

## Landslide Intelligence Platform for Uttarakhand

SafeBhoomi is an AI-assisted landslide intelligence platform designed to help
analyse landslide risk, monitor hazards, understand terrain conditions and
support safer decisions in Uttarakhand.

## Core System

- Uttarakhand district intelligence
- Multi-factor landslide risk engine
- Terrain and slope analysis
- Rainfall inputs
- Soil saturation inputs
- Historical susceptibility
- Risk drivers
- Simulation engine
- Landslide database
- React frontend
- FastAPI backend
- SQLite database
- Render deployment configuration

## Technology

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- Uvicorn
- Pydantic

### Data
- SQLite
- CSV datasets
- Terrain modelling
- Historical landslide records

## Architecture

React Frontend
       |
       v
FastAPI Backend
       |
       +---- Unified Risk Engine
       |
       +---- Terrain Engine
       |
       +---- Simulation Engine
       |
       +---- SQLite Database

## Project Structure

backend/
    FastAPI backend and intelligence engines

frontend_react/
    Production React application

data/
    SafeBhoomi datasets and database

render.yaml
    Render deployment configuration

## Important

SafeBhoomi distinguishes between modelled, input and historical data.
Live external data sources are not represented as live unless successfully
connected and verified.

## Deployment

The project is configured for deployment on Render.
