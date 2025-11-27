# SaaS Impuestos Backend (Nicaragua) 🇳🇮
# Elaborado por Gabriel Escorcia y Andreus Ramírez
Este repositorio contiene el **Backend** para un sistema SaaS (Software as a Service) diseñado para la gestión de múltiples tiendas, sucursales e inventarios, con un enfoque especializado en la **normativa tributaria de Nicaragua**.

El sistema permite la gestión flexible de impuestos variables (IVA, ISC, Exentos) asignables por producto, garantizando el cumplimiento de la Ley de Concertación Tributaria (LCT).

---

## 🚀 Características Principales

* **Arquitectura Multi-Tenant:** Aislamiento lógico de datos. Cada usuario (dueño) solo puede acceder y gestionar sus propias Tiendas, Sucursales y Productos.
* **Sistema de Impuestos Flexible:**
    * Soporte para IVA (15%, 0% Exento).
    * Soporte para ISC (Impuesto Selectivo al Consumo) y otros gravámenes.
    * Asignación de múltiples impuestos por producto con porcentajes personalizados.
* **Gestión de Inventario:** Control de stock separado por Sucursal.
* **Seguridad Avanzada:**
    * **Validación de Propiedad:** Controladores personalizados (`controllers`) que interceptan las peticiones para asegurar que el usuario sea el dueño del recurso.
    * **Sesión Única:** Implementación de lógica para invalidar sesiones antiguas si se inicia sesión en un nuevo dispositivo.
* **Documentación Automática:** Integración con Swagger (OpenAPI) para documentar todos los endpoints.

## 🛠️ Tecnologías Utilizadas

* **Framework:** [Strapi v4](Headless CMS).
* **Lenguaje:** TypeScript.
* **Base de Datos:** PostgreSQL.
* **Despliegue:** Render.com (En proceso).
* **Documentación:** Swagger UI (`@strapi/plugin-documentation`).

## 📋 Prerrequisitos

Asegúrate de tener instalado lo siguiente en tu entorno local:

* **Node.js:** v18 o v20 (LTS recomendado).
* **npm** o **yarn**.
* **PostgreSQL:** Servidor local o una instancia en la nube corriendo.

## ⚙️ Instalación y Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/GabrielEscorcia27/saas-impuestos-backend.git
    cd saas-impuestos-backend
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz del proyecto (puedes basarte en `.env.example`) y configura tus credenciales:

    ```env
    HOST=0.0.0.0
    PORT=1337
    APP_KEYS=LZapGnhrJ4ZJcGXJW4W36A==,rVQP1KsXAbdBxvxhkbEAjg==,M9tdyKfgr5bE/uzoz2/2yg==,oTyiCGaifWs1yjzNtNEvDw== 
    API_TOKEN_SALT=rnKGPhdo8VuzLRrCISZWXw== 
    ADMIN_JWT_SECRET=z8jEt8xg7seZz03vuYwWpw==
    TRANSFER_TOKEN_SALT=VovGh9KtD19Rh9N0YJSz3w== 
    
    # Base de Datos (Local o Render)
    DATABASE_CLIENT=postgres
    DATABASE_HOST=dpg-d47ph53uibrs73d40iag-a.oregon-postgres.render.com 
    DATABASE_PORT=5432
    DATABASE_NAME=saas_db_jgb3 
    DATABASE_USERNAME=saas_user
    DATABASE_PASSWORD=ykTymP9Lxcud3ANzYUd3uqkYfpii2Vni
    DATABASE_SSL=true
    DATABASE_FILENAME=JWT_SECRET=tAFcR53GzqYrf9c6KLBxcA==
    
    
    # JWT Secret para autenticación de usuarios
    JWT_SECRET=tAFcR53GzqYrf9c6KLBxcA== 
    ```

4.  **Construir el proyecto (Build):**
    Es necesario para compilar TypeScript y registrar los plugins.
    ```bash
    npm run build
    ```

## ▶️ Ejecución

### Entorno de Desarrollo
Para iniciar el servidor con recarga automática (watch mode):
```bash
npm run develop
