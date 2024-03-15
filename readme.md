# Vercel Clone - MERN Stack App

This repository houses a full-stack application inspired by Vercel, built using the MERN stack (MongoDB, Express, React, Node.js). Additionally, it leverages Redis queues for asynchronous tasks and integrates with cloud storage solutions like Google Drive or AWS S3.

## Project Description

This comprehensive project is a full-stack web application inspired by Vercel, tailored specifically for deploying static React applications. Utilizing the MERN stack (MongoDB, Express.js, React.js, Node.js) as its core framework, it incorporates additional technologies such as Redis queue and Google Drive integration to enhance its functionality and user experience.

## Technologies Used

* **MERN Stack:**
    * MongoDB (document-oriented NoSQL database)
    * Express.js (web framework for Node.js)
    * React (front-end JavaScript library)
    * Node.js (JavaScript runtime environment)
* **Redis Queues:**
    * Using Redis queues for background processing or handling asynchronous tasks.
* **Cloud Storage:**
    * Using Google Drive (or AWS S3) for file storage and retrieval of project files orignial as well as built files.

## Microservices Architecture

This application leverages a microservices architecture for improved scalability and maintainability. The three core services are:

1. **Clone and Upload Service:**

   * Fetches code from a GitHub repository upon receiving a request.
   * Clones the repository locally on the server.
   * Uploads the cloned code to a cloud storage solution (e.g., Google Drive or AWS S3).
   * Generates a unique identifier (ID) for the project.
   * Stores the project ID and relevant details (such as repository URL or project name) in a MongoDB database.
   * Publishes the project ID to a Redis queue to signal deployment and request services.

2. **Deployment Service:**

   * Subscribes to the Redis queue for incoming project IDs.
   * Builds and deploys the project code based on the ID and retrieved information.

3. **Request Service (Optional):**

   * Handles incoming requests for deployed projects.
   * Uses the project ID to route requests to the appropriate deployed project instance.

**Benefits of Microservices:**

* **Improved Scalability:** Each service can be scaled independently based on its resource requirements.
* **Increased Maintainability:** Smaller, focused services are easier to understand, modify, and test.
* **Fault Isolation:** An issue in one service doesn't necessarily impact the others.

## Demo

<img src="" alt="Landing Page" width="720"/>

*Landing Page*

<img src="" alt="Register Popup" width="720"/>

*Uploading project*

<img src="" alt="Signup Popup" width="720"/>

*Deploying project*

<img src="" alt="View Pin" width="720"/>

*Deployed project*

## Architecture

<img src="" alt="architecture" width="720" />