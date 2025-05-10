# User CRUD API with In-Memory Database
A simple REST API for user management built with TypeScript and Node.js that uses an in-memory database.

## Features
* Complete CRUD operations for user management
* In-memory database implementation using TypeScript Map
* RESTful API design
* Error handling
* TypeScript for type safety

## Prerequisites
* Node.js (>=22.14.0)
* npm or yarn

## Installation
1. Clone the repository:

```bash
git clone https://github.com/qutluq/simple-crud-api.git
cd simple-crud-api
```

2. Install dependencies:

```bash
npm install
```

## Running the Application
### Development Mode
To run the application in development mode with hot reloading:

```bash
npm run start:dev
```

The server will start on port 3000 (or the port specified in your .env file).

### Production Mode
To build and run the application in production mode:

```bash
npm run build
npm runt start:prod
```

## Environment Variables
Create a `.env` file in the root directory with the following variables:

```
PORT=3000
NODE_ENV=development
```