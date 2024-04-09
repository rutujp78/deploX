# deploX - MERN Stack App

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
    * Using Google Drive (or AWS S3) for secure file storage and retrieval of project built files.
* **Kafka and Clickhouse:**
    * Using Kafka and Clickhouse to handle log service.

## Microservices Architecture

This application leverages a microservices architecture for improved scalability and maintainability. The three core services are:

1. **Clone and Upload Service:**

   * Generates a unique identifier (ID) for the project.
   * Stores the project ID and relevant details (such as repository URL or project name) in a MongoDB database.
   * Publishes the project ID to a Redis queue to signal deployment service.

2. **Deployment Service:**

   * Subscribes to the Redis queue for incoming project IDs.
   * Clones the repository locally on the server.
   * Builds and deploys(upload the built project files to Google Drive/AWS S3) the project code based on the ID and retrieved information.
   * Publishes the project ID to a Redis queue to signal request service.

3. **Request Service:**

   * Handles incoming requests for deployed projects.
   * Uses the project ID to route requests to the appropriate deployed project instance.

**Benefits of Microservices:**

* **Improved Scalability:** Each service can be scaled independently based on its resource requirements.
* **Increased Maintainability:** Smaller, focused services are easier to understand, modify, and test.
* **Fault Isolation:** An issue in one service doesn't necessarily impact the others.

## Demo
[Watch The Demo Video](https://drive.google.com/file/d/12UrqVPUaw_grA4nTe2v4R-Xlt9aeHHXg/view?usp=sharing)

## Architecture
<img src="https://github.com/rutujp78/vercel_clone/assets/76244494/bf2e74b0-089c-4d6d-9732-0fc1e68d0d93" alt="architecture" width="540" />

## Logs Architecture
<img src="https://github.com/rutujp78/vercel_clone/assets/76244494/5b309f65-acb2-4119-8e16-e06c613baf7f" alt="logs_architecture" width="540" />

## MongoDB Collection Schema
<img src="https://github.com/rutujp78/vercel_clone/assets/76244494/d702d18d-2f03-4dcc-9be5-79f6815e6dad" width="240" />
