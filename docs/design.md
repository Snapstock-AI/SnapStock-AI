DESIGN AND
 
AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers
Prepared by

Name
Index No.
ABEYWARDANA S.M.
230011P
ANDRAHENNADI N.J.
230042K
ATHTHANAYAKE A.M.R.N
230062V



Mentor -Mr. Kavinda Rajapaksha 
PID: 5
Date: July 3, 2026
 
 
 


 
230062V-1,6,7,10    
1. 	Introduction           
1.1 Purpose 
This Software Architecture Document (SAD) illustrates the architecture of SnapStock-AI in its entirety through the use of different views. The document includes all the key architectural choices that have been made regarding microservices for AI inference pipeline, multi-tenancy data segregation using business_id, JWT token authentication with role based access control (OWNER/EMPLOYEE/ADMIN) and local development environment using Docker Compose for PostgreSQL and pgAdmin.
The SAD lies between the Software Requirements Specification (SRS) and the artifacts used to detail design and implementation. The purpose of the SAD includes guiding developers on how to implement modules, APIs, and persistence boundaries; educating testers on integration points, failure points, and performance-critical routes; aiding supervisors/evaluators in design walk-through (Progress Review 1, August 2026); and providing DevOps-related node, port, and container mapping for both local and production deployment.

Audience
Potential Uses for This SAD
Client/Server/AI Developers
Module interfaces, classes responsibilities, prohibited inter-module dependencies
Testers/QA
Use cases implementation, sequence path, post-condition on errors
Mentor/Evaluators
System architecture reasoning, decisions rationale, quality scenarios
DevOps/Demo operators
Deployment diagram, ports, volumes, health endpoint
Future maintainers
Layering rules, data model, tenants isolation strategy

                                                                                                                  	

                                                                                                             	
1.2 	Scope               
This document addresses the complete SnapStock-AI system, an academic prototype SaaS platform for small-scale retailers managing perishable produce. It comprises the following deployable units:      
Deployable Units
Unit
Path
Technology
Web/mobile client
client/
React 19, TypeScript, Vite, Tailwind CSS, React Router
REST API backend
server/
Node.js, Express, TypeORM, PostgreSQL, JWT, Zod, Helmet
AI microservice
ai-service/
Python 3, FastAPI, YOLOv8, MobileNetV3/CNN
Relational database
Docker service postgres
PostgreSQL 16
DB admin UI
Docker service pgadmin
pgAdmin 4


Architecture includes the architecture of registration, authentication, and password reset; camera and gallery taking with AI detection and freshness classification; inventory, notifications, analytics, employee invitation, and vendor management; local Docker Compose installation and a target production architecture; and persistent data schema, indexing, tenant isolation, and storage for images.

Architecture does not include physical IoT sensors, smart scales, or edge GPU devices; procurement, supply chain ERP integration, or accounting and tax tools; food safety and legal inspection tools; or high availability, auto-scaling Kubernetes, or paid ML APIs.

This SAD applies to the architecture until the last prototype is delivered (03 October 2026). In those cases where implementation lags behind the architecture in early sprints, this document describes the intended architecture.





1.3 	Definitions, Acronyms, and Abbreviations                                                                  	
Term
Definition
4+1 View Model
Kruchten's method comprising Logical, Process, Development, Physical, and Scenarios views
ADR
Architecture Decision Record, capturing a decision, its alternatives, and rationale
AI Service
The FastAPI microservice hosting YOLOv8 detection and MobileNetV3/CNN freshness models
Business
A tenant organization, isolated primarily by business_id
C4 Model
Context, Containers, Components, Code — hierarchical architecture notation
Detection
An AI-identified product instance from a scan, stored in detections
DFD
Data Flow Diagram, a process-oriented view of data movement
JWT
JSON Web Token (RFC 7519), used for stateless authentication
mAP
Mean Average Precision, the target detection quality metric (≥ 0.70 at IoU 0.5)
Multi-tenancy
SaaS pattern where tenants share an application instance with logical data isolation
OWNER / EMPLOYEE
Business-scoped roles; OWNER manages the business, EMPLOYEE has operational access only
ORM
Object-Relational Mapping; TypeORM maps TypeScript entities to PostgreSQL tables
RBAC
Role-Based Access Control, by system role (ADMIN) and business role (OWNER/EMPLOYEE)
SYSTEM_ADMIN
Platform administrator with cross-tenant management capabilities
Tenant
Synonym for an isolated business account identified by business_id


1.4 	References                                                                                                                    	
1.5 	Overview                                                                                                                      	The rest of the document is structured in the following way: section 2 explains architecture description and gives a general overview of the system; section 3 explains architectural goals, constraints, and decisions; section 4 introduces the Use-Case View; section 5 introduces the Logical View; section 6 introduces the Process View; section 7 introduces the Deployment View; section 8 introduces the Implementation View; section 9 introduces the Data View; section 10 talks about size and performance; and section 11 introduces quality attribute scenarios and architectural mechanisms.
2. 	Architectural Representation                                                                                                   	
3. 	Architectural Goals and Constraints                                                                                        	
4. 	Use-Case View                                                                                                                        	
4.1 	Use-Case Realizations                                                                                                  	
5. 	Logical View                                                                                                                           	
5.1 	Overview                                                                                                                      	
5.2 	Architecturally Significant Design Packages                                                               	
6. 	Process View      
6.1 Process / Thread Decomposition

Process
Weight
Runtime
Communication
Browser UI thread + Vite HMR (dev)
Lightweight
Chromium/WebKit
HTTPS to server
Node.js Express event loop
Lightweight
single-threaded + libuv
HTTP client/AI; TCP Postgres
Uvicorn / FastAPI worker(s)
Lightweight (scale-out)
Python ASGI
HTTP from server; disk model I/O
PostgreSQL server processes
Heavyweight
multi-process
TCP 5432
pgAdmin (optional)
Lightweight
container
HTTP 5050 → Postgres

      6.2 Activity Diagram — Scan Pipeline
   










6.3 Activity Diagram — Alert Generation

                                                                                                           	

6.4 AI Inference Pipeline Diagram


6.5 Sequence Diagram — Authentication (Login)

6.6 Sequence Diagram — Scan End-to-End



6.7 Sequence Diagram — Alert Check (Post-Scan)

6.8 Sequence Diagram — Admin Suspend Vendor

6.9 Security / Authorization Flow Diagram





7. 	Deployment View             
7.1 Local Development Deployment (Docker Compose + Host Processes)                                                                                                       	
7.2 Production / Demo Cloud Deployment (Target)


7.3 Node Mapping (Process View → Deployment View)

Process (Section 6)
Local node
Production node
React client
Host :5173
`client-static` behind Nginx
Express server
Host :5000
`server` container
FastAPI AI
Host :8000
`ai-service` container
PostgreSQL
`snapstock-postgres` :5432
Managed DB or private container
pgAdmin
`snapstock-pgadmin` :5050
VPN / admin-only (optional)


7.4 Network, Ports, and Volumes

8. 	Implementation View  
                                                                                                            	
8.1 	Overview                                                                                                                      	
8.2 	Layers                                                                                                                           	

9.     	Data View (optional) 


10

Introduction                                                                                                                             	
Purpose                                                                                                                         	
Scope                                                                                                                            	
Definitions, Acronyms, and Abbreviations                                                                  	
References                                                                                                                    	
Overview           
















Architectural Representation 
This section describes what the SnapStock-AI architecture looks like in the Software Architecture Document.The views collectively describe the system from user, software, runtime, deployment, implementation, and data points of view. 
Representation Approach 
SnapStock-AI takes into account a view-based architectural description. The architecture is decomposed into complementary views, since a single diagram is not sufficient to explain all aspects of the platform. The use-case view is used to describe the primary interactions done by vendors and administrators. Explanation of the major packages, modules and classes in the logical view. Process view presents the flow of requests from the client to the back end, the AI service, and the database. The deployment view shows where the nodes will be executed and how they will communicate. The implementation view provides mapping of architecture to the repository, and the data view addresses persistent entities and tenant-level data isolation. The relational data is stored in PostgreSQL and changes in the schema are applied using TypeORM migration files. 

Architectural Views 
View
Primary concern
Main model elements
Diagram used
Use-Case View 
System behavior from the user perspective 
Actors, use cases, associations, include/extend relationships 
Use-case diagrams and realization scenarios 
Logical View
Software structure and responsibilities
Packages, modules, classes, associations and dependencies
Package diagrams and class diagrams
Process View
Runtime behavior and communication
Activities, lifelines, messages, conditions and exception paths
Activity diagrams and sequence diagrams
Deployment View
Execution environment and network connections
Devices, processes, containers, ports and communication paths
Deployment diagrams
Implementation View
Source-code organization
Layers, components, directories and dependencies
Component and package diagrams
Data View
Persistent storage and data isolation
Tables, keys, relationships, constraints and indexes
ER diagram and data dictionary



System Context 
SnapStock-AI is a React-based web application.SnapStock-AI runs as a web app in the browser. The interface is used by vendor users such as business owners and employees to handle accounts, choose shelves, take or upload photos, request product analysis and view inventory information. The same Web area is utilized for platform administration, and for supervisor over vendors.
The Express backend is accessed via REST requests by the React client. The central application boundary is the backend, which is responsible for authentication, email workflows, database operations, and communication with the FastAPI AI service. The business and analysis data is stored in PostgreSQL. There are separate models loaded for the AI service, which do object detection, and freshness prediction. External services include an SMTP service for transactional mailings and Hugging Face to retrieve the models. Image input is provided by the camera or file-picker facilities of the browser.
Container and Communication Structure 
There are three application processes in the development environment and two database-support containers. The React client is running on the Vite development server on port 5173. The Express API is running on port 5000, and is the API that exposes the application-facing endpoints. The FastAPI AI service is accessible on port 8000 and offers health endpoints, combined analysis, freshness prediction and object detection. PostgreSQL runs in Docker on port 5432, and pgAdmin on port 5050 for administration of the PostgreSQL databases.
There is a controlled path for requesting an image for analysis. The client makes a multipart form data request of the selected image to the Express backend. The backend sends the image to the analysis endpoint of the FastAPI, and receives a JSON response with structured data that includes the classes detected, the number of each class, the bounding boxes, the freshness results, and the confidence levels. The backend uses TypeORM to perform database operations.
Architectural Style and Responsibilities 
SnapStock-AI follows a modular, service-oriented design, which keeps the web client and the backend API separate from the AI inference service and the database. This separation allows user-interface issues, business rules, model inference and persistence to be separated.
Presentation Layer 
React, TypeScript, Vite, and Tailwind CSS are used to implement the presentation layer. It has public authentication pages, protected dashboard pages, reusable components, route protection, authentication context, theme context, custom hooks, client-side utilities, and shared type definitions. 
Backend Application Layer 
The backend application is implemented with Node.js, Express.js, TypeScript, TypeORM, and PostgreSQL. It is divided into route, controller, service, entity, middleware, validation and utility responsibilities. The request paths for authentication and detection are the core paths, with the rest of the business functions following a similar modular pattern.
AI Inference Layer 
Python and FastAPI are used to implement the AI service. It has internal packages that isolate combined analysis, object detection, freshness classification, common image utilities, configuration, logging, schemas, model loading and prediction logic. No user authentication is performed in the service, nor are any business data updates made directly from the service; rather, inferences are returned via REST endpoints.
Persistence Layer 
Relational system data is stored in PostgreSQL. Entities and migrations are used to describe the schema and relationships using typeORM. Referential integrity and multi-tenant data separation are supported by UUID identifiers, foreign keys, timestamps, and JSONB values for bounding boxes.
Supporting Infrastructure 
The supporting features are SMTP email delivery, Hugging Face model retrieval, local model caching, Docker Compose, pgAdmin and environment-variable configuration and application logging. These services ensure development and operation without intertwining infrastructure issues into the user interface and AI model logic. 


Architectural Boundaries and Communication Rules 
Frontend responsibility: The React client interacts with the Express backend, and does not directly interact with PostgreSQL or the AI service.
Backend responsibility: Express backend manages authentication and authorization, request validation, email workflows, persistence, tenant scoping and orchestration of AI requests. 
AI-service responsibility: The FastAPI service is responsible for preprocessing the images, performing object detection, cropping, predicting freshness, loading the model, and returning structured inference results. 
Database access: Through the backend, using TypeORM and PostgreSQL to read and write to
the database. Changes to schemas are implemented in migration files.
Communication formats: JSON is used for normal API request & response. For the upload of images, multipart form data is used, for transactional email, SMTP is used, and for the communication with the database, the PostgreSQL wire protocol is used. 
Model independence: Models are independent of detection and freshness models, which are kept inside the AI service, and the model files can be changed without altering the interfaces for React or Express. 
Configuration and security: Connection strings, secrets, model locations, ports, and third-party service credentials are provided via environment variables, not in source code.

Repository Mapping 
This table maps the architectural components to the main repository locations used by SnapStock-AI.

Repository location
Architectural role
Main contents
client/src
Presentation and client application support
pages, components, sections, contexts, hooks, lib, types, assets, App.tsx and main.tsx
server/src/modules/auth
Authentication module
routes, controller, service, repository and types
server/src/modules/detection
Detection gateway
multipart upload route, controller, service, repository, validation and types
server/src/entities
Persistent backend entities
user and authentication-token entities
server/src/shared
Cross-cutting backend support
authentication middleware and email utility
server/migrations
Database schema management
numbered TypeScript migration files
ai-service/app/analysis
Combined AI analysis
analysis routes, schemas and service
ai-service/app/detection
Object detection
routes, schemas, detector, model loader and internal models
ai-service/app/freshness
Freshness classification
routes, schemas, predictor and model loader
ai-service/app/common
Shared AI utilities
image utilities, exceptions and helpers
docker-compose.yml
Development infrastructure
PostgreSQL and pgAdmin services























Architectural Goals and Constraints
The following section highlights the key quality goals, architectural drivers and constraints that influence the architecture of SnapStockAI. It is an AI-powered, multi-tenant system for small businesses to track inventory and freshness. It should be notionally separated, have responsive browser-based workflows, have reliable image analysis capabilities, should have maintainable service boundaries, and should persist inventory-related data consistently. The architecture consists of a React web client, a Node.js and Express application server, a Python FastAPI inference service, and a PostgreSQL database. They communicate via clearly defined REST interfaces, keeping user-interface, business rules, persistence
and machine-learning inference separately maintainable.
Architectural Goals 
The following goals have the greatest influence on the structure and behavior of the system.
Functional Separation and Modularity
The front end, back end API, AI inference service and database shall be distinct architectural components that have clearly defined responsibilities.

The React client should be concerned with user interaction, navigation, validation, image preview and presentation of the results.

The Express backend should be the trusted application boundary for authentication, authorisation, business logic, tenant filtering, database operations and co-ordinating AI requests.

The FastAPI service is responsible for performing image preprocessing, object detection, per-object freshness classification and providing structured prediction results.

The AI service shall not directly control user sessions, business permissions, inventory transactions or PostgreSQL data.

Modular boundaries shall enable the ability to swap out the detection or freshness model without having to redesign the client or business logic.
Security, Privacy, and Tenant Isolation
All API operations that are protected will be protected in the same manner and will require a valid JWT Bearer token. The token must include the identity, role and business context of the user that is authenticated.
Passwords will be stored as bcrypt hashes with a cost value of no less than 10, and secrets like database passwords, SMTP passwords and JWT signing keys will be provided by means of environment variables.
All the records of a business, such as shelves, products, scans, detections, inventory values, adjustments and alerts, will be accessed in the authenticated business scope.
Access control shall differentiate between platform administrators, business owners and employees. Even if the client does not present unavailable actions, the backend is still the authority.
Production communication is to be carried out using HTTPS, limited CORS configuration, secure HTTP headers, valid request bodies, parameterized database access and safe file-upload rules.
Authenticating and operating logs should not contain passwords, reset tokens, verification tokens or information that is not required for personal or business sensitive.
Data integrity and Reliability
All of the following shall be done using database transactions where partial updates would result in an inconsistent state: Registration, scan completion, detection persistence, inventory replacement, manual adjustment, and alert evaluation.
Only scans that are completed successfully should automatically adjust the quantity of items in inventory. A failure or interruption of analysis will leave the inventory with a failed status.
Foreign keys in PostgreSQL, uniqueness constraints, validations and quantity checks shall maintain integrity relationships and business rules.
Records that need to be valid such as users, businesses, shelves, and products will be deleted using soft deletion.
The service architecture should still work if the AI service is temporarily down, enabling authentication, inventory browsing, alerts, and settings to proceed.
In deployed environments, database backups are to be made regularly and restoration is to maintain transaction consistency.
Performance and Scalability
The average time to login and register should be less than 2 seconds with a nominal load.
The image upload time is less than 3 seconds on average with a connection of 5 Mbps or higher using a compressed image less than 2 MB.
The combined processing of detection of objects and freshness inference shall take less than 5 seconds on average and shall time out in a controlled way if the processing takes more than the maximum number of seconds as specified, typically 15.
Less than 2 seconds per average for the expected academic demonstration dataset for Dashboard and list queries.
The design should be able to process a minimum of 10 simultaneous scan requests and 50 simultaneous authenticated read requests without any data corruption or service failure.
The database schema and indexes shall evolve to serve some 100 businesses, 500 users, 50,000 scans and 500,000 detection records without database redesign.
List endpoints will return paginated data, with a default page size of 20 and max enforced.


Usability and Accessibility
The clear capture/preview/ upload/ progress/ result states should be completed within a few minutes by a vendor without technical training to complete a first scan.
The path to the scan-submission page shall be accessible from the dashboard in 3 main interactions, excluding permission prompts of the operating system.
The interface shall be usable on mobile widths of about 360-pixel width, and desktop widths of 1024-pixel or greater.
Forms shall use appropriate input types for email, telephone and password fields and primary touch controls shall be a minimum of 44 CSS pixels wide and tall.
Textual labels Fresh, Medium and Spoiled shall be used in addition to visual colors for freshness results, in every instance. Color should not be used to send a message about status.
Validation and service failures shall be translated into meaningful messages rather than revealing stack traces, database errors or internal file paths.

Maintainability, Testability, and Supportability
The repository shall contain independent client, server, and AI-service directories which could be installed, tested, and operated independently.


Frontend code shall be in TypeScript and be built using reusable portions of code, backend modules shall be split between the routes, controllers, services and repositories, the AI functionality shall be split  between the routing, schemas, analysis, detection, freshness, configuration and common utilities.


Database evolution will be done by version controlled migration files instead of manual schema changes.
The CRF's for both the request and the response shall be stable for REST calls and responses, to minimize coupling between the client, backend, and AI service.


Request identifiers, processing duration, model loading events, prediction failures, dependency errors will be included in Logging, while Secrets will be excluded.
Developer documentation should include Environment variables, getting started locally, Migrations, loading models, API usage, deployment and troubleshooting.

Portability and Deployability
The software should be built on top of commonly available tooling and support standard Windows/Linux development environments with commonly used tools such as Node.js, Python, Docker and PostgreSQL.


All configuration values will be made external to allow code to be shared between local development, testing and hosted deployment.


The setup is currently Docker Compose for Postgresql and pgAdmin, with the React, Express and FastAPI services being separate local processes.


The service boundaries shall enable the ability to place the front end, back end, AI service and data base in separate hosting environments as needed.


AI inference should be possible to be performed on CPU-based infrastructure, and it is possible to use a GPU, its use is to enhance the speed of model training and inference.

AI Quality, Traceability, and Model Replaceability
The object-detection pipeline should output a class label, a bounding box, and a confidence score for all accepted object detections.


The freshness pipeline shall return a freshness class and confidence value for each region detected. In case classification cannot be achieved, an exceptional UNKNOWN state can be used.


Low-confidence detections will be flagged for review and will not silently update inventory if they are not on the acceptance threshold values that are setup.


The system shall maintain version information for the model with the scan results to be able to trace predictions back to the model used.


Manual correction will not remove the AI, and will preserve the original AI for auditing purposes.

Observability and Graceful Degradation 
The health information exposed on the backend and AI service shall be appropriate for manual inspection and deployment health probes.


The AI health response shall display if models have been successfully loaded.


A failure of the database connection shall prevent readiness, and a failure of an AI-service shall cause the scan processing to be in a degraded state but not prevent other authenticated actions unrelated to the scan processing.


AI timeouts or unavailable-model conditions shall return a structured error, and shall indicate that the scan was failed or degraded and shall provide a retrial path.


Operational logs will help identify the time it takes to load the model, time for request, image size, failed authentication and prediction errors.

Key Measurable Quality Targets 

Quality area 
Target
Architectural implication
Availability
99% during defined business hours for demonstration periods.
Health checks, service separation, recoverable failures, and documented maintenance windows.
Authentication
Average response below 2 s; maximum 5 s under nominal load.
Indexed user lookup, bcrypt cost balancing, concise JWT claims, and bounded external email work.
Image upload
Average below 3 s for a compressed image below 2 MB on >5 Mbps upload.
Client-side compression, multipart validation, progress feedback, and upload-size limits.
AI inference
Average below 5 s; controlled maximum of 15 s per image.
Separate inference service, request timeout, model preloading, and graceful error handling.
Concurrency
At least 10 simultaneous scans and 50 concurrent authenticated reads.
Independent service processes, database connection management, transaction boundaries, and pagination.
Scalability
100 businesses, 500 users, 50,000 scans, and 500,000 detections.
UUID keys, indexes, tenant-filtered queries, normalized tables, and paginated endpoints.


Architectural Constraints 
The following constraints restrict the solution space and guide technology selection, component boundaries, deployment, and implementation practices. 
Constraint area
Architectural constraint
Frontend
React, TypeScript, Vite, and Tailwind CSS are used for the browser application.
Backend
Node.js, Express.js, and TypeScript provide the application API and business orchestration.
Persistence
PostgreSQL is the primary relational database, and TypeORM is used where object-relational mapping is required.
AI service
Python and FastAPI expose the inference interfaces.
Computer vision
Ultralytics YOLO performs object detection; TensorFlow/Keras-based CNN or MobileNet models perform freshness classification; OpenCV and Pillow support image processing.
Source control and deployment tooling
Git and GitHub manage source history, while Docker and Docker Compose support repeatable infrastructure and deployment preparation.





Architectural and Communication Constraints 
Constraint area
Architectural constraint
Service separation
The client, backend, AI service, and database remain separate modules with independent dependencies and configuration.
Communication style
Client-to-server and server-to-AI communication use REST over HTTP/HTTPS. JSON is used for structured data, and multipart/form-data is used for image uploads.
Trusted boundary
The client shall not connect directly to PostgreSQL. The AI service shall not update business data directly. The Express backend coordinates protected business operations.
Synchronous inference
The current scan workflow uses request-response orchestration. Long AI calls must therefore be bounded by timeouts and visible progress feedback.
No offline inference
A network connection is required to upload the image and receive AI results.


Database and Data Constraints 
Constraint area
Architectural constraint
Relational model
Persistent business data is stored in PostgreSQL using normalized tables, UUID primary keys, foreign keys, TIMESTAMPTZ timestamps, and JSONB for bounding-box or audit snapshots.
Multi-tenancy
Business-owned records are scoped by business_id, and tenant filtering is enforced by backend authorization logic.
Schema management
Schema modifications are distributed through version-controlled migrations and are not performed manually in normal development.
Transactional consistency
Registration and scan-driven inventory updates must preserve ACID behavior and avoid partial writes.
Auditability
Manual inventory changes and prediction corrections require retained before/after information, the acting user, and timestamps.


Security and Privacy Constraints 
Constraint area
Architectural constraint
Authentication
JWT Bearer authentication protects private endpoints; expired, malformed, or missing tokens are rejected.
Password security
Passwords are never stored in plaintext and use bcrypt hashing.
Input validation
Request bodies, query parameters, path values, and uploaded files are validated before business logic or database access.
Upload safety
User-facing scan uploads accept JPEG,PNG and some other selected images. The client guides compression toward 2 MB, while the raw input limit remains 5 MB before fallback rejection.
Transport
Public or production access uses HTTPS, allowlisted CORS origins, and hardened HTTP headers.
Privacy
User and business data are confidential, and logs must not contain passwords, token values, or unnecessary personal details.

AI and Model Constraints
Constraint area
Architectural constraint
Dataset dependence
Accuracy is limited by the variety, quality, and licensing of the training datasets.
Supported classes
Objects outside the trained fruit and vegetable classes may be classified as unknown or may not be detected.
Image quality
Lighting, blur, camera angle, resolution, occlusion, and object overlap directly affect detection and freshness accuracy.
Model loading
Required model files must be available locally or downloadable through the configured model repository before the AI service becomes ready.
Resource requirements
CPU inference is supported, but model loading and prediction consume substantially more memory and processing time than ordinary API requests.
Human review
AI results assist inventory decisions and do not replace vendor judgment or certified food-safety inspection.


Hardware and Network Constraints 
Constraint area
Architectural constraint
Client device
A modern browser and camera-capable smartphone, tablet, or computer are required for direct capture. A camera of approximately 5 MP or better is recommended.
Connectivity
The client requires network connectivity; approximately 1 Mbps upload bandwidth is the minimum recommendation, while higher bandwidth improves image-transfer time.
Server resources
A quad-core CPU, approximately 8 GB RAM, and at least 20 GB storage are recommended for demonstration deployment.
GPU
A GPU is optional for inference but may be required to achieve faster model training or lower prediction latency.
Storage growth
Scan-image retention and model files can consume significant disk space and must be monitored independently of relational database growth.


Deployment and Operational Constraints 
Constraint area
Architectural constraint
Development topology
PostgreSQL and pgAdmin are started through Docker Compose, while the React client, Express server, and FastAPI service run as separate local processes during development.
Configuration
Ports, database connection details, AI-service URL, SMTP settings, secrets, thresholds, and model identifiers are supplied through configuration files or environment variables.
Independent failure domains
The backend and AI service run separately so that AI CPU usage or failure does not block ordinary API processing.
Startup order
The database must be available and migrations applied before persistence-dependent operations begin. The AI service becomes ready after required models are loaded.
Monitoring
Operational troubleshooting depends on service logs and health endpoints; secrets must not be exposed through health responses.


External Dependencies and Licensing Constraints 
Constraint area
Architectural constraint
Open-source dependency
The system depends on third-party frameworks and libraries; version upgrades require compatibility testing.
Model repository
Hugging Face Hub may be used to distribute and retrieve model files, creating a startup dependency when models are not cached locally.
Email provider
SMTP is required for verification, password reset, and employee-invitation emails. Development mode may log or simulate email delivery.
Licensing
React, Vite, Tailwind CSS, Express, TypeORM, PostgreSQL, FastAPI, TensorFlow, OpenCV, Pillow, Docker, and Ultralytics YOLO must be used according to their respective licenses.
Ultralytics obligation
Use and distribution of the YOLO implementation must be reviewed against the applicable Ultralytics licensing terms, including AGPL-3.0 obligations where relevant.
Dataset licensing
Training and evaluation datasets must be retained and distributed according to their individual licences and citation requirements.



Project and Scope Constraints 
Constraint area
Architectural constraint
Out of scope
Automated ordering, payments, ERP integration, and hardware-sensor integration are excluded from the system boundary.
Legal position
SnapStockAI is an inventory-assistance tool and is not a certified food-safety inspection system. Final decisions remain the responsibility of the retailer.
Localization
English is the initial interface language, while the design should avoid unnecessary hard-coded text so that Sinhala or Tamil localization can be added later.
Legacy systems
No legacy inventory platform is required for the initial solution, reducing integration constraints but placing responsibility for product, shelf, and scan data within SnapStockAI.



Use-Case View
The Use-Case View outlines the interactions which have the highest impact on the architecture of SnapStockAI. The interactions span across the web client, authentication service, database, email service, backend API, and AI inference service. The use case view highlights vendor actions and platform management, whereas the realization sub-section describes the implementation of selected use cases through the internal architecture components.

Primary Actors

Actor
Description
Vendor (OWNER)
Registers the business, manages the products and the team settings, performs the scan, reviews the inventory, gets alerts, and makes allowed modifications.
Vendor (EMPLOYEE)
Carries out the business-related actions such as scanning the shelves, reviewing the inventory and alerts, and making allowed modifications of the inventory.
Administrator
Manages vendor accounts, monitors the platform operation and statistics, and configures the system.
Email Service
Verifies account, sends the password reset, and invites the employees.
AI Service
Detects the objects, counts them, and classifies their freshness in the uploaded images of the produce.

Architecturally Significant Use Cases 
Actor
Use case
Architectural significance
Vendor
Register and verify account
Creates the user, business tenant, OWNER membership, and email-verification state.
Vendor/Admin
Login and session establishment
Exercises credential validation, verification checks, account status, role lookup, and JWT creation.
Vendor
Manage profile and business settings
Updates personal details and permits OWNER-controlled business settings.
Vendor
Scan shelves and analyze inventory
Coordinates client image handling, backend validation, AI inference, persistence, inventory updates, and alerts.
Vendor
Manage inventory and products
Uses tenant-scoped product and inventory data and applies role-based modification rules.
Vendor
View dashboard, analytics, alerts, and reports
Reads aggregated inventory, freshness, scan, and alert information without exposing another tenant's data.
Vendor
Manual inventory adjustment
Records a controlled correction and preserves an adjustment history.
Administrator
Manage vendor accounts
Supports vendor listing, account suspension, activation, and platform-level access control.
Administrator
Monitor system health and statistics
Combines API, database, and AI-service status with aggregate platform metrics.


Vendor Use-Case View 
The vendor use-case model groups the main business-facing capabilities of SnapStockAI. Registration and login establish identity and tenant context. Scanning invokes AI analysis, while inventory, alerts, analytics, reports, and manual adjustments operate on the results that belong to the authenticated business.


Administrator Use-Case View 
The administrator view represents platform-level responsibilities rather than normal tenant inventory operations. Administrative functions include vendor account management, system monitoring, operational configuration, shared catalog oversight, and AI model maintenance. Business-level OWNER and EMPLOYEE roles remain separate from the platform administrator role.

Use-Case Realizations 
Vendor Registration 
Scenario element
Description
Use case name
Vendor Registration
Actor
Unauthenticated prospective vendor who becomes the OWNER of a newly created business.
Description
Creates a vendor account and business tenant, assigns the registering user the OWNER role, and initiates email verification.
Preconditions
The user is not authenticated, can access the sign-up page, and provides an email address that is not already registered.
Main flow
1. The user opens the sign-up page and enters personal, credential, business, and contact information.
2. The client validates required fields, password confirmation, terms acceptance, and basic formats.
3. The client submits the registration request to the authentication API.
4. The authentication service validates the request, normalizes the email address, and hashes the password.
5. The repository checks whether the email is already registered.
6. The backend transaction creates the user, business, and OWNER membership records.
7. A time-limited email-verification token is generated and stored.
8. The email service sends the verification link.
9. The client displays a registration-success message and instructs the user to verify the email address.
Successful end/post condition
The account and business are stored, the user is the business OWNER, the email remains unverified, and no authenticated session is issued until verification is completed.
Fail end/post condition
Duplicate email or validation errors result in an error without creating a second account or business. A database failure rolls back the registration transaction.
Extensions
If email delivery fails, the account remains pending verification and the user may request a new verification email.




Email Verification 

Scenario elements
Description
Use case name
Email Verification
Actor
Registered but unverified user; Email Service.
Description
Confirms ownership of the registered email address and enables access to protected vendor functions.
Preconditions
The user account exists, is not yet verified, and the user has a valid time-limited verification token.
Main flow
1. The user selects the verification link received by email.
2. The verification page sends the token to the authentication API.
3. The authentication service locates the token and checks its validity, expiry time, and use status.
4. The service marks the user email as verified.
5. The verification token is invalidated so that it cannot be reused.
6. A success response is returned and the client displays confirmation with a link to the login page.
Successful end/post condition
The account is marked as verified and the token is no longer usable.
Fail end/post condition
An invalid, expired, or previously used token is rejected and the account remains unverified.
Extensions
An already verified account may receive an idempotent success response. An expired token may be replaced through the resend-verification function.


User Login 
Scenario elements
Description
Use case name
User Login
Actor
Vendor OWNER, Vendor EMPLOYEE, or Administrator.
Description
Authenticates a user, verifies account eligibility, resolves the applicable role and business context, and establishes a JWT-based session.
Preconditions
The user has a registered account and valid credentials. Protected vendor access also requires a verified, active account.
Main flow
1. The user enters an email address and password on the login page.
2. The client submits the credentials to the authentication API.
3. The authentication service retrieves the user by normalized email address.
4. The supplied password is compared with the stored password hash.
5. The service checks email verification, account status, system role, and business membership.
6. The JWT service signs a token containing the required user, role, and business claims.
7. The API returns the token and user profile.
8. The client stores the session state and redirects the user to the appropriate dashboard.
Successful end/post condition
A valid JWT session is established and the user is routed to the vendor dashboard or administrator area according to role.
Fail end/post condition
Invalid credentials produce a generic unauthorized response. Unverified, suspended, or inactive accounts are denied without receiving a token.
Extensions
The user may select Forgot Password to request a time-limited reset link. An unverified user may request another verification email.


Scan and Analyze Inventory 
Scenario elements
Description
Use case name
Scan and Analyze Inventory
Actor
Authenticated Vendor OWNER or EMPLOYEE; AI Service.
Description
Accepts a shelf or produce image, detects supported items, classifies freshness, records the results, and presents an inventory analysis to the vendor.
Preconditions
The user is authenticated, verified, and associated with an active business. A supported image has been captured or selected and network access is available.
Main flow
1. The user captures or selects an image and reviews the preview.
2. The client validates and, when necessary, compresses the image before submission.
3. The client sends the image and scan metadata to the backend endpoint using multipart form data.
4. The backend authenticates the request, validates the file, and establishes the tenant context.
5. The backend forwards the image to the FastAPI analysis endpoint.
6. The YOLO detector returns object labels, bounding boxes, and detection confidence values.
7. Each detected crop is evaluated by the freshness classifier, which returns a freshness label and confidence.
8. The AI service combines the detection, count, and freshness results and returns one structured response to the backend.
9. The backend records the scan and detections, applies inventory-update rules, evaluates alerts, and marks the scan result.
10. The backend returns the analysis summary and the client displays the results to the vendor.
Successful end/post condition
The completed scan and its detections are available to the tenant, accepted results are reflected in inventory, and relevant alerts may be created.
Fail end/post condition
Invalid uploads are rejected before processing. An AI timeout or database failure produces a failed or degraded scan result, and no partial inventory update is committed.
Extensions
No supported object may produce an empty but successful result. Low-confidence or uncertain detections may be flagged for review and manually corrected.




Logical View
Logical View defines the architectural structure of SnapStockAI without binding it to the environment it deploys in. It highlights the main packages, their functionality, and classes responsible for authentication, image processing, persistence, and interaction with the AI service. The view is based on the boundary defined by the project structure that consists of the React client, the Express backend, the FastAPI AI service, PostgreSQL persistence, and infrastructure utilities.
Package diagrams presented in this section are logical aggregates. A logical package may refer to the source directory, feature module, or some files that are strongly related.

Overview
SnapStockAI is divided into six logical parts: Presentation, Client Support, Backend Application, Persistence, AI Inference, and Shared Infrastructure. The Presentation package includes user pages and visual components. Client Support provides application state management, hooks, API communications, and TypeScript declarations. The Backend Application contains REST API endpoints and is responsible for authentication and image analysis request coordination. The Persistence package includes TypeORM entities and database access facilities. The AI Inference Service makes object detection, freshness classification, and combined analysis. Shared Infrastructure contains cross-cutting middleware, configuration, logging, and utility functions. 




Package/ Element
Contents
Architectural responsibility
Presentation
pages, components, sections, assets
Builds the user interface and presents authentication, dashboard, scan, shelf, and related screens.
Client Support
context, hooks, lib, types
Manages client-side state, reusable behavior, API calls, and shared TypeScript contracts.
Backend Application
modules/auth, modules/detection
Accepts REST requests, applies application rules, and coordinates persistence and AI calls.
Persistence Layer
entities, repositories, database configuration, migrations
Stores account and application data in PostgreSQL and maintains schema evolution.
AI Inference Service
analysis, detection, freshness, common
Runs object detection, freshness prediction, and combined image-analysis workflows.
Shared Infrastructure
middleware, utilities, configuration, logging
Provides security, email, configuration, logging, and reusable technical services.


Primary dependency constraints


Presentation components depend on client services that provide means of communicating with backend and do not access PostgreSQL and AI directly.
The Express backend acts as an application perimeter responsible for authentication, validation, data access, and AI service orchestration.
The FastAPI service handles inference and result composition and database persistence remains a responsibility of the backend.
Configuration and logging belong to the technical domain and should not contain any feature specific business logic.


Architecturally Significant Design Packages
This section describes the design packages which have the biggest influence on the maintainability, security, and extensibility of SnapStockAI. In particular, elements included in each package and architectural responsibilities of the packages are provided below.
Frontend Application Packages
The frontend application architecture includes the following packages: bootstrap, page level features, shared components, state management, routing, reusable hooks, client services, assets, and type definitions. Bootstrap package initializes the application and configures routes. Authentication pages provide the capability to register, authenticate, confirm email, and recover password. Dashboard, scanner, and shelf packages are major user flows. Context providers manage the authentication and theme state, while the client services package is responsible for the interaction with the backend API.






Package/ Element
Contents
Architectural responsibility
Application Bootstrap
main.tsx, App.tsx
Initializes React, composes providers, and defines application routes.
Authentication Pages
Login, Signup, VerifyEmail, ResendVerification, ForgotPassword, ResetPassword
Supports account creation, authentication, verification, and password recovery.
Dashboard
DashboardPages, DashboardComponents
Presents the authenticated application shell and summary information.
Scanner
ScannerComponents
Manages image selection, preview, upload, and analysis-result presentation.
Shelf
ShelfComponents
Provides shelf-oriented inventory views and shelf selection for scanning workflows.
Routing and Access Control
ProtectedRoute, Navigation
Protects authenticated routes and provides consistent navigation.
State Management
AuthContext, ThemeContext
Maintains authenticated-user state and interface theme preferences.
Shared UI
AuthLayout, Logo, ThemeToggle
Provides reusable visual elements and common layouts.
Custom Hooks
hooks
Encapsulates reusable client-side behavior and stateful operations.
Client Services
API clients, utilities
Centralizes HTTP communication, request formatting, and common client utilities.
Types and Assets
TypeScript types, images, icons, static files
Provides shared contracts and static resources used across the client.

Backend Application Packages
Backend is designed using the pattern of routing/ controller/ service/repository. Routing includes HTTP endpoints and also middleware definitions. Controller decodes HTTP requests into service calls and creates responses from them. Services include the logic of the application and communicate with repository, emails, validations, and AI-service client. Repository encapsulates the data access logic from the application logic.


Package/ Element
Contents
Architectural responsibility
Routes
auth.routes.ts, detection.routes.ts
Defines endpoint paths, middleware attachment, and controller entry points.
Controllers
auth.controller.ts, detection.controller.ts
Validates request-level assumptions, invokes services, and returns HTTP responses.
Services
auth.service.ts, detection.service.ts
Implements application workflows and coordinates technical dependencies.
Repositories
auth.repository.ts, detection.repository.ts
Encapsulates persistence operations and shields services from database details.
Entities
User, EmailVerificationToken, PasswordResetToken
Represents persistent account and authentication-token data.
Security Middleware
auth.middleware.ts
Validates JWTs and supplies authenticated context to protected routes.
Email Utility
email.ts
Sends verification and password-reset messages through SMTP.
AI Service Client
HTTP client to FastAPI service
Forwards images to the AI analysis endpoint and receives structured predictions.
Validation
request-validation definitions
Ensures accepted payloads and uploaded files satisfy API rules before processing.
Database Configuration
data-source.ts, db.ts
Configures TypeORM and PostgreSQL connectivity.
Migrations
versioned migration files
Creates and evolves database structures in a reproducible manner.


Backend Design Principles

Routes are not supposed to have any business logic but should delegate to controllers and services.
Controllers are independent of SQL code and model inference code.
Services manage transactions and remote procedure calls, and repositories manage all database actions.
The AI service is accessed via an abstraction for an HTTP client and not directly imported in the Node.js process.
Sensitive operations are still secured behind authentication and roles at the API boundary.

AI Inference Service Packages
The AI service architecture consists of a FastAPI bootstrap package and three packages of endpoints – detection, freshness prediction, and analysis. Detection packages are responsible for loading and running the object-detection model. Freshness packages are responsible for loading the classification model and classifying the state of detected crops. Analysis package orchestrates model pipeline execution and returns a single response for the backend.


Package/ Element
Contents
Architectural responsibility
API Bootstrap
main.py
Creates the FastAPI application, initializes models, and registers routers.
Detection Router
detection routes
Exposes the object-detection endpoint and converts HTTP input into detection requests.
Detection
schemas.py, detector.py, model_loader.py, internal_models.py
Loads the object-detection model, detects supported items, and returns labels, boxes, and confidence values.
Freshness Router
freshness routes
Exposes the freshness-prediction endpoint.
Freshness
schemas.py, predictor.py, model_loader.py
Classifies cropped product images and returns freshness labels with confidence values.
Analysis Router
analysis routes
Exposes the combined image-analysis endpoint used by the backend.
Analysis
schemas.py, service.py
Coordinates detection and per-object freshness prediction and aggregates the final response.
Common
image utilities, exceptions
Provides reusable image-processing helpers and shared exception types.
Configuration
config.py
Loads model identifiers, thresholds, paths, and service settings.
Logging
logger.py
Records model-loading, inference, and error events.
Model Cache
local models directory
Stores model artifacts locally to avoid repeated downloads.
External Model Repository
Hugging Face repository
Provides versioned model files to the model loaders.


Architecturally Significant Domain Classes 
Domain class model presents the persistent business entities used by SnapStockAI and relates them to the existing PostgreSQL schema. The class model highlights tenant membership, authentication token, employee invitation, product and shelf inventories, scan processing, AI detection, alert, and inventory adjustment history. The user interface elements, controllers, services, repositories, and framework classes are defined separately in the package diagrams and are purposely left out of this domain class model.
Business is the primary tenant boundary. The users are linked to business entities using the BusinessUser association class, which contains the role information of the users being either OWNER or EMPLOYEE. AuthToken is the combined entity that represents both email verification and password reset records related to authentication. EmployeeInvitation is an entity corresponding to the business_invites table and containing invitation process-related data.
Product and Shelf entities have the many-to-many relationship via the ProductShelf association class, corresponding to the product_shelves table and containing the product count at each individual shelf. Scan entity is submitted by the user for a single shelf and can have zero or multiple Detection objects associated with it. Alert is related to a specific business and can reference a product.


Architecturally Significant Classes

Class
Database table
Important attributes
Architectural responsibility
Operations
Business
businesses
id, businessName, isActive, createdAt, updatedAt, deletedAt
Defines a retailer tenant and owns business-scoped data.
activate(), deactivate()
User
users
id, email, passwordHash, fullName, systemRole, emailVerified, createdAt, updatedAt, deletedAt
Represents an authenticated platform user.
canLogin(), markEmailVerified(), changePassword()
BusinessUser
business_users
businessId, userId, role, createdAt
Association class connecting a user to a business and storing the business role.
assignRole(), removeMembership()
AuthToken
auth_tokens
id, userId, tokenHash, type, expiresAt, usedAt, createdAt
Stores email-verification and password-reset tokens in one unified entity.
isExpired(), markUsed()
EmployeeInvitation
business_invites
id, businessId, email, invitedBy, role, tokenHash, status, expiresAt, acceptedUserId, createdAt, acceptedAt
Represents a time-limited invitation to join a business.
isExpired(), accept(), cancel()
Product
products
id, businessId, name, category, unit, lowStockThreshold, lastScanAt, isActive, createdAt, updatedAt, deletedAt
Represents a product in the tenant-specific catalogue.
updateDetails(), activate(), deactivate()
Shelf
shelves
id, businessId, name, category, createdAt, updatedAt, deletedAt
Represents a physical or logical shelf owned by a business.
updateDetails(), archive()
ProductShelf
product_shelves
productId, shelfId, quantity, updatedAt
Association class storing a product quantity at a particular shelf.
replaceQuantity(), adjustQuantity(), isLowStock()
Scan
scans
id, businessId, shelfId, userId, status, errorMessage, createdAt, completedAt
Represents one shelf-image analysis request and its processing state.
markProcessing(), markCompleted(), markFailed()
Detection
detections
id, scanId, productLabel, productId, confidence, bboxJson, freshness, freshnessConfidence, needsReview, correctedFreshness, correctedBy, correctedAt, createdAt
Stores one AI-detected object and its freshness result and correction metadata.
requiresReview(), correctFreshness()
Alert
alerts
id, businessId, productId, type, severity, message, isRead, isActive, createdAt, resolvedAt
Represents low-stock or spoilage notifications.
markRead(), resolve(), reactivate()
InventoryAdjustment
inventory_adjustments
id, businessId, productId, shelfId, userId, oldQuantity, newQuantity, note, createdAt
Provides an audit record of a quantity change for a product at a shelf.
getQuantityChange()


8.  Implementation View
The implementation view describes how SnapStock-AI’s system is organized into layers, subsystems and components. The backend follows a feature-based, layered architecture where each business feature is implemented as a module subsystem while cross-cutting concerns are separated into a domain layer and an infrastructure layer. A separate python service provides AI capability to the backend over HTTP.
8.1. Overview
The implementation model of SnapStock-AI  is organized into client, backend, AI-service, database and SMTP service components where all the components are connected through well-defined network interfaces. Dependencies flow only from top to bottom. The web application and mobile PWA never call AI-Service, Database or SMTP Email Service directly. Every such request is mediated through the backend REST API. This keeps tenant-scoping, authentication and validation enforced in a single place rather than duplicated across two client codebases.


The component diagram shows six components and the labeled dependencies between them:
Component
Description
Web Application (React/Vite) and Mobile PWA
Each exposes pages, UI components and API client layer. The API client layer is used to connect to the backend over HTTPS/REST/JSON.
Backend REST API (Node.js, Express)
Backend component consists of routes, controllers, services, repositories and middleware parts.
AI-Service (FastAPI/Python)
AI-Service is responsible for object detection and freshness prediction. It consists of analyse,YOLOv8 detection, MobileNet freshness prediction parts.
Database (PostgreSQL)
Accessed over SQL (TypeORM), using shared schema with tenant isolation.
SMTP Email Service
Connected over SMTP for transactional email such as email verification and password reset.

 
8.2. Layers
The system is organized into four layers, each with a distinct responsibility while the External systems are the dependencies of the infrastructure layer. Dependencies between layers are shown as <<use>> relationships in Figure Y, and flow strictly downward - no layer depends on the layer above it .


Layer
Description
Subsystems
Presentation Layer
Client application that renders UI and captures user inputs. Not part of the server codebase. Communicate with the backend over HTTPS/REST.
Web Application (React/Vite), Mobile PWA
Modules Layer
Application’s business logic, organized as one package per feature. Each module is a self-contained vertical slice covering one feature area of the system, rather than a horizontal technical layer shared across all features. Each module has its own controller, service, repository and route. All modules depend on the domain and infrastructure layers. The detection module has a external dependency with AI-Service.
auth, detection, business, user, inventory, shelf, alert, analytics
Domain Layer
A single shared package containing the TypeORM entity definitions that represents the system’s core business data. Entities do not depend back on any module, keeping the domain model reusable across features
entities
Infrastructure Layer
Config holds database connection and TypeORM data-source setup. Shared holds cross-cutting middleware and utilities such as authentication middleware and the email-sending utility.
config, shared
External Systems
PostgreSQL is the system’s persistent data store. All business data (users, business, products, scans, detections, inventory, alerts etc.) is stored in the database.
SMTP Email Service is a third-party mail server used to send transactional emails: email verification links, password reset links, and employee invitations.
PostgreSQL Database, SMTP Email server

 
9. Data View
SnapStock-AI uses PostgreSQL as its primary relational database, accessed through TypeORM. The database schema follows a third normal form to avoid redundancy. To support multiple businesses on the same platform, the system uses a shared-database, shared-schema approach to multi-tenancy. Every tenant-owned table carries a business_id foreign key. The entity relationship diagram below represents the system's target data model



10. Size and Performance

10.1 Dimensioning Characteristics

Characteristic
Prototype estimate
Notes
Concurrent interactive users
10–20
Academic demo scale
Concurrent scan requests
≥ 10
SRS throughput floor
Scans per vendor per day
5–20
Produce shops
Compressed image size
200 KB – 2 MB
Client compression
Max upload size
10 MB
Hard reject above
DB rows (prototype horizon)
< 100,000
All tenants combined
YOLO + MobileNet weights
~50–100 MB
Loaded at AI startup
REST endpoints (planned)
~25–40
Across modules
JWT TTL
24 h default
Configurable



10.2 Performance Targets (from SRS, architecturalized)
	

Metric
Average target
Maximum / p95
Architectural tactic
Login / register
< 2 s
5 s
Indexed email; bcrypt cost 10
Image upload (< 2 MB)
< 3 s
8 s
Client compression; multipart
AI inference E2E
< 5 s
15 s
MobileNetV3; model preload; CPU batch=1
Dashboard load
< 2 s
5 s
Indexed tenant queries; limit/offset
Non-AI API p95
< 200 ms
—
Connection pool; lean controllers
DB query p95
< 100 ms
—
Composite indexes (Section 9.3)
AI cold start
—
< 30 s
Lifespan model load
Client first load
< 3 s on 4G
—
Vite code split; asset minify


10.3 Capacity Thoughts and Degradation

10.4 Optimization Strategies

1. **Client-side compression of images** before uploading multiple parts.  
2. **Pre-loading of models** in FastAPI lifespan hooks (cold start for each request).  
3. **Indexes in PostgreSQL** for tenant id and foreign keys.  
4. **Connection Pooling by TypeORM/driver**.  
5. **Scaling horizontally AI workers** through an internal load balancer in case of increased concurrency.  
6. **Pagination** for inventories, scans, alerts and vendor lists in administration.  
7. **Optional result caching** for aggregates in analytics (short TTL) — future improvement.

10.5 Size of Implementation (Order-of-Magnitude)


Area
Approx. size (prototype)
Client TS/TSX
medium SPA (tens of components)
Server TS
modular; auth complete early, other modules incremental
AI Python
small service surface; larger training scripts offline
Migrations
ordered SQL/TS migrations 000+
Documentation
SRS + SAD + feasibility + PMP



11. Quality
11.1. Extensibility and Maintainability 
New features can be added to the module layer as self-contained modules without changing existing modules, the domain layer, or infrastructure. Each module is structured in a same way including routes, middleware, controllers, service and repository to ensure maintainability.
11.2. Portability 
All environment-specific implementation details, including the database connection and SMTP configuration, are encapsulated within the infrastructure layer's config and shared subsystems. Consequently, replacing the underlying database management system or email service provider requires modification only within this layer, without affecting the modules or domain layers.
11.3. Scalability and reliability 
The AI-Service is implemented as an independently deployable subsystem which can be accessed by backend through HTTP interface. This architectural separation enables the AI service to be scaled, restarted, or redeployed independently without affecting the backend.
11.4. Privacy and security 
Authentication is enforced centrally before any request reaches business logic. Account verification uses single-use, expiring tokens instead of reusable credentials. Access is role-based - users are split into admin and regular accounts, with regular users further divided into owners and employees and personal and business data is kept isolated in the domain layer. 






12. References

[1] ISO/IEC/IEEE, “ISO/IEC/IEEE 29148:2018—Systems and software engineering—Life cycle processes—Requirements engineering,” IEEE Standards Association, 2018. [Online]. Available: https://standards.ieee.org/standard/29148-2018.html. [Accessed: Jul. 13, 2026]. 
[2] Snapstock-AI, “SnapStock-AI: AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers,” GitHub. [Online]. Available: https://github.com/SnapstockAI/SnapStock-AI.
 
[3] React Team, “React Documentation,” React. [Online]. Available: https://react.dev/ [Accessed: Jul. 15, 2026].

[4] OpenJS Foundation, “Node.js API Documentation,” Node.js. [Online]. Available: https://nodejs.org/docs/latest/api/. [Accessed: Jul. 15, 2026]. 

[5] OpenJS Foundation, “Express.js Documentation,” Express.js. [Online]. Available: https://expressjs.com/. [Accessed: Jul. 15, 2026]. 

[6] S. Ramírez, “FastAPI Documentation,” FastAPI. [Online]. Available: https://fastapi.tiangolo.com/. [Accessed: Jul. 15, 2026].

 [7] PostgreSQL Global Development Group, “PostgreSQL Documentation,” PostgreSQL. [Online]. Available: https://www.postgresql.org/docs/current/. [Accessed: Jul. 18, 2026]. 

[8] TypeORM, “TypeORM Documentation: Getting Started,” TypeORM. [Online]. Available: https://typeorm.io/docs/getting-started/. [Accessed: Jul. 18, 2026]. 

[9] Docker, Inc., “Docker Compose Documentation,” Docker Documentation. [Online]. Available: https://docs.docker.com/compose/. [Accessed: Jul. 20, 2026]. 

[10] Ultralytics, “Ultralytics YOLO Documentation,” Ultralytics. [Online]. Available: https://docs.ultralytics.com/. [Accessed: Jul. 10, 2026]. 

[11] Senu-12, “SnapStock-AI Fruit and Vegetable Detector,” Hugging Face. [Online]. Available: https://huggingface.co/Senu-12/snapstock-fruit-vegetable-detector. 

[12] Google, “TensorFlow Guide,” TensorFlow. [Online]. Available: https://www.tensorflow.org/guide. [Accessed: Jun. 29, 2026]. 

[13] A. Howard et al., “Searching for MobileNetV3,” arXiv preprint arXiv:1905.02244, 2019. [Online]. Available: https://arxiv.org/abs/1905.02244. [Accessed: Jul. 10, 2026]. 

[14] OpenCV, “OpenCV Documentation,” OpenCV. [Online]. Available: https://docs.opencv.org/4.x/. [Accessed: Jun. 30, 2026]. 

[15] M. Oltean, “Fruits-360 Dataset,” Mendeley Data, ver. 7, 2025. [Online]. Available: https://data.mendeley.com/datasets/rp73yg93n8/7. [Accessed: Jul. 22, 2026]. 

[16] S. R. Kalluri, “Fruits Fresh and Rotten for Classification,” Kaggle. [Online]. Available: https://www.kaggle.com/datasets/sriramr/fruits-fresh-and-rotten-for-classification. [Accessed: Jun. 30, 2026]. 

[17] M. Jones, J. Bradley, and N. Sakimura, “JSON Web Token (JWT),” RFC 7519, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfceditor.org/rfc/rfc7519.html. [Accessed: Jul. 22, 2026]. 

[18] OWASP Foundation, “OWASP Top 10:2025—The Ten Most Critical Web Application Security Risks,” OWASP. [Online]. Available: https://owasp.org/Top10/2025/. [Accessed: Jul. 24, 2026].

[19] World Wide Web Consortium, “Web Content Accessibility Guidelines (WCAG) 2.2,” W3C Recommendation, Dec. 12, 2024. [Online]. Available: https://www.w3.org/TR/WCAG22/. [Accessed: Aug. 3, 2026]. 

[20] Ministry of Health, Sri Lanka, “Food Act, No. 26 of 1980 and Subsequent Amendments,” Directorate of Environmental Health, Occupational Health and Food Safety. [Online]. Available: https://eohfs.health.gov.lk/food/index.php?Itemid=158&id=17&lang=en&option=com_content& view=article. [Accessed: Jul. 8, 2026].

[21] GeeksforGeeks, "Package Diagram – Unified Modeling Language (UML)," GeeksforGeeks. [Online]. Available: https://www.geeksforgeeks.org/system-design/package-diagram-introduction-elements-use-cases-and-benefits/. [Accessed: Aug. 2, 2026]. 

[22] GeeksforGeeks, "Component Based Diagram – Unified Modeling Language (UML)," GeeksforGeeks. [Online]. Available: https://www.geeksforgeeks.org/software-engineering/component-based-diagram/. [Accessed: Aug. 4, 2026]. 

[23] JGraph Ltd, "draw.io (diagrams.net)," Version 31.1.8. [Online]. Available: https://www.drawio.com/. [Accessed: Aug. 7, 2026]. 

[24] Lucid Software Inc., "Lucidchart," [Online]. Available: https://www.lucidchart.com/. [Accessed: Aug. 7, 2026]. 

