# Fullstack Construct Documentation

## Overview

The Fullstack Construct is a high-level AWS CDK construct that enables deploying full-stack applications to AWS infrastructure. It provides an integrated solution for deploying various types of applications with their associated infrastructure.

## Supported Application Types

### 1. Static Applications
- **Static Website** (`AppType.STATIC_WEBSITE`)
    - Simple static websites with HTML, CSS, and JavaScript
    - Deployed to S3 and served via CloudFront

### 2. Next.js Applications
- **Next.js Pages Export** (`AppType.NEXT_PAGE_EXPORT`)
    - Static export mode of Next.js applications
    - Optimized for static site generation
- **Next.js App Router** (`AppType.NEXT_APP_ROUTER`)
    - Support for the newer App Router architecture
    - Includes handling for server components

### 3. Node.js Applications
- **Node App** (`AppType.NODE_APP`)
    - General purpose Node.js applications
    - Deployable as containers or Lambda functions
- **Node API** (`AppType.NODE_API`)
    - Specialized for NestJS API applications
    - Includes API Gateway integration

### 4. Container Applications
- **Image App** (`AppType.IMAGE_APP`)
    - Docker container-based applications
    - Deployable to ECS with Fargate

## Deployment Options

### 1. Lambda Deployment
- Suitable for serverless applications
- Configurable memory and timeout settings
- Environment variable support
- Example configuration:

```typescript
{ 
  type: AppType.NODE_API,
  buildParams: {
    memorySize: 512,
      timeout: 30,
      environment: {
      NODE_ENV: 'production'
    }
  }
}
```


### 2. ECS Deployment
- Container-based deployment with Fargate
- Supports both service and task patterns
- Load balancer integration
- Example configuration:

```typescript
{ 
  server: { 
    apps: {
      api: { 
        type: AppType.NODE_API,
        // ECS-specific configuration 
      }
    }, 
    loadBalancer: { 
// Load balancer configuration
    } }, tasks: { // Background task configurations } }
```