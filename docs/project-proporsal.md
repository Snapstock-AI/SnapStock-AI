PROJECT PROPOSAL
 
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
 
 
 
 
    
Overview of the Project
SnapStockAI is a complete software as a service project designed to assist small retailers in managing the stock of their perishable goods like fruits and vegetables. Since most businesses  use manual counting and estimates, that is not only inefficient but also the process is very slow and unreliable due to human errors. This will use the benefits of AI to automate the process of counting and classification of the stock in order to make a decision about the inventory more efficiently.


This system consists of React frontend, Node.js backend, AI microservice written in python and PostgreSQL database. Based on the images that are taken by users by their mobile camera or web camera, the algorithm will perform object detection in order to count and classify the objects in three categories: fresh, medium and spoiled. All the information obtained will be stored in the dashboard of the system.


When we consider the input and output of the system
Input : images of the product, user credentials and data about the business
Output : identify the products and estimate the quantity, classify the freshness, real time       inventory dashboard and alert system for low stock and deteriorating products.

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


References
[1] A. Nayak, “Fruit-Detection-Freshness-Analysis,” GitHub. [Online]. Available: https://github.com/anmol2nayak/Fruit-Detection-Freshness-Analysis (Accessed: Jun. 21, 2026).
[2] E. Yegon, “FreshHarvest,” GitHub. [Online]. Available: https://github.com/erickyegon/FreshHarvest (Accessed: Jun. 21, 2026).
[3] TensorFlow, “TensorFlow Documentation.” [Online]. Available: https://www.tensorflow.org/ (Accessed: Jun. 29, 2026).
[4] OpenCV, “OpenCV Documentation.” [Online]. Available: https://opencv.org/ (Accessed: Jun. 30, 2026).
[5] SAP, “SAP for Retail.” [Online]. Available: https://www.sap.com/industries/retail.html (Accessed: Jul. 1, 2026).
[6] Block, Inc., “Square for Retail.” [Online]. Available: https://squareup.com/us/en/retail (Accessed: Jul. 1, 2026).
[7] Afresh Technologies, “AI-Powered Fresh Food Platform.” [Online]. Available: https://www.afresh.com/platform/intelligent-inventory (Accessed: Jul. 1, 2026).
