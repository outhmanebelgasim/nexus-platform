# NEXUS Platform

## Description

NEXUS Platform is a modern agricultural monitoring platform developed as part of an engineering internship project. The goal is to build a scalable web application for collecting, processing, storing, and visualizing environmental data from weather stations and soil moisture sensors.

The platform is designed to integrate with the existing Windows-based data acquisition server without modifying its operation. The backend will retrieve data from the existing system, validate and process it, store it in a dedicated database, and expose it through REST APIs for the frontend application.

## Technology Stack

### Backend

* Java 21
* Spring Boot
* Spring Data JPA
* Maven

### Frontend

* React
* TypeScript

### Database

* PostgreSQL
* TimescaleDB

### Cache

* Redis

### Development & Deployment

* Docker
* Git
* GitHub
* IntelliJ IDEA
* Visual Studio Code

## Development Workflow

The project follows a Git branching strategy based on:

* `main` – Stable production-ready code.
* `develop` – Main development branch.
* `feature/<feature-name>` – Individual feature branches.

Each feature is developed independently and merged into `develop` through Pull Requests before being integrated into `main`.

## Current Status

The project is currently in its initial setup phase.

### Completed

* Spring Boot project initialization
* Maven project configuration
* Git repository setup
* Initial project structure
* Development workflow definition


## Contributors

* Outhmane Belgasim
* Amine Jabrane

## License

This project is developed as part of an engineering internship and is intended for educational and research purposes.
