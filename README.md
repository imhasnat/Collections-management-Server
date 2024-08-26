# Collection Management System - Server

This is the backend server for the Collection Management System. It provides RESTful APIs for user authentication, collection management, item management, and more.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

## Overview

The backend server is built with Node.js and Express, using Sequelize for ORM and MySQL as the database. It handles all the business logic, user authentication, and database operations.

## Features

- **User Authentication**: JWT-based authentication with role-based access control.
- **Collection Management**: APIs for managing collections and items with custom fields.
- **User Management**: Admin panel for managing users, roles, and statuses.
- **API Security**: Secure API endpoints with middleware for authentication and authorization.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express**: Fast, unopinionated, minimalist web framework for Node.js.
- **Sequelize**: Promise-based Node.js ORM for SQL databases.
- **JWT**: JSON Web Token for authentication.
- **MySQL**: Relational database management system.
- **dotenv**: For managing environment variables.

## Installation

### Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **MySQL**: A running instance of MySQL.

### Clone the Repository

```bash
git clone https://github.com/yourusername/collection-management-server.git
cd collection-management-server

```

Install Dependencies

```bash
npm install
```

Configure Environment Variables

- Create a .env file in the root directory based on the provided .env.example file.
- Set up your database connection, JWT secret, and other environment variables.

Start the Server

```bash
npm start
```

The server will run on http://localhost:5000.

## Usage

Base URL: http://localhost:5000. Use Postman or any API client to interact with the API endpoints.

## Project Structure

![Project Structure](./sps.PNG?raw=true "Project Structure")

## Environment Variables

The following environment variables need to be configured in the .env file:

- DB_HOST: Database host.
- DB_USER: Database user.
- DB_PASSWORD: Database password.
- DB_NAME: Database name.
- JWT_SECRET: Secret key for JWT.
- PORT: Port number for the server.
