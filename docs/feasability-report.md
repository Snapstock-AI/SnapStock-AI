Introduction
Overview of the Project
SnapStockAI is a complete software as a service project designed to assist small retailers in managing the stock of their perishable goods like fruits and vegetables. Since most businesses use manual counting and estimates, that is not only inefficient but also the process is very slow and unreliable due to human errors. This will use the benefits of AI to automate the process of counting and classification of the stock in order to make a decision about the inventory more efficiently. 
This system consists of React frontend, Node.js backend, AI microservice written in python and PostgreSQL database. Based on the images that are taken by users by their mobile camera or web camera, the algorithm will perform object detection in order to count and classify the objects in three categories: fresh, medium and spoiled. All the information obtained will be stored in the dashboard of the system. 
When we consider the input and output of the system:
Input: images of the product, user credentials and data about the business
Output: identify the products and estimate the quantity, classify the freshness, real time inventory dashboard and alert system for low stock and deteriorating products.
 
 
Objectives of the Project
The objectives of this project are to:
Design and implement a centralized web-based system for real-time inventory and freshness monitoring accessible from desktop and mobile browsers.
Develop a full-stack SaaS platform capable of securely handling multi-tenant business data with role-based access for vendors and system administrators.
Integrate a deep learning pipeline for object detection (e.g., YOLO-based) and freshness classification (e.g., CNN-based) of fruits and vegetables.
Automate inventory tracking using image analysis instead of manual data entry to reduce human errors and save manual labor.
Provide actionable insights to vendors through dashboards, alerts and reports to reduce food waste and improve stock management.
 
 
The Need for the Project
Small stores, in contrast to large supermarkets, cannot afford to purchase such systems as business resource planning software or specialized IoT sensors. Nevertheless, small retailers also have problems, such as the need for lower amounts of inventory because of incorrect inventory counting manually, ordering too much, perishables spoiling quickly and data about product spoilage under various circumstances not being available.
 
Thus, the use of smartphone cameras can solve these problems effectively since it utilizes devices that are already owned by retailers and does not require any special skills, providing correct predictions about the quality of products. This solution helps to avoid food loss, prevent financial losses from spoilage and inventory problems and allows small retailers to have completely data-driven insights usually possessed by large retail companies.
 
 
Scope of the Project
The suggested solution will include two categories of users, namely, the vendors and the administrators. Vendors will be able to make use of the mobile app equipped with the camera to take photos of their inventory, monitor its quantity and freshness and get alerts about low levels of inventory and spoiling of fruits. Admin is able to make use of the proposed solution to manage product/vendor information, identify any abnormality in transaction/sales pattern and also multi-tenant account management through the admin portal.
Scope of work of the project will include: mobile app capable of taking photos and monitoring stock levels, web application for managing product/vendor information and sales analysis, RESTful API along with security and authentication services, cloud storage of the photos, deep learning including object detection based on YOLOv8 and fruit freshness detection based on MobileNetV3 that will be trained on the Fruit-360 and Kaggle datasets with fresh/rotten fruits.
 
 
Deliverables
A functioning prototype with mobile app and web app.
A RESTful backend API providing data storage and communication of the mobile, web and AI services in a secure multi-tenant environment.
A trained model of software as a microservice for product recognition and new classification.
Technical documentation with performance metrics of the AI model.
Most realistic scale scenarios such as prepared fruit plan with actual demonstration of the combined system.
 
 
Overview of Existing Systems and Technology
Existing Similar Systems
 
System
Limitations
Ref.
SAP Retail 
High licensing cost, complex setup and no built-in freshness AI for perishables. 
[5] 
Square for Retail 
No AI-based visual inspection; manual product entry required. 
[6] 
Afresh 
Enterprise-focused; not designed for small-scale vendors. 
[7] 
Research (Detection) 
Focused on algorithms; not integrated as an inventory SaaS ecosystem. 
[1] 

Planned Techniques, Tools and Approaches
 
Category
Technologies / Tools
Ref.
Frontend 
React 19, TypeScript, Vite, Tailwind CSS, React Router 
- 
Backend 
Node.js, Express.js, PostgreSQL, JWT, bcrypt, Zod, Helmet 
- 
AI / ML 
Python 3, FastAPI, PyTorch, TensorFlow, Ultralytics YOLO, ResNet, Pillow, OpenCV 
[1], [3], [4] 
DevOps 
Docker & Compose, Git & GitHub, pgAdmin 
- 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Feasibility Study
Financial Feasibility
 
SnapStockAI is financially feasible for a student project and for small retailers as the end users because the development cost is low and the target market does not require expensive enterprise software.
Development Cost Analysis
Most of the tools used in this project are free or open source. Thus, the cost of licenses while developing is almost zero.


Cost Category
Item
Estimate (LKR)
Remarks
Software licenses 
React, Node.js, Express, FastAPI, PostgreSQL, YOLO, TensorFlow, Docker, git 
0 
Open source  
Free for development 
Development tools 
VS Code, Postman, pgAdmin, GitHub 
0 
Free tiers available 
Hardware 
Existing laptops / Smartphones 
0 
Owned by team members 
Datasets 
Fruit-360, Kaggle fresh/rotten fruit datasets 
0 
Public datasets 
Cloud hosting (Optional demo) 
Free tier cloud / local Docker deployment 
0 – 5000 
Free tiers sufficient for prototype 
Domain / SSL (Optional) 
Free subdomain or temporary demo URL 
0 – 3000  
Not mandatory for academic demo 
Contingency 
Unexpected tools, storage, API usage 
2000 – 5000  
Buffer for minor expenses 
Total Estimated Development cost 
 
0 – 13000 
Very low compared to commercial systems 

 
There is no need for any large investments as laptops, cameras and internet connectivity are already available with team members. 
 
 
 
Operational Cost for End Users
 
For small retail stores, SnapStockAI is made affordable.


Expense for vendor
Cost Approximation
Remarks
Smartphone / webcam 
Already owned 
No need of new equipment 
Internet connection 
Existing mobile/ Wi-Fi connection 
Required only while scanning 
Saas subscription 
Affordable monthly charges 
Much cheaper than ERP  
Training cost 
Minimal 
Simple camera-based UI 

 
When compared to SAP retail, specialized IoT sensors or enterprise inventory solution, SnapStockAI does not incur any licensing fee and hardware cost. This makes it ideal for small produce stores.
Cost–Benefit Analysis
Expected benefits for vendors:
Reduction in manual stock counting efforts.
Lower risk of spoilage through undetected spoilage.
Improved stock ordering by using freshness and stock data.
Reduced food wastage and increased customer trust.
Even a small reduction in monthly spoilage (eg: saving a few kilograms of fruits/vegetables) can recover the cost of the system. Hence, the financial benefit for the vendors is positive considering the low cost of operation.   
The project is financially feasible since, 
Free / open-source technology used for development.  
Existing personal devices are sufficient for implementation and testing. 
No expensive sensors or enterprise licensing is needed.  
Future SaaS model can remain low-cost for small retailers while still covering hosting costs. 
 
Technical Feasibility
 
SnapStockAI is technically feasible because the required technologies are mature, well-documented, and already used successfully in similar computer-vision and SaaS systems.
Technology Stack Feasibility


Layer
Technology
Why it is feasible
Frontend 
React 19, TypeScript, Vite, Tailwind CSS 
Mature ecosystem; supports responsive web/mobile browser UI 
Backend 
Node.js, Express.js, JWT, Zod, bcrypt 
Proven stack for secure REST APIs and multi-tenant apps 
Database 
PostgreSQL 
Reliable relational DB with strong support for multi-tenant schemas 
AI Service 
Python, FastAPI, YOLOv8, MobileNetV3 / CNN 
Standard tools for object detection and image classification 
Deployment 
Docker & Docker Compose 
Makes local and cloud deployment consistent and reproducible 

 
All selected tools have large communities, tutorials, and documentation, which reduces implementation risk for the team. 
 
AI Model Feasibility
The core AI tasks are:
Object detection and counting using YOLOv8
Freshness classification (Fresh / Medium / Spoiled) using a lightweight CNN such as MobileNetV3
These approaches are technically proven: 
YOLO models are widely used for real-time object detection. 
CNN classifiers are commonly used for fruit freshness / quality grading. 
Public datasets (Fruits-360 and Kaggle fresh/rotten fruit datasets) are available for training and evaluation. 
To keep inference fast on ordinary hardware, the system will: 
Compress images before upload 
Use a lightweight classification model (MobileNetV3) 
Run detection and classification as a separate FastAPI microservice 
This design is realistic for a prototype that must return results within a few seconds. 
 
System Architecture Feasibility
The proposed architecture separates concerns into independent services: 
Web/Mobile Client  →  Express API  →  PostgreSQL 
                                               ↓ 
                   AI Microservice (FastAPI + YOLO + CNN) 
 
This is technically feasible because:
REST APIs provide a clear communication method between services.
Multi-tenant isolation can be enforced using tenant_id / business ID filters.
JWT authentication and bcrypt hashing are standard security practices.
Docker allows each service to run independently, so one failure does not always stop the whole system.
 
Integration Feasibility
The team already has a working project structure with: 
client/ — React frontend  
server/ — Node.js/Express backend  
ai-service/ — Python FastAPI service  
PostgreSQL via Docker Compose  
This means the main technical challenge is not inventing a new architecture but integrating and completing existing components. Integration can be validated step by step: 
Auth and multi-tenant data storage  
Image upload API  
AI inference endpoint  
Inventory update + alerts  
Dashboard visualization  
 
Technical Constraints and Mitigations


Constraint
Mitigation
Limited GPU for training 
Use transfer learning, smaller models, and public pretrained weights 
Variable image quality from phones 
Image preprocessing + data augmentation + confidence scores 
Latency during inference 
Compress images, optimize model size, async API handling 
Multi-tenant data isolation 
Strict tenant filtering, RBAC, JWT auth 
Integration complexity 
Modular microservices + continuous integration testing 

 
Technical Feasibility Conclusion
 
The project is technically feasible because: 
The required stack is modern, open-source, and well supported. 
Similar AI techniques (YOLO + CNN freshness classification) already exist in research and open-source projects. 
The team has access to suitable hardware, datasets, and development tools. 
The system can be built incrementally as a modular SaaS prototype within the project timeline. 
Resource and Time Feasibility
 
Resource Feasibility
 
Software Resources
All required software frameworks and libraries used in the project are open-source or provide free development tiers. Therefore, no additional software licenses are required during development and deployment. 
Hardware and Programming equipment
Laptops with sufficient processing power to develop and test frontend, backend, and AI components are already available. 
 
Mobile devices with cameras will be used for capturing images, which eliminates the need for specialized hardware. 
 
Free development tools such as Visual Studio Code, Postman, Docker Desktop, Git, and pgAdmin are available for implementation and testing. 
Human Resources
The development team consists of members with knowledge in full-stack web development, database management, cloud technologies, and machine learning. Tasks can be distributed according to the expertise of team members for simultaneous development. 
Datasets and Cloud Resources
Publicly available datasets such as Fruit-360 and Kaggle fresh/rotten fruit datasets will be used to train and evaluate the AI models. 
 
Docker containers will provide successful deployment across different environments, and PostgreSQL will provide reliable data storage. 
Therefore, the proposed system has the required resource feasibility. 
Time Feasibility
 
The project will be completed within the allocated timeline of 14 weeks by dividing the workload among all team members according to their areas of expertise. This distribution reduces the overall development time by carrying out development activities concurrently. 
The project schedule includes requirement analysis, system design, implementation, AI model development, integration, testing, documentation, and deployment. The detailed breakdown of the timeline is provided in the project schedule document. 
 
Risk Feasibility
 
The proposed SnapStockAI system offers a smart solution for managing inventory of perishable goods for small retailers. Nevertheless, there are no of possible risks that need to be considered for the successful scaling, security and sustainability of the system. These risks have been identified and mitigated appropriately. 
The main risk here relates to the accuracy of AI predictions. As it was mentioned earlier, the object detection and freshness classification models are being trained using public datasets (Fruit 360, Freshness/Rotten Produce Datasets on Kaggle) [10][11]. There is a possibility that AI models might give wrong predictions because of the low-quality images taken from mobile devices which can be poor lit, taken from different angles and even have overlapping objects. This problem will be overcome by using diverse datasets, applying data augmentation methods (blur, rotation, and uneven lighting) to get different versions of an image and collecting a small set of real shop photos for fine-tuning and testing. 
Data security and privacy are additional risks. SnapStockAI makes use of multi-tenant database management systems to save information related to both business and the user. In case proper tenant isolation fails, other unauthorized users can access the business data of other users. This may cause privacy problems and reduce user trust. JWT authentication, password hashnig using bcrypt, HTTPs and role-based access control along with tenant-based authorization will mitigate the above risks. As a result, a user will have access to only his/her own business information. 
The system relies on AI model performance and cloud services. Any undesirable delay or failure in services like AI and cloud will have an impact on the availability of the system and user experience. These risks will be mitigated using Docker containers for service deploymment, optimizations in the AI models and backups of the database records. 
Another risk that can be identified is of system integration . The frontend, backend, database and the AI service should be able to communicate reliably. Any failure in the process of integration may cause delays in the development and bring unexpected errors. This risk will be reduced by using a modular microservices architecture, creating will defined REST APIs, carrying out integration tests during development and using GitHub for version control.  
Another risk may be that of the instability of internet connectivity. Given that the system relies on cloud-based services, users need a stable internet connection while using the application. Any poor and unstable internet connection may cause the system to respond slowly and disable some of its functions. This risk will be mitigated by incorporating retrying methods, image optimization before uploading and temporarily handling the failure of the internet connection without loss of data. 
Also, there is a possibility of user adoption challenges. Since most of the small-scale retailers currently rely on manual inventory management, they may initially hesitate to adopt an AI-based system. They may have a lack of confidence in using AI models in inventory counting and freshness classification. To encourage adoption, the application will provide a simple and intuitive user interface, require only a smartphone camera to capture images, minimize manual data entry and include clean guidance to help users become familiar with the system. 
 
 
 
 
 
 
In summary, all risks and their impact on the project, likelihood of happening, and overall threat can be shown as follows: 
Risk
Impact
Likelihood
Mitigation Difficulty
Threat Level
AI prediction inaccuracies 
High 
Medium 
Medium 
High 
Data security & privacy issues 
High 
Low 
Medium 
Medium 
AI/cloud service dependency 
High 
Medium 
Medium 
High 
System integration complexity 
Medium 
Medium 
Medium 
Medium 
Unstable internet connectivity 
Medium 
High 
Low 
Medium 
User adoption challenges 
Medium 
Medium 
Low 
Medium 

 
Overall, the identified risks can be effectively managed through careful planning, appropriate software engineering practices, and continuous testing. Therefore, the project is feasible from the risk management perspective. 
 
Social/Legal Feasibility
Social Feasibility
SnapStockAI will generate considerable social value through improved inventory management by small scale vendors and reduction of food wastage through automated stock counting and evaluating food freshness. This is made possible through a combination of a smartphone camera and the use of artificial intelligence, making it possible to eliminate the process of manual inspection that is often time consuming and prone to human errors. By identifying the fruits or vegetables that are spoiling or close to spoiling, it will help to ensure the food quality, reduce financial losses and keep the customers’ trust in the business. Furthermore, reducing unnecessary food waste promotes sustainability since it makes the utilization of agricultural products more efficient. It should be noted that SnapStockAI uses common electronic devices such as smartphones and webcams, which are affordable digital tools for small scale businesses. 
However, despite the advantages of using this, there are also certain issues associated with implementation. Main thing is implementation of the artificial intelligence system could face the problem of the digital divide since not all the vendors would have the required technical infrastructure, suitable equipment and stable network to use this system. Go beyond, users can have doubt about the reliability of AI-generated predictions. The quality of predictions also depends on the diversity of the training dataset. If it can’t represent variety of fruits (st. with different lighting conditions, camera angles) most often result may be biased or inaccurate.  
So, making transparency, allowing vendors to correct AI predictions and continuous performance evaluation is important to maintain their trust. With mentioned benefits, SnapStockAI is a socially feasible solution. 
 
 
 
 
Legal Feasibility
The proposed solution is at very low risk in terms of legal feasibility because it mainly utilizes images of the fruit and vegetables without touching any other private or sensitive information. But to ensure the safety of user accounts and business inventory data, SnapStockAI will use the technology of secure authentication, access control and encryption. In case any image has any identifiable information like a shopping environment, proper data management techniques will be used in accordance with the concerned data protection laws. The system will make use of open-source technologies React, FastAPI, TensoFlow, OpenCV, YOLOv8 and PostgreSQL based on their respective software licensing policies. The public datasets that will be used include Kaggle Fresh and Rotten Fruits and Fruits-360 as per their licensing policies. 
From a regulatory perspective, the use of SnapStockAI is expected to promote compliance with the standards of food safety and quality management. When talking about compliance of SnapStockAI with the regulatory requirements for the food industry in Sri Lanka, it is necessary to mention that the software has to comply with the Food Act No. 26 of 1980 [8] along with all the additional regulations associated with food safety that were issued by the Ministry of Health. Solutions used in other countries have to meet the requirements set by FSSAI [9] in relation to food safety or FDA, accordingly. It is worth noting that the solution offered cannot be considered an inspection tool in terms of food safety. However, vendors can manage their inventory and ensure traceability and quality of their products. Due to some sort of errors in image classification performed by the AI service, vendors will have to conduct manual checks to avoid such issues. 
The system can be implemented within the existing legal framework that makes the solution legally feasible. 
 
 
 
 
 
Considerations
Performance
From the vendor’s perspective, to keep the capture and check workflow feeling responsive, the system needs to return accurate results regarding stock counting and classification of freshness within few seconds of uploading an image. For this, we need to compress images before uploading them into the system, use a lightweight AI model (MobileNetV3) and optimize AI inference pipeline and backend services to minimize the response time. 
 
Accuracy & Reliability
Since the determination of the product freshness via the image is not precise but only approximate. The output of the system will be given in the form of confidence score and will provide an option to correct the incorrect reading for vendors. To ensure the accuracy and reliability of the inventory control system, it is necessary to include appropriate error handling in the system which will help prevent any failure from compromising the accuracy and reliability of the data about the stock and freshness level. 
 
Security
Since the system being a multi-tenant one, the information of one vendor should never be accessible by any other vendor. Thus, there should be protection for user accounts, inventories, and business data of all vendors. Data confidentiality and integrity will be ensured through secure authentication via JWT and bcrypt password hashing. Tenant-based access control ensures that each vendor can access only the data that belongs to their own business. It will be differentiated by a tenant_id in the database.  
 
Availability
Even during periods of high usage such as peak shopping hours (When multiple vendors are trying to capture and analyze stock at same time), the system should be able to continue the functionality reliably while maintaining minimum downtime. There must be appropriate error handling mechanisms for AI services and backend services to overcome this situation. So, the failures in one component should not affect the entire system. Otherwise, the whole system will go down. Maintaining backup mechanisms to prevent data loss and ensure that inventory records remain intact even in the event of service interruptions. 
 
Usability
Since the key target stakeholder will be the small retailer who do not have the expertise to operate the application, the element of usability becomes important since it will guarantee that there will be absolutely no need for any training whatsoever to operate the application due to the camera interface, dashboard and visual feedback that would help the user keep a track of their stock. The photography process needs to be as easy as possible with the help of simple guidelines. It would become much easier for the users if the application came in different languages such as Sinhala, Tamil, and English. However, this is beyond the purview of the current project and hoped to implement it as a future enhancement. 
 
 
 
 
 
 
 
 
 
References
[1] A. Nayak, “Fruit-Detection-Freshness-Analysis,” GitHub. [Online]. Available: https://github.com/anmol2nayak/Fruit-Detection-Freshness-Analysis (Accessed: Jun. 21, 2026). 
[2] E. Yegon, “FreshHarvest,” GitHub. [Online]. Available: https://github.com/erickyegon/FreshHarvest (Accessed: Jun. 21, 2026). 
[3] TensorFlow, “TensorFlow Documentation.” [Online]. Available: https://www.tensorflow.org/ (Accessed: Jun. 29, 2026). 
[4] OpenCV, “OpenCV Documentation.” [Online]. Available: https://opencv.org/ (Accessed: Jun. 30, 2026). 
[5] SAP, “SAP for Retail.” [Online]. Available: https://www.sap.com/industries/retail.html (Accessed: Jul. 1, 2026). 
[6] Block, Inc., “Square for Retail.” [Online]. Available: https://squareup.com/us/en/retail (Accessed: Jul. 1, 2026). 
[7] Afresh Technologies, “AI-Powered Fresh Food Platform.” [Online]. Available: https://www.afresh.com/platform/intelligent-inventory (Accessed: Jul. 1, 2026). 
[8]Food Act (Accessed: Jul. 8, 2026). 
[9] FSSAI Registration Services in Sri Lanka - FssaiWala (Accessed: Jul. 8, 2026). 
[10] Kaggle: https://www.kaggle.com/datasets/moltean/fruits 
[11] Fruit Fresh and Rotten for Classification: https://www.kaggle.com/sriramr/fruits-fresh-and rotten-for-classification 
 
 
 
 
 
 
 
 
 

