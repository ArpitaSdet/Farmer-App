-- PostgreSQL Production Schema for Farmer E-Commerce + Farm Machinery Rental

CREATE TYPE user_role AS ENUM ('FARMER', 'ADMIN', 'MACHINE_OWNER', 'DELIVERY_OPERATOR');
CREATE TYPE order_status AS ENUM ('PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE rental_status AS ENUM ('BOOKED', 'CONFIRMED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE payment_method AS ENUM ('UPI', 'CARD', 'NET_BANKING', 'COD', 'CASH_AFTER_WORK');

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    role user_role DEFAULT 'FARMER',
    name VARCHAR(120),
    preferred_language VARCHAR(10) DEFAULT 'en',
    is_blocked BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Farmer Profiles
CREATE TABLE farmer_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    farm_size_acres NUMERIC(6,2),
    primary_crops TEXT[], -- Array of crops e.g. {'Cotton', 'Tomato'}
    soil_type VARCHAR(50),
    irrigation_source VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Addresses
CREATE TABLE addresses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    farmer_name VARCHAR(120),
    phone_number VARCHAR(15),
    village VARCHAR(120) NOT NULL,
    taluk VARCHAR(100),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Categories
CREATE TABLE categories (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_kn VARCHAR(100),
    name_hi VARCHAR(100),
    name_mr VARCHAR(100),
    name_te VARCHAR(100),
    name_ta VARCHAR(100),
    icon VARCHAR(20),
    image_url TEXT,
    item_count INT DEFAULT 0,
    popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Products
CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    pack_size VARCHAR(80),
    price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2),
    discount_percentage INT DEFAULT 0,
    stock INT DEFAULT 0,
    in_stock BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3,2) DEFAULT 4.5,
    review_count INT DEFAULT 0,
    image_url TEXT,
    description TEXT,
    suitable_crops TEXT[],
    dosage TEXT,
    usage_instructions TEXT,
    delivery_time_info VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Product Images
CREATE TABLE product_images (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE
);

-- 7. Machinery
CREATE TABLE machines (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(80) NOT NULL, -- Tractor, Harvester, Rotavator, etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    horsepower VARCHAR(50),
    engine_specs JSONB,
    owner_id VARCHAR(64) REFERENCES users(id),
    owner_name VARCHAR(120),
    owner_phone VARCHAR(15),
    location VARCHAR(120),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    distance_km NUMERIC(5,2) DEFAULT 5.0,
    hourly_rate NUMERIC(10,2) NOT NULL,
    daily_rate NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2) DEFAULT 1000,
    operator_available BOOLEAN DEFAULT TRUE,
    operator_rate_per_hour NUMERIC(10,2) DEFAULT 150,
    delivery_available BOOLEAN DEFAULT TRUE,
    delivery_rate_per_km NUMERIC(10,2) DEFAULT 25,
    rating NUMERIC(3,2) DEFAULT 4.8,
    review_count INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    description TEXT,
    compatible_attachments TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Machine Availability
CREATE TABLE machine_availability (
    id VARCHAR(64) PRIMARY KEY,
    machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot_start TIME NOT NULL,
    slot_end TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE
);

-- 9. Rental Bookings
CREATE TABLE rental_bookings (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    farmer_name VARCHAR(120),
    farmer_phone VARCHAR(15),
    machine_id VARCHAR(64) REFERENCES machines(id),
    start_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    duration_hours INT DEFAULT 4,
    duration_days INT DEFAULT 0,
    with_operator BOOLEAN DEFAULT TRUE,
    with_delivery BOOLEAN DEFAULT TRUE,
    delivery_address TEXT,
    base_rental NUMERIC(10,2) NOT NULL,
    operator_fee NUMERIC(10,2) DEFAULT 0,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    security_deposit NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method DEFAULT 'CASH_AFTER_WORK',
    payment_status payment_status DEFAULT 'PENDING',
    status rental_status DEFAULT 'CONFIRMED',
    tracking_stages JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Orders
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    farmer_name VARCHAR(120),
    farmer_phone VARCHAR(15),
    items_total NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    delivery_address JSONB NOT NULL,
    payment_method payment_method DEFAULT 'UPI',
    payment_status payment_status DEFAULT 'PENDING',
    status order_status DEFAULT 'PLACED',
    tracking_steps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Order Items
CREATE TABLE order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id),
    product_name VARCHAR(200),
    pack_size VARCHAR(80),
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INT NOT NULL,
    line_total NUMERIC(10,2) NOT NULL
);

-- 12. Payments
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64),
    rental_id VARCHAR(64),
    user_id VARCHAR(64) REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'PENDING',
    transaction_ref VARCHAR(120),
    upi_vpa VARCHAR(80),
    raw_gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Dynamic Banners
CREATE TABLE banners (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT,
    badge VARCHAR(60),
    cta_text VARCHAR(50) NOT NULL,
    target_screen VARCHAR(50) NOT NULL,
    target_category VARCHAR(60),
    theme VARCHAR(50) DEFAULT 'crops',
    bg_color VARCHAR(20) DEFAULT '#1B5E20',
    image_url TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Dynamic Posters
CREATE TABLE posters (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT,
    cta_text VARCHAR(50) NOT NULL,
    target_screen VARCHAR(50) NOT NULL,
    target_category VARCHAR(60),
    image_url TEXT,
    bg_gradient TEXT[],
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. In-App Notifications
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(40) DEFAULT 'GENERAL',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Support Tickets
CREATE TABLE support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    farmer_name VARCHAR(120),
    farmer_phone VARCHAR(15),
    category VARCHAR(60),
    issue_description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_machines_type ON machines(type);
CREATE INDEX idx_machines_district ON machines(district);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_rentals_user ON rental_bookings(user_id);
CREATE INDEX idx_banners_active ON banners(is_active, start_date, end_date);
